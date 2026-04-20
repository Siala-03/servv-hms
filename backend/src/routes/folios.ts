import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function toLineItem(row: Record<string, unknown>) {
  return {
    id:          row.id,
    folioId:     row.folio_id,
    description: row.description,
    quantity:    row.quantity,
    unitPrice:   Number(row.unit_price),
    postedAt:    row.posted_at,
  };
}

function toFolio(row: Record<string, unknown>) {
  const items = (row.folio_line_items as Record<string, unknown>[] | null) ?? [];
  return {
    id:            row.id,
    reservationId: row.reservation_id,
    isClosed:      row.is_closed,
    currency:      row.currency,
    lineItems:     items.map(toLineItem),
  };
}

// GET /api/folios/by-reservation/:reservationId
router.get('/by-reservation/:reservationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('folios')
      .select('*, folio_line_items(*)')
      .eq('reservation_id', req.params.reservationId)
      .single();

    if (error) { res.status(404).json({ error: 'Folio not found' }); return; }
    res.json(toFolio(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/folios  – create folio for a reservation
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('folios')
      .insert({ reservation_id: b.reservationId, currency: b.currency ?? 'USD' })
      .select('*, folio_line_items(*)')
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toFolio(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/folios/:id/line-items
router.post('/:id/line-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('folio_line_items')
      .insert({
        folio_id:    req.params.id,
        description: b.description,
        quantity:    b.quantity ?? 1,
        unit_price:  b.unitPrice,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toLineItem(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/folios/:id/close
router.patch('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('folios')
      .update({ is_closed: true })
      .eq('id', req.params.id)
      .select('*, folio_line_items(*)')
      .single();

    if (error) { res.status(404).json({ error: 'Folio not found' }); return; }
    res.json(toFolio(data));
  } catch (err) {
    next(err);
  }
});

export default router;
