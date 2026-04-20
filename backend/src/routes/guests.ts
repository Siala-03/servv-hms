import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// camelCase → DB column name map for guests
function toRow(body: Record<string, unknown>) {
  return {
    first_name:   body.firstName,
    last_name:    body.lastName,
    email:        body.email,
    phone:        body.phone,
    loyalty_tier: body.loyaltyTier ?? null,
  };
}

function toGuest(row: Record<string, unknown>) {
  return {
    id:          row.id,
    firstName:   row.first_name,
    lastName:    row.last_name,
    email:       row.email,
    phone:       row.phone,
    loyaltyTier: row.loyalty_tier ?? undefined,
    createdAt:   row.created_at,
  };
}

// GET /api/guests
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toGuest));
  } catch (err) {
    next(err);
  }
});

// GET /api/guests/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) { res.status(404).json({ error: 'Guest not found' }); return; }
    res.json(toGuest(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/guests
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .insert(toRow(req.body))
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toGuest(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/guests/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .update(toRow(req.body))
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) { res.status(404).json({ error: 'Guest not found' }); return; }
    res.json(toGuest(data));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/guests/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new Error(error.message);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
