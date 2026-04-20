import { supabase } from '../lib/supabase';
import { sendText } from './whatsapp';
import { getConvState, setConvState, clearConvState } from './conversationState';

const HOTEL = process.env.HOTEL_NAME ?? 'SERVV Hotel';

// Strip everything except digits
function digits(phone: string) {
  return phone.replace(/\D/g, '');
}

// ── DB lookups ────────────────────────────────────────────────────────────────

async function findStaffByPhone(phone: string) {
  const d = digits(phone);
  if (!d) return null;
  const last9 = d.slice(-9);
  const { data } = await supabase
    .from('staff_members')
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

async function handleStaffMessage(from: string, text: string, staff: { id: string; first_name: string; last_name: string; role: string }) {
  const name = `${staff.first_name}`;
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

    await supabase
      .from('housekeeping_tasks')
      .update({ status: 'Resolved' })
      .eq('id', task.id);

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
      `🏨 *${HOTEL}* — Your Tasks`,
      '',
      ...tasks.map((t: any, i: number) =>
        `${i + 1}. Room ${(t.rooms as any)?.room_number ?? '?'} — ${t.status} (${t.priority})`
      ),
      '',
      'Reply *DONE* when you finish your current task.',
    ];

    await sendText(from, lines.join('\n'));
    return;
  }

  await sendText(
    from,
    `Hi ${name}! 👋\n\nReply *DONE* to mark your current in-progress task complete.\nReply *TASKS* to see your pending list.`,
  );
}

// ── Guest handler ─────────────────────────────────────────────────────────────

async function handleGuestMessage(
  from: string,
  text: string,
  ctx: { guest: any; reservation: any },
) {
  const { guest, reservation } = ctx;
  const guestName  = `${guest.first_name}`;
  const room       = reservation.rooms as any;
  const roomNumber = room?.room_number ?? '?';
  const state      = getConvState(from);
  const cmd        = text.trim().toLowerCase();

  // ── Stateful replies ──────────────────────────────────────────
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
    await sendText(
      from,
      `✅ Order received for Room *${roomNumber}*!\n\n📝 Items: ${text}\n\n⏱ Estimated: 20–30 mins. We'll message you when it's on its way!`,
    );
    return;
  }

  if (state.mode === 'awaiting_maintenance') {
    await supabase.from('housekeeping_tasks').insert({
      room_id:  room?.id,
      status:   'Open',
      priority: 'Normal',
      notes:    `[Guest via WhatsApp] ${text}`,
    });

    clearConvState(from);
    await sendText(
      from,
      `✅ Maintenance request logged for Room *${roomNumber}*.\n\n📝 Details: ${text}\n\nOur team will attend to this shortly, ${guestName}. Thank you!`,
    );
    return;
  }

  // ── Command parsing ───────────────────────────────────────────
  if (cmd === '1' || /order|room service|food|eat|hungry/.test(cmd)) {
    setConvState(from, {
      mode: 'awaiting_order',
      reservationId: reservation.id,
      guestId: guest.id,
      guestName,
      roomNumber,
    });
    await sendText(from, `🍽️ *Room Service — Room ${roomNumber}*\n\nType what you'd like to order:\n_e.g. "2x chicken burger, 1x Coke, chips"_`);
    return;
  }

  if (cmd === '2' || /maintenance|broken|fix|repair|housekeeping|clean|towel/.test(cmd)) {
    setConvState(from, {
      mode: 'awaiting_maintenance',
      reservationId: reservation.id,
      guestId: guest.id,
      guestName,
      roomNumber,
    });
    await sendText(from, `🔧 *Maintenance / Housekeeping — Room ${roomNumber}*\n\nDescribe the issue or request:`);
    return;
  }

  if (cmd === '3' || /bill|checkout|check out|balance|total/.test(cmd)) {
    const { data: folio } = await supabase
      .from('folios')
      .select('currency, is_closed')
      .eq('reservation_id', reservation.id)
      .maybeSingle();

    const { data: lines } = await supabase
      .from('folio_line_items')
      .select('description, quantity, unit_price')
      .eq('folio_id', folio ? (await supabase.from('folios').select('id').eq('reservation_id', reservation.id).maybeSingle()).data?.id ?? '' : '');

    const total = lines
      ? lines.reduce((sum: number, l: any) => sum + l.quantity * l.unit_price, 0)
      : 0;

    const currency = folio?.currency ?? 'USD';
    await sendText(from, [
      `🏨 *${HOTEL}*`,
      '',
      `Hi ${guestName}! Here's your current bill:`,
      '',
      `🛏 Room *${roomNumber}*`,
      `📅 Check-out: ${reservation.check_out_date}`,
      ...(lines && lines.length > 0
        ? ['', ...lines.map((l: any) => `  • ${l.description} x${l.quantity} — ${currency} ${(l.quantity * l.unit_price).toFixed(2)}`)]
        : []),
      '',
      `💵 *Total: ${currency} ${total.toFixed(2)}*`,
      '',
      'Please visit the front desk to complete checkout.',
    ].join('\n'));
    return;
  }

  // ── Default: send menu ────────────────────────────────────────
  await sendGuestMenu(from, guestName, roomNumber, reservation.status);
}

async function sendGuestMenu(from: string, name: string, roomNumber: string, status: string) {
  const checkedIn = status === 'Checked-in';
  await sendText(from, [
    `🏨 *${HOTEL}*`,
    `Hi ${name}! ${checkedIn ? `Welcome to Room *${roomNumber}* 😊` : `Your room *${roomNumber}* is ready for your arrival!`}`,
    '',
    'How can we help you?',
    '',
    '*1* — 🍽️ Room Service',
    '*2* — 🔧 Maintenance / Housekeeping',
    '*3* — 💵 View Bill',
    '',
    'Reply with a number or describe what you need.',
  ].join('\n'));
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function handleIncoming(from: string, body: string): Promise<void> {
  try {
    const staff = await findStaffByPhone(from);
    if (staff) {
      await handleStaffMessage(from, body, staff);
      return;
    }

    const ctx = await findCheckedInContext(from);
    if (ctx) {
      await handleGuestMessage(from, body, ctx);
      return;
    }

    await sendText(
      from,
      `Hi! Thanks for contacting *${HOTEL}*.\n\nWe couldn't find a reservation linked to this number. Please visit our front desk or call reception. 😊`,
    );
  } catch (err) {
    console.error('[WhatsAppBot] Error handling message from', from, err);
  }
}
