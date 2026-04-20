import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function toStaff(row: Record<string, unknown>) {
  return {
    id:        row.id,
    firstName: row.first_name,
    lastName:  row.last_name,
    email:     row.email,
    role:      row.role,
    shift:     row.shift,
    isActive:  row.is_active,
  };
}

function toRow(body: Record<string, unknown>) {
  return {
    first_name: body.firstName,
    last_name:  body.lastName,
    email:      body.email,
    role:       body.role,
    shift:      body.shift,
    is_active:  body.isActive ?? true,
  };
}

// GET /api/staff
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .order('last_name');

    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toStaff));
  } catch (err) {
    next(err);
  }
});

// GET /api/staff/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) { res.status(404).json({ error: 'Staff member not found' }); return; }
    res.json(toStaff(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/staff
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .insert(toRow(req.body))
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toStaff(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/staff/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('staff_members')
      .update(toRow(req.body))
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) { res.status(404).json({ error: 'Staff member not found' }); return; }
    res.json(toStaff(data));
  } catch (err) {
    next(err);
  }
});

export default router;
