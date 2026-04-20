import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Full reservation row with joined guest + room + rate_plan
function toReservation(row: Record<string, unknown>) {
  const g = row.guests as Record<string, unknown> | null;
  const rm = row.rooms as Record<string, unknown> | null;
  const rp = row.rate_plans as Record<string, unknown> | null;

  return {
    id:           row.id,
    guestId:      row.guest_id,
    roomId:       row.room_id,
    ratePlanId:   row.rate_plan_id,
    channel:      row.channel,
    status:       row.status,
    checkInDate:  row.check_in_date,
    checkOutDate: row.check_out_date,
    adults:       row.adults,
    children:     row.children,
    totalAmount:  Number(row.total_amount),
    currency:     row.currency,
    createdAt:    row.created_at,
    // Denormalized joins (convenient for list views)
    guest: g ? {
      id:        g.id,
      firstName: g.first_name,
      lastName:  g.last_name,
      email:     g.email,
    } : null,
    room: rm ? {
      id:         rm.id,
      roomNumber: rm.room_number,
      roomType:   rm.room_type,
    } : null,
    ratePlan: rp ? {
      id:   rp.id,
      code: rp.code,
      name: rp.name,
    } : null,
  };
}

const JOIN_QUERY = `
  *,
  guests ( id, first_name, last_name, email ),
  rooms  ( id, room_number, room_type ),
  rate_plans ( id, code, name )
`;

// GET /api/reservations?status=&channel=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('reservations').select(JOIN_QUERY);

    if (req.query.status) {
      query = query.eq('status', req.query.status as string);
    }
    if (req.query.channel) {
      query = query.eq('channel', req.query.channel as string);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toReservation));
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(JOIN_QUERY)
      .eq('id', req.params.id)
      .single();

    if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
    res.json(toReservation(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        guest_id:      b.guestId,
        room_id:       b.roomId,
        rate_plan_id:  b.ratePlanId,
        channel:       b.channel,
        status:        b.status ?? 'Pending',
        check_in_date: b.checkInDate,
        check_out_date: b.checkOutDate,
        adults:        b.adults ?? 1,
        children:      b.children ?? 0,
        total_amount:  b.totalAmount ?? 0,
        currency:      b.currency ?? 'USD',
      })
      .select(JOIN_QUERY)
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toReservation(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/reservations/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('reservations')
      .update({
        guest_id:      b.guestId,
        room_id:       b.roomId,
        rate_plan_id:  b.ratePlanId,
        channel:       b.channel,
        status:        b.status,
        check_in_date: b.checkInDate,
        check_out_date: b.checkOutDate,
        adults:        b.adults,
        children:      b.children,
        total_amount:  b.totalAmount,
        currency:      b.currency,
      })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
    res.json(toReservation(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reservations/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
    res.json(toReservation(data));
  } catch (err) {
    next(err);
  }
});

export default router;
