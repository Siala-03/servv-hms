// Public routes — no auth required.
// Used by the guest-facing check-in page.

import { Router } from 'express';
import { supabase } from '../lib/supabase';
import {
  sendBookingConfirmation,
  sendCheckinLink,
  sendText,
} from '../services/whatsapp';

const currFmt    = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const HOTEL_NAME   = process.env.HOTEL_NAME ?? 'SERVV Hotel';

const router = Router();

// ── GET /api/public/checkin/:id ───────────────────────────────────────────────
// Returns reservation details so the check-in page can show them to the guest.
router.get('/checkin/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id, status, check_in_date, check_out_date, adults, children, total_amount, currency,
      guests ( id, first_name, last_name, phone, email, id_verified ),
      rooms ( id, room_number, room_type, floor ),
      rate_plans ( name, meal_plan )
    `)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  if (!['Confirmed', 'Pending'].includes(data.status)) {
    return res.status(400).json({
      error: data.status === 'Checked-in'
        ? 'You have already checked in. See you at the front desk!'
        : 'This reservation is not eligible for online pre-registration.',
    });
  }

  const g = data.guests as any;
  const r = data.rooms as any;
  const p = data.rate_plans as any;

  res.json({
    id:           data.id,
    status:       data.status,
    checkInDate:  data.check_in_date,
    checkOutDate: data.check_out_date,
    adults:       data.adults,
    children:     data.children,
    totalAmount:  data.total_amount,
    currency:     data.currency,
    guest: {
      id:          g?.id,
      firstName:   g?.first_name,
      lastName:    g?.last_name,
      phone:       g?.phone,
      email:       g?.email,
      idVerified:  g?.id_verified ?? false,
    },
    room: {
      id:         r?.id,
      roomNumber: r?.room_number,
      roomType:   r?.room_type,
      floor:      r?.floor,
    },
    ratePlan: {
      name:     p?.name,
      mealPlan: p?.meal_plan,
    },
  });
});

// ── POST /api/public/checkin/:id ──────────────────────────────────────────────
// Guest submits their ID details for pre-registration.
router.post('/checkin/:id', async (req, res) => {
  const { idType, idNumber, fullName } = req.body as {
    idType:   string;
    idNumber: string;
    fullName: string;
  };

  if (!idType?.trim() || !idNumber?.trim() || !fullName?.trim()) {
    return res.status(400).json({ error: 'idType, idNumber, and fullName are required' });
  }

  // Fetch reservation
  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, status, guest_id, special_requests')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!reservation) {
    return res.status(404).json({ error: 'Reservation not found' });
  }

  if (!['Confirmed', 'Pending'].includes(reservation.status)) {
    return res.status(400).json({ error: 'Reservation not eligible for pre-registration' });
  }

  // Update guest ID details
  await supabase
    .from('guests')
    .update({ id_type: idType.trim(), id_number: idNumber.trim(), id_verified: true })
    .eq('id', reservation.guest_id);

  // Record on reservation
  const note = `[Online pre-check-in] Name: ${fullName} | ID: ${idType} — ${idNumber}`;
  await supabase
    .from('reservations')
    .update({ special_requests: note })
    .eq('id', reservation.id);

  // Confirm pre-registration to guest via WhatsApp
  Promise.resolve(
    supabase.from('guests').select('phone, first_name').eq('id', reservation.guest_id).single()
  ).then(({ data: g }) => {
      const phone = String((g as Record<string, unknown> | null)?.phone ?? '');
      const name  = String((g as Record<string, unknown> | null)?.first_name ?? 'Guest');
      if (phone.length > 5) {
        sendText(
          phone,
          `🏨 *${HOTEL_NAME}*\n\nHi ${name}! Your online pre-registration is complete ✅\n\nJust show your ID at the front desk on arrival — no paperwork needed.\n\nSee you soon!`,
        ).catch(() => {});
      }
    }).catch(() => {});

  res.json({ success: true });
});

// ── GET /api/public/book/:hotelId/availability ────────────────────────────────
// Returns hotel info + rooms not already reserved for the requested date range.
// Query params: checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), guests (number)
router.get('/book/:hotelId/availability', async (req, res) => {
  const { hotelId } = req.params;
  const { checkIn, checkOut } = req.query as { checkIn?: string; checkOut?: string };

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'checkIn and checkOut are required' });
  }
  if (checkIn >= checkOut) {
    return res.status(400).json({ error: 'checkOut must be after checkIn' });
  }

  // Hotel info
  const { data: hotel, error: hotelErr } = await supabase
    .from('hotel_accounts')
    .select('id, name, email, phone, address')
    .eq('id', hotelId)
    .maybeSingle();

  if (hotelErr || !hotel) {
    return res.status(404).json({ error: 'Hotel not found' });
  }

  // All rooms for hotel
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, room_type, floor, base_rate, max_occupancy, status')
    .eq('hotel_id', hotelId)
    .order('floor')
    .order('room_number');

  // Find rooms already booked in this range
  const { data: conflicting } = await supabase
    .from('reservations')
    .select('room_id')
    .eq('hotel_id', hotelId)
    .not('status', 'in', '("Cancelled","Checked-out")')
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn);

  const takenIds = new Set((conflicting ?? []).map((r: any) => r.room_id));

  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
  );

  const available = (rooms ?? [])
    .filter((r: any) => r.status !== 'Maintenance' && !takenIds.has(r.id))
    .map((r: any) => ({
      id:           r.id,
      roomNumber:   r.room_number,
      roomType:     r.room_type,
      floor:        r.floor,
      baseRate:     Number(r.base_rate),
      maxOccupancy: r.max_occupancy,
      totalPrice:   Math.round(Number(r.base_rate) * nights),
    }));

  res.json({ hotel: { id: hotel.id, name: hotel.name }, nights, available });
});

// ── POST /api/public/book/:hotelId ────────────────────────────────────────────
// Guest submits booking: upsert guest by email, create Pending reservation.
router.post('/book/:hotelId', async (req, res) => {
  const { hotelId } = req.params;
  const {
    firstName, lastName, email, phone,
    roomId, checkIn, checkOut, adults, children, totalAmount,
  } = req.body as {
    firstName: string; lastName: string; email: string; phone: string;
    roomId: string; checkIn: string; checkOut: string;
    adults: number; children: number; totalAmount: number;
  };

  if (!firstName || !lastName || !email || !phone || !roomId || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Verify hotel exists
  const { data: hotel } = await supabase
    .from('hotel_accounts')
    .select('id')
    .eq('id', hotelId)
    .maybeSingle();

  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  // Verify room is still available (re-check for race conditions)
  const { data: conflict } = await supabase
    .from('reservations')
    .select('id')
    .eq('room_id', roomId)
    .not('status', 'in', '("Cancelled","Checked-out")')
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn)
    .maybeSingle();

  if (conflict) return res.status(409).json({ error: 'Sorry, this room was just booked. Please select another.' });

  // Upsert guest by email (within hotel scope)
  let guestId: string;
  const { data: existingGuest } = await supabase
    .from('guests')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (existingGuest) {
    guestId = existingGuest.id;
  } else {
    const { data: newGuest, error: guestErr } = await supabase
      .from('guests')
      .insert({
        hotel_id:   hotelId,
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        email:      email.trim().toLowerCase(),
        phone:      phone.trim(),
      })
      .select('id')
      .single();

    if (guestErr || !newGuest) return res.status(500).json({ error: 'Failed to create guest record' });
    guestId = newGuest.id;
  }

  // Create reservation
  const { data: reservation, error: resErr } = await supabase
    .from('reservations')
    .insert({
      hotel_id:       hotelId,
      guest_id:       guestId,
      room_id:        roomId,
      rate_plan_id:   null,
      channel:        'Direct',
      status:         'Pending',
      check_in_date:  checkIn,
      check_out_date: checkOut,
      adults:         adults ?? 1,
      children:       children ?? 0,
      total_amount:   totalAmount ?? 0,
      currency:       'USD',
    })
    .select('id')
    .single();

  if (resErr || !reservation) return res.status(500).json({ error: 'Failed to create reservation' });

  // Send WhatsApp booking confirmation to guest
  if (phone?.length > 5) {
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('room_number, room_type')
      .eq('id', roomId)
      .single();

    const rm = roomRow as Record<string, unknown> | null;
    sendBookingConfirmation({
      phone:      phone.trim(),
      guestName:  `${firstName} ${lastName}`,
      bookingId:  reservation.id,
      roomNo:     rm ? String(rm.room_number) : '',
      roomType:   rm ? String(rm.room_type)   : '',
      checkIn:    checkIn,
      checkOut:   checkOut,
      adults:     adults ?? 1,
      children:   children ?? 0,
      amount:     currFmt.format(totalAmount ?? 0),
      checkinUrl: `${FRONTEND_URL}/checkin/${reservation.id}`,
    }).catch(() => {});
  }

  res.json({ bookingId: reservation.id });
});

// ── GET /api/public/room/:roomId ─────────────────────────────────────────────
// Returns room + hotel info for the QR guest directory (no auth).
router.get('/room/:roomId', async (req, res) => {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, room_number, room_type, floor, hotel_id')
    .eq('id', req.params.roomId)
    .maybeSingle();

  if (error || !room) return res.status(404).json({ error: 'Room not found' });

  const { data: hotel } = await supabase
    .from('hotel_accounts')
    .select('id, name, phone, email, address')
    .eq('id', room.hotel_id)
    .maybeSingle();

  res.json({
    room: {
      id:         room.id,
      roomNumber: room.room_number,
      roomType:   room.room_type,
      floor:      room.floor,
    },
    hotel: {
      id:      hotel?.id,
      name:    hotel?.name ?? 'SERVV Hotel',
      phone:   hotel?.phone ?? '',
      email:   hotel?.email ?? '',
      address: hotel?.address ?? '',
    },
  });
});

// ── POST /api/public/room/:roomId/order ───────────────────────────────────────
// Guest places a room service order from the QR directory (no auth).
router.post('/room/:roomId/order', async (req, res) => {
  const { items, department = 'Room Service', guestName, notes } = req.body as {
    items: string[]; department?: string; guestName?: string; notes?: string;
  };

  if (!items?.length) return res.status(400).json({ error: 'items are required' });

  const { data: room } = await supabase
    .from('rooms')
    .select('id, room_number, hotel_id')
    .eq('id', req.params.roomId)
    .maybeSingle();

  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Find active reservation for this room (if any) to link the order
  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, guest_id')
    .eq('room_id', room.id)
    .in('status', ['Checked-in', 'Confirmed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const allItems = notes ? [...items, `Note: ${notes}`] : items;

  const { data: order, error } = await supabase
    .from('service_orders')
    .insert({
      reservation_id:        reservation?.id ?? null,
      requested_by_guest_id: reservation?.guest_id ?? null,
      department,
      items:  allItems,
      status: 'New',
      amount: 0,
      currency: 'USD',
    })
    .select('id')
    .single();

  if (error || !order) return res.status(500).json({ error: 'Failed to place order' });

  // Alert hotel front desk via WhatsApp
  Promise.resolve(
    supabase.from('hotel_accounts').select('phone').eq('id', room.hotel_id).single()
  ).then(({ data: h }) => {
    const hotelPhone = String((h as Record<string, unknown> | null)?.phone ?? '');
    if (hotelPhone.length > 5) {
      const itemList = allItems.map((i) => `  • ${i}`).join('\n');
      sendText(
        hotelPhone,
        `🛎 *New ${department} Order — Room ${room.room_number}*\n\n${itemList}\n\nOrder #${order.id.slice(0, 8)}`,
      ).catch(() => {});
    }
  }).catch(() => {});

  res.json({ orderId: order.id, roomNumber: room.room_number });
});

// ── POST /api/public/room/:roomId/request ─────────────────────────────────────
// Guest submits a housekeeping / maintenance request from QR directory.
router.post('/room/:roomId/request', async (req, res) => {
  const { type, notes } = req.body as { type: string; notes?: string };

  if (!type) return res.status(400).json({ error: 'type is required' });

  const { data: room } = await supabase
    .from('rooms')
    .select('id, room_number, hotel_id')
    .eq('id', req.params.roomId)
    .maybeSingle();

  if (!room) return res.status(404).json({ error: 'Room not found' });

  const priority = type === 'Maintenance' ? 'High' : 'Normal';
  const taskNotes = [type, notes].filter(Boolean).join(' — ');

  const { data: task, error } = await supabase
    .from('housekeeping_tasks')
    .insert({
      room_id:  room.id,
      hotel_id: room.hotel_id,
      status:   'Open',
      priority,
      notes:    `[QR Guest Request] ${taskNotes}`,
    })
    .select('id')
    .single();

  if (error || !task) return res.status(500).json({ error: 'Failed to submit request' });

  // Alert hotel front desk via WhatsApp
  Promise.resolve(
    supabase.from('hotel_accounts').select('phone').eq('id', room.hotel_id).single()
  ).then(({ data: h }) => {
    const hotelPhone = String((h as Record<string, unknown> | null)?.phone ?? '');
    if (hotelPhone.length > 5) {
      sendText(
        hotelPhone,
        `🔔 *Guest Request — Room ${room.room_number}*\n\nType: ${type}${notes ? `\nNote: ${notes}` : ''}\n\nPriority: ${priority}`,
      ).catch(() => {});
    }
  }).catch(() => {});

  res.json({ taskId: task.id, roomNumber: room.room_number });
});

export default router;
