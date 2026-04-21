import { supabase } from '../lib/supabase';
import { sendText } from './whatsapp';
import { getConvState, setConvState, clearConvState, BookingData } from './conversationState';
import { sendBookingTicketEmail } from './email';
import { buildTicketText, TicketData } from './ticket';

const HOTEL      = process.env.HOTEL_NAME   ?? 'SERVV Hotel';
const HOTEL_ID   = process.env.HOTEL_ID     ?? '';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const FRONTEND   = process.env.FRONTEND_URL ?? 'https://hms.servv.co';

// ── Helpers ───────────────────────────────────────────────────────────────────

function digits(phone: string) {
  return phone.replace(/\D/g, '');
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000);
}

const CANCEL_RE = /^(cancel|stop|quit|restart|start over|reset|menu|back)$/i;

// ── Gemini date extractor ─────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseLocalDate(raw: string): string | null {
  const s     = raw.trim().toLowerCase().replace(/[,\.]/g, '');
  const today = new Date();
  const todayY = today.getFullYear();

  // "today"
  if (/^today$/.test(s)) return today.toISOString().slice(0, 10);

  // "tomorrow"
  if (/^tomorrow$/.test(s)) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // "next monday/tuesday/..."
  const dowMatch = s.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (dowMatch) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const target = days.indexOf(dowMatch[1]);
    const d = new Date(today);
    d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
    return d.toISOString().slice(0, 10);
  }

  // ISO: 2026-04-25
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM or DD-MM
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dmy) {
    const y = dmy[3] ? (dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : String(todayY);
    return `${y}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  }

  // "21 april" / "21 april 2026" / "21st april" / "21st of april 2026"
  const dmyText = s.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)(?:\s+(\d{2,4}))?$/);
  if (dmyText) {
    const mon = MONTHS[dmyText[2]];
    if (mon) {
      const y = dmyText[3] ? (dmyText[3].length === 2 ? `20${dmyText[3]}` : dmyText[3]) : String(todayY);
      return `${y}-${String(mon).padStart(2,'0')}-${dmyText[1].padStart(2,'0')}`;
    }
  }

  // "april 21" / "april 21 2026" / "april 21st"
  const mdyText = s.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{2,4}))?$/);
  if (mdyText) {
    const mon = MONTHS[mdyText[1]];
    if (mon) {
      const y = mdyText[3] ? (mdyText[3].length === 2 ? `20${mdyText[3]}` : mdyText[3]) : String(todayY);
      return `${y}-${String(mon).padStart(2,'0')}-${mdyText[2].padStart(2,'0')}`;
    }
  }

  // "25 apr 26" short year
  const shortYear = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{2})$/);
  if (shortYear) {
    const mon = MONTHS[shortYear[2]];
    if (mon) return `20${shortYear[3]}-${String(mon).padStart(2,'0')}-${shortYear[1].padStart(2,'0')}`;
  }

  return null;
}

async function parseDate(raw: string): Promise<string | null> {
  // Try local parser first — handles most natural language without AI
  const local = parseLocalDate(raw);
  if (local) return local;

  // Fall back to Gemini for anything unusual
  if (!GEMINI_KEY) return null;

  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Today is ${today}. Extract the date from: "${raw}". Reply ONLY with YYYY-MM-DD or the word invalid.` }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 20 },
        }),
      },
    );
    const data = await res.json() as any;
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text) && text >= today) return text;
  } catch { /* ignore */ }

  return null;
}

// ── Detect booking intent ─────────────────────────────────────────────────────

async function isBookingIntent(text: string): Promise<boolean> {
  const lower = text.toLowerCase();
  const keywords = /book|reserv|room|stay|availab|check.?in|night|accommodation|lodge/i;
  if (keywords.test(lower)) return true;

  // Greetings that could be booking inquiries — ask Gemini
  if (GEMINI_KEY && /^(hi|hello|hi there|hey|good morning|good afternoon|good evening|howdy|hola)[\s!.?]*$/i.test(lower)) {
    return true; // Always offer booking on a greeting
  }
  return false;
}

// ── Available rooms ───────────────────────────────────────────────────────────

async function getAvailableRooms(checkIn: string, checkOut: string) {
  // Try with hotel_id filter first; fall back to all rooms if none found
  let roomsQuery = supabase
    .from('rooms')
    .select('id, room_number, room_type, base_rate, max_occupancy, status')
    .neq('status', 'Maintenance')
    .order('base_rate');

  if (HOTEL_ID) roomsQuery = (roomsQuery as any).eq('hotel_id', HOTEL_ID);

  let { data: rooms } = await roomsQuery;

  // Fallback: rooms without hotel_id set (legacy data)
  if ((!rooms || rooms.length === 0) && HOTEL_ID) {
    const { data: fallback } = await supabase
      .from('rooms')
      .select('id, room_number, room_type, base_rate, max_occupancy, status')
      .neq('status', 'Maintenance')
      .order('base_rate');
    rooms = fallback;
  }

  const conflictsQuery = supabase
    .from('reservations')
    .select('room_id')
    .not('status', 'in', '("Cancelled","Checked-out")')
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn);

  const { data: conflicts } = HOTEL_ID
    ? await (conflictsQuery as any).eq('hotel_id', HOTEL_ID)
    : await conflictsQuery;

  const takenIds = new Set((conflicts ?? []).map((r: any) => r.room_id));
  const n = nights(checkIn, checkOut);

  return (rooms ?? [])
    .filter((r: any) => !takenIds.has(r.id))
    .map((r: any) => ({
      id:         r.id,
      roomNumber: r.room_number,
      roomType:   r.room_type,
      baseRate:   Number(r.base_rate),
      totalPrice: Math.round(Number(r.base_rate) * n),
    }));
}

// ── Booking flow steps ────────────────────────────────────────────────────────

async function startBooking(from: string) {
  setConvState(from, { mode: 'booking_check_in', booking: {} });
  await sendText(from,
    `🏨 *${HOTEL} — Book a Room*\n\n` +
    `I'll help you reserve a room in just a few steps!\n\n` +
    `📅 What date would you like to *check in*?\n` +
    `_e.g. 25 Apr, 2026-04-25, or tomorrow_\n\n` +
    `_(Reply *CANCEL* at any time to start over)_`,
  );
}

async function handleCheckIn(from: string, text: string) {
  if (CANCEL_RE.test(text)) { clearConvState(from); await sendGreeting(from); return; }

  const date = await parseDate(text);
  if (!date) {
    await sendText(from,
      `❌ I couldn't understand that date. Please try again.\n\n` +
      `_e.g. *25 Apr*, *2026-04-25*, or *tomorrow*_`,
    );
    return;
  }

  setConvState(from, { mode: 'booking_check_out', booking: { checkIn: date } });
  await sendText(from,
    `✅ Check-in: *${fmt(date)}*\n\n` +
    `📅 Now, what date will you *check out*?`,
  );
}

async function handleCheckOut(from: string, text: string, booking: BookingData) {
  if (CANCEL_RE.test(text)) { clearConvState(from); await sendGreeting(from); return; }

  const date = await parseDate(text);
  if (!date) {
    await sendText(from, `❌ Couldn't read that date. Try _e.g. *27 Apr*_ or *2026-04-27*`);
    return;
  }
  if (date <= booking.checkIn!) {
    await sendText(from, `❌ Check-out must be *after* check-in (${fmt(booking.checkIn!)}). Please try again.`);
    return;
  }

  setConvState(from, { mode: 'booking_guests', booking: { ...booking, checkOut: date } });
  await sendText(from,
    `✅ Check-out: *${fmt(date)}*\n` +
    `🌙 That's *${nights(booking.checkIn!, date)} night${nights(booking.checkIn!, date) !== 1 ? 's' : ''}*\n\n` +
    `👥 How many *adults* will be staying?`,
  );
}

async function handleGuests(from: string, text: string, booking: BookingData) {
  if (CANCEL_RE.test(text)) { clearConvState(from); await sendGreeting(from); return; }

  // Accept "2 adults", "just me", "me and my wife", "2 people", "family of 4", etc.
  const lower = text.trim().toLowerCase();
  let n = parseInt(lower, 10);
  if (isNaN(n)) {
    if (/\bjust\s*(me|myself|1|one)\b|solo|alone/.test(lower))    n = 1;
    else if (/\b(me\s+and|couple|two|2)\b/.test(lower))           n = 2;
    else if (/\b(three|3)\b/.test(lower))                          n = 3;
    else if (/\b(four|4|family)\b/.test(lower))                    n = 4;
    else if (/\b(five|5)\b/.test(lower))                           n = 5;
    else {
      const numWord = lower.match(/\b(\d+)\s*(adult|guest|person|people|pax)/)?.[1];
      if (numWord) n = parseInt(numWord, 10);
    }
  }
  if (!n || n < 1 || n > 20) {
    await sendText(from, `❌ How many adults will be staying? Please reply with a number.\n_e.g. *2*_`);
    return;
  }

  const rooms = await getAvailableRooms(booking.checkIn!, booking.checkOut!);
  if (rooms.length === 0) {
    clearConvState(from);
    await sendText(from,
      `😔 Sorry, we have *no available rooms* for those dates.\n\n` +
      `Please try different dates or contact reception for assistance.\n\n` +
      `Reply *BOOK* to try again.`,
    );
    return;
  }

  const NUMS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
  const roomList = rooms.map((r, i) =>
    `${NUMS[i] ?? `${i+1}.`} *${r.roomType}* — $${r.baseRate}/night → *$${r.totalPrice} total*`
  ).join('\n');

  setConvState(from, { mode: 'booking_pick_room', booking: { ...booking, adults: n, rooms } });
  await sendText(from,
    `🛏 *Available rooms for ${fmt(booking.checkIn!)} → ${fmt(booking.checkOut!)}*\n` +
    `_(${nights(booking.checkIn!, booking.checkOut!)} nights · ${n} adult${n > 1 ? 's' : ''})_\n\n` +
    `${roomList}\n\n` +
    `Reply with the *number* of your choice.`,
  );
}

async function handlePickRoom(from: string, text: string, booking: BookingData) {
  if (CANCEL_RE.test(text)) { clearConvState(from); await sendGreeting(from); return; }

  const rooms  = booking.rooms ?? [];
  const lower  = text.trim().toLowerCase();

  // Accept: "1", "option 1", "first", "the suite", partial room type name
  let choice = parseInt(lower, 10);
  if (isNaN(choice)) {
    if (/\b(first|one|1st)\b/.test(lower))   choice = 1;
    else if (/\b(second|two|2nd)\b/.test(lower)) choice = 2;
    else if (/\b(third|three|3rd)\b/.test(lower)) choice = 3;
    else {
      // Try matching partial room type name
      const idx = rooms.findIndex((r) => r.roomType.toLowerCase().includes(lower) || lower.includes(r.roomType.toLowerCase()));
      if (idx !== -1) choice = idx + 1;
    }
  }

  const room = rooms[choice - 1];
  if (!room) {
    await sendText(from, `❌ Please reply with a number between *1* and *${rooms.length}*.\n_e.g. reply *1* for the first option_`);
    return;
  }

  setConvState(from, {
    mode: 'booking_name',
    booking: { ...booking, selectedRoom: room },
  });
  await sendText(from,
    `✅ *${room.roomType}* selected — $${room.totalPrice} total\n\n` +
    `👤 What is your *full name*?`,
  );
}

async function handleName(from: string, text: string, booking: BookingData) {
  if (CANCEL_RE.test(text)) { clearConvState(from); await sendGreeting(from); return; }

  const name = text.trim();
  if (name.split(' ').length < 2) {
    await sendText(from, `Please provide your *full name* (first and last).\n_e.g. Jean Baptiste_`);
    return;
  }

  setConvState(from, { mode: 'booking_email', booking: { ...booking, name } });
  await sendText(from,
    `✅ Name: *${name}*\n\n` +
    `📧 What is your *email address*?\n_Your confirmation will be sent here._`,
  );
}

async function handleEmail(from: string, text: string, booking: BookingData) {
  if (CANCEL_RE.test(text)) { clearConvState(from); await sendGreeting(from); return; }

  const email = text.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await sendText(from, `❌ That doesn't look like a valid email. Please try again.\n_e.g. jean@example.com_`);
    return;
  }

  const updatedBooking = { ...booking, email };
  const { selectedRoom, checkIn, checkOut, adults, name } = updatedBooking;
  const n = nights(checkIn!, checkOut!);

  setConvState(from, { mode: 'booking_confirm', booking: { ...booking, email } });
  await sendText(from,
    `📋 *Booking Summary*\n\n` +
    `🏨 Hotel: *${HOTEL}*\n` +
    `🛏 Room: *${selectedRoom!.roomType}*\n` +
    `📅 Check-in:  *${fmt(checkIn!)}*\n` +
    `📅 Check-out: *${fmt(checkOut!)}*\n` +
    `🌙 Duration: *${n} night${n !== 1 ? 's' : ''}*\n` +
    `👥 Adults: *${adults}*\n` +
    `👤 Name: *${name}*\n` +
    `📧 Email: *${email}*\n` +
    `💵 Total: *$${selectedRoom!.totalPrice}*\n\n` +
    `Reply *YES* to confirm, or *CANCEL* to start over.`,
  );
}

async function handleConfirm(from: string, text: string, booking: BookingData) {
  if (CANCEL_RE.test(text) || /^no$/i.test(text)) {
    clearConvState(from);
    await sendText(from, `No problem! Reply *BOOK* whenever you're ready to try again. 😊`);
    return;
  }

  const confirmRe = /^(yes|yeah|yep|yup|confirm|ok|okay|sure|absolutely|correct|go ahead|proceed|book it|do it)$/i;
  if (!confirmRe.test(text.trim())) {
    await sendText(from, `Reply *YES* to confirm your booking, or *CANCEL* to start over.`);
    return;
  }

  const { selectedRoom, checkIn, checkOut, adults, name, email } = booking;
  const nameParts = (name ?? '').trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ') || '—';
  const phone     = from.startsWith('+') ? from : `+${from}`;

  try {
    // Upsert guest
    let guestId: string;
    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .eq('hotel_id', HOTEL_ID)
      .eq('email', email!)
      .maybeSingle();

    if (existing) {
      guestId = existing.id;
    } else {
      const { data: newGuest, error: gErr } = await supabase
        .from('guests')
        .insert({ hotel_id: HOTEL_ID, first_name: firstName, last_name: lastName, email: email!, phone })
        .select('id')
        .single();
      if (gErr || !newGuest) throw new Error('Failed to create guest record');
      guestId = newGuest.id;
    }

    // Re-check availability (race condition guard)
    const fresh = await getAvailableRooms(checkIn!, checkOut!);
    const stillAvail = fresh.find((r) => r.id === selectedRoom!.id);
    if (!stillAvail) {
      clearConvState(from);
      await sendText(from,
        `😔 Sorry, that room was just taken! Please reply *BOOK* to see updated availability.`,
      );
      return;
    }

    // Create reservation
    const { data: res, error: rErr } = await supabase
      .from('reservations')
      .insert({
        hotel_id:       HOTEL_ID,
        guest_id:       guestId,
        room_id:        selectedRoom!.id,
        rate_plan_id:   null,
        channel:        'Direct',
        status:         'Pending',
        check_in_date:  checkIn,
        check_out_date: checkOut,
        adults:         adults ?? 1,
        children:       0,
        total_amount:   selectedRoom!.totalPrice,
        currency:       'USD',
      })
      .select('id')
      .single();

    if (rErr || !res) throw new Error('Failed to create reservation');

    clearConvState(from);

    const checkinUrl = `${FRONTEND}/checkin/${res.id}`;

    // Fetch full room + hotel data for the ticket
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('floor, hotel_id, rate_plans(name, meal_plan)')
      .eq('id', selectedRoom!.id)
      .maybeSingle();

    const roomFloor = roomRow ? String((roomRow as any).floor ?? '') : '';
    const rp = roomRow && (roomRow as any).rate_plans;
    const ratePlanName = rp ? String(rp.name ?? 'Standard') : 'Standard';
    const mealPlan     = rp ? String(rp.meal_plan ?? '') : '';

    const hotelId = roomRow ? String((roomRow as any).hotel_id ?? '') : '';
    const { data: hotelRow } = hotelId
      ? await supabase.from('hotel_accounts').select('name,address,phone,email').eq('id', hotelId).single()
      : await supabase.from('hotel_accounts').select('name,address,phone,email').limit(1).single();
    const h = hotelRow as Record<string, unknown> | null;

    const ticketData: TicketData = {
      bookingId:    res.id,
      guestName:    `${firstName} ${lastName}`,
      email:        email!,
      phone,
      roomNumber:   selectedRoom!.roomNumber,
      roomType:     selectedRoom!.roomType,
      floor:        roomFloor,
      ratePlan:     ratePlanName,
      mealPlan,
      checkIn:      checkIn!,
      checkOut:     checkOut!,
      adults:       adults ?? 1,
      totalAmount:  String(selectedRoom!.totalPrice),
      currency:     'USD',
      checkinUrl,
      hotelName:    h ? String(h.name) : HOTEL,
      hotelAddress: h ? String(h.address ?? '') : '',
      hotelPhone:   h ? String(h.phone ?? '') : '',
      hotelEmail:   h ? String(h.email ?? '') : '',
    };

    // Send ticket via WhatsApp
    await sendText(from, buildTicketText(ticketData));

    // Send ticket via email (fire-and-forget)
    sendBookingTicketEmail(ticketData).catch(() => {});
  } catch (err) {
    console.error('[WhatsAppBot] Booking error:', err);
    clearConvState(from);
    await sendText(from,
      `😔 Something went wrong while creating your booking. Please try again or contact reception.\n\nReply *BOOK* to start over.`,
    );
  }
}

// ── Default greeting / menu ───────────────────────────────────────────────────

async function sendGreeting(from: string) {
  await sendText(from,
    `👋 Welcome to *${HOTEL}*!\n\n` +
    `How can we help you today?\n\n` +
    `*BOOK* — Reserve a room\n` +
    `*INFO* — Hotel information\n\n` +
    `_If you have an existing booking, we'll recognise your number automatically._`,
  );
}

// ── DB lookups (existing guests / staff) ──────────────────────────────────────

async function findStaffByPhone(phone: string) {
  const d = digits(phone);
  if (!d) return null;
  const last9 = d.slice(-9);
  const { data } = await supabase
    .from('hotel_users')
    .select('id, first_name, last_name, role')
    .or(`phone.eq.${d},phone.eq.+${d},phone.ilike.%${last9}`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data;
}

async function findCheckedInContext(phone: string) {
  const d = digits(phone);
  if (!d) return null;
  const last9 = d.slice(-9);

  const { data: guest } = await supabase
    .from('guests')
    .select('id, first_name, last_name, phone')
    .or(`phone.eq.${d},phone.eq.+${d},phone.ilike.%${last9}`)
    .maybeSingle();

  if (!guest) return null;

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, status, check_out_date, rooms(id, room_number, room_type)')
    .eq('guest_id', guest.id)
    .in('status', ['Checked-in', 'Confirmed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reservation) return null;
  return { guest, reservation };
}

// ── Staff handler ─────────────────────────────────────────────────────────────

async function handleStaffMessage(
  from: string,
  text: string,
  staff: { id: string; first_name: string; last_name: string; role: string },
) {
  const name = staff.first_name;
  const cmd  = text.trim().toLowerCase();

  if (/^done[!.✓✅]?$/.test(cmd) || cmd === '✓' || cmd === '✅') {
    const { data: task } = await supabase
      .from('housekeeping_tasks')
      .select('id, rooms(room_number)')
      .eq('assigned_staff_id', staff.id)
      .eq('status', 'In Progress')
      .order('due_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!task) {
      await sendText(from, `Hi ${name}! You have no in-progress tasks right now. 👍`);
      return;
    }

    await supabase.from('housekeeping_tasks').update({ status: 'Resolved' }).eq('id', task.id);
    const room = (task.rooms as any)?.room_number ?? '?';
    await sendText(from, `✅ Room ${room} task marked as *Resolved*. Great work, ${name}! 🌟`);
    return;
  }

  if (cmd === 'tasks' || cmd === 'my tasks' || cmd === 'help') {
    const { data: tasks } = await supabase
      .from('housekeeping_tasks')
      .select('id, status, priority, rooms(room_number)')
      .eq('assigned_staff_id', staff.id)
      .in('status', ['Open', 'In Progress'])
      .order('due_at', { ascending: true });

    if (!tasks || tasks.length === 0) {
      await sendText(from, `Hi ${name}! You have no pending tasks right now. 🎉`);
      return;
    }

    const lines = [
      `🏨 *${HOTEL}* — Your Tasks`, '',
      ...tasks.map((t: any, i: number) =>
        `${i + 1}. Room ${(t.rooms as any)?.room_number ?? '?'} — ${t.status} (${t.priority})`
      ),
      '', 'Reply *DONE* when you finish your current task.',
    ];
    await sendText(from, lines.join('\n'));
    return;
  }

  await sendText(from,
    `Hi ${name}! 👋\n\nReply *DONE* to mark your current in-progress task complete.\nReply *TASKS* to see your pending list.`,
  );
}

// ── Guest in-stay handler ────────────────────────────────────────────────────

async function handleGuestMessage(
  from: string,
  text: string,
  ctx: { guest: any; reservation: any },
) {
  const { guest, reservation } = ctx;
  const guestName  = guest.first_name;
  const room       = reservation.rooms as any;
  const roomNumber = room?.room_number ?? '?';
  const state      = getConvState(from);
  const cmd        = text.trim().toLowerCase();

  if (state.mode === 'awaiting_order') {
    await supabase.from('service_orders').insert({
      reservation_id:        reservation.id,
      requested_by_guest_id: guest.id,
      department:            'Room Service',
      items:                 [text],
      status:                'New',
      amount:                0,
    });
    clearConvState(from);
    await sendText(from,
      `✅ Order received for Room *${roomNumber}*!\n\n📝 Items: ${text}\n\n⏱ Estimated: 20–30 mins. We'll message you when it's on its way!`,
    );
    return;
  }

  if (state.mode === 'awaiting_maintenance') {
    await supabase.from('housekeeping_tasks').insert({
      room_id:  room?.id,
      hotel_id: HOTEL_ID,
      status:   'Open',
      priority: 'Normal',
      notes:    `[Guest via WhatsApp] ${text}`,
    });
    clearConvState(from);
    await sendText(from,
      `✅ Maintenance request logged for Room *${roomNumber}*.\n\n📝 Details: ${text}\n\nOur team will attend to this shortly, ${guestName}. Thank you!`,
    );
    return;
  }

  if (cmd === '1' || /order|room service|food|eat|hungry/.test(cmd)) {
    setConvState(from, { mode: 'awaiting_order', reservationId: reservation.id, guestId: guest.id, guestName, roomNumber });
    await sendText(from, `🍽️ *Room Service — Room ${roomNumber}*\n\nType what you'd like to order:\n_e.g. "2x chicken burger, 1x Coke, chips"_`);
    return;
  }

  if (cmd === '2' || /maintenance|broken|fix|repair|housekeeping|clean|towel/.test(cmd)) {
    setConvState(from, { mode: 'awaiting_maintenance', reservationId: reservation.id, guestId: guest.id, guestName, roomNumber });
    await sendText(from, `🔧 *Maintenance / Housekeeping — Room ${roomNumber}*\n\nDescribe the issue or request:`);
    return;
  }

  if (cmd === '3' || /bill|checkout|check out|balance|total/.test(cmd)) {
    const { data: folio } = await supabase.from('folios').select('id, currency').eq('reservation_id', reservation.id).maybeSingle();
    const { data: lines } = folio
      ? await supabase.from('folio_line_items').select('description, quantity, unit_price').eq('folio_id', folio.id)
      : { data: [] };
    const total    = (lines ?? []).reduce((s: number, l: any) => s + l.quantity * l.unit_price, 0);
    const currency = folio?.currency ?? 'USD';
    await sendText(from, [
      `🏨 *${HOTEL}*`, '',
      `Hi ${guestName}! Here's your current bill:`, '',
      `🛏 Room *${roomNumber}*`, `📅 Check-out: ${reservation.check_out_date}`,
      ...(lines && lines.length > 0
        ? ['', ...lines.map((l: any) => `  • ${l.description} x${l.quantity} — ${currency} ${(l.quantity * l.unit_price).toFixed(2)}`)]
        : ['', '_No additional charges yet._']),
      '', `💵 *Total: ${currency} ${total.toFixed(2)}*`, '',
      'Please visit the front desk to complete checkout.',
    ].join('\n'));
    return;
  }

  await sendText(from, [
    `🏨 *${HOTEL}*`,
    `Hi ${guestName}! ${reservation.status === 'Checked-in' ? `Welcome to Room *${roomNumber}* 😊` : `Your room *${roomNumber}* is ready for your arrival!`}`,
    '', 'How can we help you?', '',
    '*1* — 🍽️ Room Service',
    '*2* — 🔧 Maintenance / Housekeeping',
    '*3* — 💵 View Bill',
    '', 'Reply with a number or describe what you need.',
  ].join('\n'));
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function handleIncoming(from: string, body: string): Promise<void> {
  try {
    // 1. Staff member?
    const staff = await findStaffByPhone(from);
    if (staff) { await handleStaffMessage(from, body, staff); return; }

    // 2. Existing checked-in / confirmed guest?
    const ctx = await findCheckedInContext(from);
    if (ctx) { await handleGuestMessage(from, body, ctx); return; }

    // 3. Active booking conversation?
    const state = getConvState(from);

    if (state.mode === 'booking_check_in') { await handleCheckIn(from, body); return; }
    if (state.mode === 'booking_check_out') { await handleCheckOut(from, body, state.booking ?? {}); return; }
    if (state.mode === 'booking_guests')    { await handleGuests(from, body, state.booking ?? {}); return; }
    if (state.mode === 'booking_pick_room') { await handlePickRoom(from, body, state.booking ?? {}); return; }
    if (state.mode === 'booking_name')      { await handleName(from, body, state.booking ?? {}); return; }
    if (state.mode === 'booking_email')     { await handleEmail(from, body, state.booking ?? {}); return; }
    if (state.mode === 'booking_confirm')   { await handleConfirm(from, body, state.booking ?? {}); return; }

    // 4. Fresh message — booking intent or help?
    const cmd = body.trim().toUpperCase();
    if (cmd === 'BOOK' || await isBookingIntent(body)) {
      await startBooking(from);
      return;
    }

    if (cmd === 'INFO') {
      await sendText(from,
        `🏨 *${HOTEL}*\n\nFor reservations, reply *BOOK*.\nFor other enquiries, please contact reception directly.\n\nWe look forward to hosting you! 😊`,
      );
      return;
    }

    // Default
    await sendGreeting(from);

  } catch (err) {
    console.error('[WhatsAppBot] Error handling message from', from, err);
  }
}
