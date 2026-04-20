import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

// ── helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function isWeekend(iso: string) {
  const day = new Date(iso).getDay();
  return day === 5 || day === 6; // Fri / Sat
}

// ── GET /api/intelligence/forecast ───────────────────────────────────────────
// Returns 30-day occupancy forecast from confirmed/pending/checked-in bookings.
router.get('/forecast', async (req: AuthRequest, res, next) => {
  try {
    const hotelId = req.hotelId;
    const today   = new Date();
    const end     = addDays(today, 30);

    // All rooms
    let roomsQ = supabase.from('rooms').select('id', { count: 'exact', head: true });
    if (hotelId) roomsQ = roomsQ.eq('hotel_id', hotelId);
    const { count: totalRooms } = await roomsQ;
    const rooms = totalRooms ?? 1;

    // All overlapping reservations in window
    let resQ = supabase
      .from('reservations')
      .select('check_in_date, check_out_date, status')
      .not('status', 'in', '("Cancelled","Checked-out")')
      .lt('check_in_date', isoDate(end))
      .gte('check_out_date', isoDate(today));
    if (hotelId) resQ = resQ.eq('hotel_id', hotelId);
    const { data: reservations } = await resQ;

    const forecast = Array.from({ length: 30 }, (_, i) => {
      const date  = isoDate(addDays(today, i));
      const count = (reservations ?? []).filter(
        (r) => r.check_in_date <= date && r.check_out_date > date,
      ).length;
      return {
        date,
        occupied:      count,
        totalRooms:    rooms,
        occupancyRate: Math.min(100, Math.round((count / rooms) * 100)),
        isWeekend:     isWeekend(date),
      };
    });

    res.json(forecast);
  } catch (err) { next(err); }
});

// ── GET /api/intelligence/pricing ────────────────────────────────────────────
// Rule-based dynamic rate recommendations per room type.
router.get('/pricing', async (req: AuthRequest, res, next) => {
  try {
    const hotelId = req.hotelId;
    const today   = new Date();
    const in7     = isoDate(addDays(today, 7));
    const todayIso = isoDate(today);

    // All rooms
    let roomsQ = supabase.from('rooms').select('id, room_type, base_rate, hotel_id');
    if (hotelId) roomsQ = roomsQ.eq('hotel_id', hotelId);
    const { data: rooms } = await roomsQ;

    // Reservations overlapping next 7 days
    let resQ = supabase
      .from('reservations')
      .select('room_id, check_in_date, check_out_date')
      .not('status', 'in', '("Cancelled","Checked-out")')
      .lt('check_in_date', in7)
      .gte('check_out_date', todayIso);
    if (hotelId) resQ = resQ.eq('hotel_id', hotelId);
    const { data: upcoming } = await resQ;

    // Group by room type
    const types: Record<string, { count: number; booked: Set<string>; baseRate: number }> = {};
    (rooms ?? []).forEach((r: any) => {
      if (!types[r.room_type]) types[r.room_type] = { count: 0, booked: new Set(), baseRate: Number(r.base_rate) };
      types[r.room_type].count++;
    });

    // Count booked room-nights (simplified: unique rooms booked at least once in window)
    (upcoming ?? []).forEach((res: any) => {
      const room = (rooms ?? []).find((r: any) => r.id === res.room_id);
      if (room) types[room.room_type]?.booked.add(res.room_id);
    });

    const recommendations = Object.entries(types).map(([type, { count, booked, baseRate }]) => {
      const occupancy = count > 0 ? Math.round((booked.size / count) * 100) : 0;
      let multiplier = 1.0;
      let signal: 'surge' | 'high' | 'normal' | 'low' | 'discount' = 'normal';
      let rationale = '';

      if (occupancy >= 85) {
        multiplier = 1.20; signal = 'surge';
        rationale = `${occupancy}% booked in next 7 days — strong demand, raise rates.`;
      } else if (occupancy >= 70) {
        multiplier = 1.10; signal = 'high';
        rationale = `${occupancy}% booked — healthy demand, modest uplift recommended.`;
      } else if (occupancy >= 50) {
        multiplier = 1.0; signal = 'normal';
        rationale = `${occupancy}% booked — demand is stable, keep current rates.`;
      } else if (occupancy >= 30) {
        multiplier = 0.92; signal = 'low';
        rationale = `${occupancy}% booked — soft demand, a small discount may drive bookings.`;
      } else {
        multiplier = 0.85; signal = 'discount';
        rationale = `Only ${occupancy}% booked — consider promotional pricing to fill rooms.`;
      }

      const recommended = Math.round(baseRate * multiplier);
      const change      = Math.round((multiplier - 1) * 100);

      return { type, baseRate, recommended, change, occupancy7d: occupancy, signal, rationale };
    });

    res.json(recommendations);
  } catch (err) { next(err); }
});

// ── POST /api/intelligence/insights ──────────────────────────────────────────
// Bundles hotel KPIs and sends to Gemini for AI narrative insights.
router.post('/insights', async (req: AuthRequest, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

    const hotelId  = req.hotelId;
    const today    = new Date();
    const ago30    = new Date(today); ago30.setDate(ago30.getDate() - 30);
    const in7      = new Date(today); in7.setDate(in7.getDate() + 7);

    // ── gather KPIs ──────────────────────────────────────────
    const buildQ = <T>(table: string, q: any): Promise<T[]> =>
      q.then(({ data }: any) => data ?? []);

    let recentResQ = supabase
      .from('reservations')
      .select('status, channel, total_amount, check_in_date, check_out_date, created_at')
      .gte('created_at', ago30.toISOString())
      .not('status', 'eq', 'Cancelled');
    if (hotelId) recentResQ = recentResQ.eq('hotel_id', hotelId);
    const recent: any[] = await buildQ('reservations', recentResQ);

    let upcomingQ = supabase
      .from('reservations')
      .select('status, check_in_date, check_out_date')
      .not('status', 'in', '("Cancelled","Checked-out")')
      .lt('check_in_date', isoDate(in7))
      .gte('check_out_date', isoDate(today));
    if (hotelId) upcomingQ = upcomingQ.eq('hotel_id', hotelId);
    const upcoming: any[] = await buildQ('reservations', upcomingQ);

    let roomsQ = supabase.from('rooms').select('id, status, room_type');
    if (hotelId) roomsQ = roomsQ.eq('hotel_id', hotelId);
    const allRooms: any[] = await buildQ('rooms', roomsQ);

    let tasksQ = supabase.from('housekeeping_tasks').select('status').eq('status', 'Open');
    if (hotelId) tasksQ = tasksQ.eq('hotel_id', hotelId);
    const openTasks: any[] = await buildQ('housekeeping_tasks', tasksQ);

    // ── build summary ──────────────────────────────────────
    const totalRevenue  = recent.reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
    const totalBookings = recent.length;
    const channels      = recent.reduce((acc: Record<string, number>, r: any) => {
      acc[r.channel] = (acc[r.channel] ?? 0) + 1; return acc;
    }, {});
    const checkedIn   = allRooms.filter((r: any) => r.status === 'Occupied').length;
    const occupancy   = allRooms.length ? Math.round((checkedIn / allRooms.length) * 100) : 0;
    const arriving7d  = upcoming.filter((r: any) => r.status === 'Confirmed').length;
    const adr         = totalBookings ? Math.round(totalRevenue / totalBookings) : 0;
    const openTaskCnt = openTasks.length;

    const summary = {
      period:       'last 30 days',
      totalRevenue: `$${totalRevenue.toLocaleString()}`,
      totalBookings,
      adr:          `$${adr}`,
      occupancy:    `${occupancy}%`,
      topChannels:  Object.entries(channels).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([ch, n]) => `${ch}: ${n}`).join(', '),
      arrivingNext7Days: arriving7d,
      openHousekeepingTasks: openTaskCnt,
      totalRooms:   allRooms.length,
    };

    const prompt = `You are an expert hospitality revenue manager and operations consultant.
A hotel has shared the following KPI snapshot with you:

${JSON.stringify(summary, null, 2)}

Based on this data, provide exactly 4 concise, actionable insights in JSON format:
{
  "insights": [
    { "category": "Revenue", "title": "...", "body": "...", "priority": "high|medium|low" },
    { "category": "Operations", "title": "...", "body": "...", "priority": "high|medium|low" },
    { "category": "Guest Experience", "title": "...", "body": "...", "priority": "high|medium|low" },
    { "category": "Action Today", "title": "...", "body": "...", "priority": "high|medium|low" }
  ],
  "summary": "One sentence overall assessment."
}

Be specific, use the actual numbers, and focus on what the hotel can act on RIGHT NOW. Keep each body under 60 words.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: `Gemini error: ${errText}` });
    }

    const geminiData = await geminiRes.json() as any;
    const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let parsed: any;
    try { parsed = JSON.parse(rawText); }
    catch { return res.status(502).json({ error: 'Gemini returned invalid JSON', raw: rawText }); }

    res.json({ ...parsed, kpis: summary, generatedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

// ── POST /api/intelligence/chat ──────────────────────────────────────────────
// Servv IQ — context-aware hotel assistant powered by Gemini.
router.post('/chat', async (req: AuthRequest, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

    const { message, history = [] } = req.body as {
      message: string;
      history: { role: 'user' | 'model'; text: string }[];
    };

    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

    const hotelId  = req.hotelId;
    const today    = new Date();
    const ago7     = new Date(today); ago7.setDate(ago7.getDate() - 7);
    const in7      = new Date(today); in7.setDate(in7.getDate() + 7);
    const todayIso = isoDate(today);

    // ── fetch live hotel context ─────────────────────────────
    const ifHotel = (q: any) => hotelId ? q.eq('hotel_id', hotelId) : q;

    const [{ data: rooms }, { data: recentRes }, { data: upcomingRes }, { data: openTasks }, { data: staff }] =
      await Promise.all([
        ifHotel(supabase.from('rooms').select('id, room_type, base_rate, status')),
        ifHotel(supabase.from('reservations')
          .select('status, channel, total_amount, check_in_date, check_out_date')
          .gte('created_at', ago7.toISOString())
          .not('status', 'eq', 'Cancelled')),
        ifHotel(supabase.from('reservations')
          .select('status, check_in_date, guest_id')
          .not('status', 'in', '("Cancelled","Checked-out")')
          .lt('check_in_date', isoDate(in7))
          .gte('check_out_date', todayIso)),
        ifHotel(supabase.from('housekeeping_tasks').select('status, priority').eq('status', 'Open')),
        ifHotel(supabase.from('hotel_users').select('role, is_active').eq('is_active', true)),
      ]);

    const totalRooms    = (rooms ?? []).length;
    const occupied      = (rooms ?? []).filter((r: any) => r.status === 'Occupied').length;
    const occupancy     = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;
    const revenue7d     = (recentRes ?? []).reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
    const arrivals7d    = (upcomingRes ?? []).filter((r: any) => r.status === 'Confirmed').length;
    const channels      = (recentRes ?? []).reduce((acc: Record<string, number>, r: any) => {
      acc[r.channel] = (acc[r.channel] ?? 0) + 1; return acc;
    }, {});
    const urgentTasks   = (openTasks ?? []).filter((t: any) => t.priority === 'Urgent').length;
    const activeStaff   = (staff ?? []).length;

    const context = `
You are Servv IQ, an expert AI hotel management assistant embedded inside Servv HMS.
You are speaking with the hotel manager. Be concise, professional, and specific.
Always base your answers on the live hotel data below. Use $ for currency, % for rates.
Never make up data — if something isn't in the context, say so.

LIVE HOTEL SNAPSHOT (as of ${todayIso}):
- Rooms: ${totalRooms} total, ${occupied} occupied, ${occupancy}% occupancy
- Revenue last 7 days: $${revenue7d.toLocaleString()}
- Confirmed arrivals next 7 days: ${arrivals7d}
- Open housekeeping tasks: ${(openTasks ?? []).length} (${urgentTasks} urgent)
- Active staff: ${activeStaff}
- Booking channels (last 7 days): ${Object.entries(channels).map(([ch, n]) => `${ch}: ${n}`).join(', ') || 'No bookings yet'}
- Today: ${todayIso}
`.trim();

    // ── build Gemini contents array ──────────────────────────
    const contents = [
      // Inject context as first user turn + model ack
      { role: 'user',  parts: [{ text: context }] },
      { role: 'model', parts: [{ text: 'Understood. I have your hotel data loaded and I\'m ready to help.' }] },
      // Prior conversation history
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      // Current message
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(502).json({ error: `Gemini error: ${errText}` });
    }

    const data    = await geminiRes.json() as any;
    const reply   = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.';

    res.json({ reply });
  } catch (err) { next(err); }
});

export default router;
