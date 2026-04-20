import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

const JOIN_QUERY = `
  *,
  guests       ( id, first_name, last_name ),
  reservations ( id, room_id, rooms ( room_number ) )
`;

function toOrder(row: Record<string, unknown>) {
  const g = row.guests as Record<string, unknown> | null;
  const res = row.reservations as Record<string, unknown> | null;
  const rm = res?.rooms as Record<string, unknown> | null;

  return {
    id:                 row.id,
    reservationId:      row.reservation_id,
    requestedByGuestId: row.requested_by_guest_id,
    department:         row.department,
    items:              row.items,
    status:             row.status,
    amount:             Number(row.amount),
    currency:           row.currency,
    requestedAt:        row.requested_at,
    guest: g ? { id: g.id, firstName: g.first_name, lastName: g.last_name } : null,
    roomNumber: rm?.room_number ?? null,
  };
}

// GET /api/orders?status=&department=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('service_orders').select(JOIN_QUERY);
    if (req.query.status)     query = query.eq('status', req.query.status as string);
    if (req.query.department) query = query.eq('department', req.query.department as string);

    const { data, error } = await query.order('requested_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toOrder));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        reservation_id:         b.reservationId,
        requested_by_guest_id:  b.requestedByGuestId,
        department:             b.department,
        items:                  b.items ?? [],
        status:                 b.status ?? 'New',
        amount:                 b.amount ?? 0,
        currency:               b.currency ?? 'USD',
      })
      .select(JOIN_QUERY)
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toOrder(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const { data, error } = await supabase
      .from('service_orders')
      .update({ status })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(toOrder(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('service_orders')
      .update({
        department: b.department,
        items:      b.items,
        status:     b.status,
        amount:     b.amount,
      })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(toOrder(data));
  } catch (err) {
    next(err);
  }
});

export default router;
