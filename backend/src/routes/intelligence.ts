import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

function getServvInsightsApiKey() {
  return process.env.SERVV_INSIGHTS_API_KEY ?? process.env.GEMINI_API_KEY;
}

function isTruthyEnv(value: string | undefined) {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function isExternalMarketQuestion(message: string) {
  const q = message.toLowerCase();
  const externalSignals = [
    'rwanda',
    'market',
    'industry',
    'country',
    'city',
    'tourism',
    'season',
    'high season',
    'low season',
    'this year',
    'next year',
    'trend',
    'macro',
    'forecast',
    'google',
    'search',
    'competitor',
    'events',
    'conference',
    'festival',
    'weather',
  ];

  return externalSignals.some((signal) => q.includes(signal));
}

interface SnapshotSummary {
  totalRevenue: string;
  totalBookings: number;
  adr: string;
  occupancy: string;
  topChannels: string;
  arrivingNext7Days: number;
  openHousekeepingTasks: number;
  totalRooms: number;
}

function buildRuleBasedInsights(summary: SnapshotSummary) {
  const occupancyValue = Number.parseInt(summary.occupancy.replace('%', ''), 10) || 0;

  const insights = [
    {
      category: 'Revenue',
      title: 'Protect rate on high-need nights',
      body: `ADR is ${summary.adr} with ${summary.totalBookings} bookings in the period. Keep rates firm on high-demand nights and reserve only targeted discounts for low pickup days.`,
      priority: occupancyValue >= 70 ? 'high' : 'medium',
    },
    {
      category: 'Operations',
      title: 'Balance arrivals and room readiness',
      body: `${summary.arrivingNext7Days} confirmed arrivals are coming in the next 7 days. Pre-assign rooms and align housekeeping sequences to reduce front-desk waiting during peak check-in windows.`,
      priority: summary.arrivingNext7Days >= 8 ? 'high' : 'medium',
    },
    {
      category: 'Guest Experience',
      title: 'Use channel source for personalization',
      body: `Top channels are ${summary.topChannels || 'not yet distributed'}. Tailor welcome messages and upsell offers by source to increase conversion and post-stay satisfaction.`,
      priority: 'medium',
    },
    {
      category: 'Action Today',
      title: 'Clear operational blockers first',
      body: `${summary.openHousekeepingTasks} open housekeeping tasks are pending. Close urgent tasks before arrival peaks to protect check-in speed and guest first impressions.`,
      priority: summary.openHousekeepingTasks > 0 ? 'high' : 'low',
    },
  ] as const;

  return {
    insights,
    summary: `Current occupancy is ${summary.occupancy} across ${summary.totalRooms} rooms, with ${summary.arrivingNext7Days} arrivals expected next week.`,
  };
}

function buildServvIqFallbackReply(
  message: string,
  snapshot: {
    occupancy: number;
    revenue7d: number;
    arrivals7d: number;
    urgentTasks: number;
    openTasks: number;
    channels: Record<string, number>;
  },
) {
  const q = message.toLowerCase();
  const topChannel = Object.entries(snapshot.channels).sort((a, b) => b[1] - a[1])[0];

  if (q.includes('occupancy')) {
    return `Current occupancy is ${snapshot.occupancy}%. Prioritize premium room upsells if occupancy is above 70%, and run targeted demand stimulation if below 50%.`;
  }
  if (q.includes('revenue') || q.includes('adr') || q.includes('money')) {
    return `Revenue in the last 7 days is $${snapshot.revenue7d.toLocaleString()}. Focus today on add-ons and premium upgrades to lift ADR without broad discounting.`;
  }
  if (q.includes('channel')) {
    return topChannel
      ? `Top booking channel in recent activity is ${topChannel[0]} (${topChannel[1]} bookings). Consider inventory protection and parity checks there first.`
      : 'No strong channel pattern yet. Keep direct channel offers visible and monitor conversion daily.';
  }
  if (q.includes('housekeeping') || q.includes('task')) {
    return `There are ${snapshot.openTasks} open housekeeping tasks (${snapshot.urgentTasks} urgent). Clear urgent rooms first, then sequence by nearest arrivals.`;
  }
  if (q.includes('focus') || q.includes('today') || q.includes('priority')) {
    return `Today's priorities: 1) prepare for ${snapshot.arrivals7d} upcoming arrivals, 2) resolve ${snapshot.urgentTasks} urgent housekeeping tasks, 3) protect pricing where occupancy is strongest.`;
  }

  return `Here is your current snapshot: occupancy ${snapshot.occupancy}%, revenue last 7 days $${snapshot.revenue7d.toLocaleString()}, arrivals next 7 days ${snapshot.arrivals7d}, urgent housekeeping tasks ${snapshot.urgentTasks}. Ask about occupancy, pricing, channels, or operations for specific guidance.`;
}

function buildExternalQuestionFallback() {
  return 'I can answer this with web-grounded market context when Servv Insights cloud mode is enabled. Ask your admin to set SERVV_INSIGHTS_API_KEY and SERVV_IQ_WEB_SEARCH=true in backend environment variables, then try again.';
}

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
// Bundles hotel KPIs and sends to Servv Insights provider when configured.
router.post('/insights', async (req: AuthRequest, res, next) => {
  try {
    const apiKey = getServvInsightsApiKey();

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

    if (!apiKey) {
      const fallback = buildRuleBasedInsights(summary);
      return res.json({ ...fallback, kpis: summary, generatedAt: new Date().toISOString(), provider: 'servv-rules' });
    }

    const modelRes = await fetch(
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

    if (!modelRes.ok) {
      const fallback = buildRuleBasedInsights(summary);
      return res.json({ ...fallback, kpis: summary, generatedAt: new Date().toISOString(), provider: 'servv-rules' });
    }

    const modelData = await modelRes.json() as any;
    const rawText   = modelData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const fallback = buildRuleBasedInsights(summary);
      return res.json({ ...fallback, kpis: summary, generatedAt: new Date().toISOString(), provider: 'servv-rules' });
    }

    res.json({ ...parsed, kpis: summary, generatedAt: new Date().toISOString(), provider: 'servv-cloud' });
  } catch (err) { next(err); }
});

// ── POST /api/intelligence/chat ──────────────────────────────────────────────
// Servv IQ — context-aware hotel assistant powered by Servv Insights provider.
router.post('/chat', async (req: AuthRequest, res, next) => {
  try {
    const apiKey = getServvInsightsApiKey();
    const webSearchEnabled = isTruthyEnv(process.env.SERVV_IQ_WEB_SEARCH);

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
  Primary mode: base answers on the live hotel data below. Use $ for currency, % for rates.
  For external market questions (seasonality, destination trends, tourism demand, events), use grounded web search when available.
  When using external context, clearly label it as External Market Context and connect it to concrete hotel actions.
  Never make up data. If a source or data point is unavailable, say so.

LIVE HOTEL SNAPSHOT (as of ${todayIso}):
- Rooms: ${totalRooms} total, ${occupied} occupied, ${occupancy}% occupancy
- Revenue last 7 days: $${revenue7d.toLocaleString()}
- Confirmed arrivals next 7 days: ${arrivals7d}
- Open housekeeping tasks: ${(openTasks ?? []).length} (${urgentTasks} urgent)
- Active staff: ${activeStaff}
- Booking channels (last 7 days): ${Object.entries(channels).map(([ch, n]) => `${ch}: ${n}`).join(', ') || 'No bookings yet'}
- Today: ${todayIso}
`.trim();

  const asksExternalMarketContext = isExternalMarketQuestion(message);
  const shouldUseWebSearch = Boolean(apiKey) && webSearchEnabled && asksExternalMarketContext;

    const fallbackReply = buildServvIqFallbackReply(message, {
      occupancy,
      revenue7d,
      arrivals7d,
      urgentTasks,
      openTasks: (openTasks ?? []).length,
      channels,
    });

    if (!apiKey && asksExternalMarketContext) {
      return res.json({ reply: buildExternalQuestionFallback(), provider: 'servv-rules' });
    }

    if (!apiKey) {
      return res.json({ reply: fallbackReply, provider: 'servv-rules' });
    }

    // ── build provider contents array ──────────────────────────
    const contents = [
      // Inject context as first user turn + model ack
      { role: 'user',  parts: [{ text: context }] },
      { role: 'model', parts: [{ text: 'Understood. I have your hotel data loaded and I\'m ready to help.' }] },
      // Prior conversation history
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      // Current message
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
    };

    if (shouldUseWebSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    const modelRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    if (!modelRes.ok) {
      if (asksExternalMarketContext) {
        return res.json({ reply: buildExternalQuestionFallback(), provider: 'servv-rules' });
      }
      return res.json({ reply: fallbackReply, provider: 'servv-rules' });
    }

    const data    = await modelRes.json() as any;
    let reply     = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.';
    const grounded = Boolean(data?.candidates?.[0]?.groundingMetadata);

    if (asksExternalMarketContext && !grounded && shouldUseWebSearch) {
      reply += '\n\nNote: grounded web sources were unavailable for this answer. Treat this as directional and validate with recent market reports.';
    }

    res.json({ reply, provider: shouldUseWebSearch ? 'servv-cloud+web' : 'servv-cloud' });
  } catch (err) { next(err); }
});

export default router;
