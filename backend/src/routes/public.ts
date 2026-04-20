// Public routes — no auth required.
// Used by the guest-facing check-in page.

import { Router } from 'express';
import { supabase } from '../lib/supabase';

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

  res.json({ success: true });
});

export default router;
