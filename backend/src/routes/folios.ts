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

// GET /api/folios?reservationIds=id1,id2,id3
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservationIdsParam = String(req.query.reservationIds ?? '').trim();
    const reservationIds = reservationIdsParam
      ? reservationIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    let query = supabase
      .from('folios')
      .select('id, reservation_id, is_closed, currency')
      .order('created_at', { ascending: false });

    if (reservationIds.length > 0) {
      query = query.in('reservation_id', reservationIds);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    res.json((data ?? []).map((row) => ({
      id: row.id,
      reservationId: row.reservation_id,
      isClosed: row.is_closed,
      currency: row.currency,
    })));
  } catch (err) {
    next(err);
  }
});

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

// ── POST /api/folios/charge/:reservationId ────────────────────────────────────
// Called by the scanner/POS when a guest charges a restaurant bill to their room.
// Auth: x-api-key header (shared secret between scanner and HMS).
router.post('/charge/:reservationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!process.env.SCANNER_API_KEY || apiKey !== process.env.SCANNER_API_KEY) {
      res.status(401).json({ error: 'Invalid API key' }); return;
    }

    const { description, amount, currency = 'USD', quantity = 1 } = req.body as {
      description: string; amount: number; currency?: string; quantity?: number;
    };

    if (!description || amount == null) {
      res.status(400).json({ error: 'description and amount are required' }); return;
    }

    // Find or create folio
    let { data: folio } = await supabase
      .from('folios')
      .select('id, is_closed')
      .eq('reservation_id', req.params.reservationId)
      .maybeSingle();

    if (!folio) {
      const { data: newFolio, error } = await supabase
        .from('folios')
        .insert({ reservation_id: req.params.reservationId, currency })
        .select('id, is_closed')
        .single();
      if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
      folio = newFolio;
    }

    if (folio.is_closed) {
      res.status(400).json({ error: 'Folio is already closed — guest has checked out' }); return;
    }

    const { data: lineItem, error } = await supabase
      .from('folio_line_items')
      .insert({ folio_id: folio.id, description, quantity, unit_price: amount })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({ success: true, lineItem: toLineItem(lineItem) });
  } catch (err) {
    next(err);
  }
});

export default router;
