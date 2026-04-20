import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function toRatePlan(row: Record<string, unknown>) {
  return {
    id:                 row.id,
    code:               row.code,
    name:               row.name,
    cancellationPolicy: row.cancellation_policy,
    mealPlan:           row.meal_plan,
    isActive:           row.is_active,
  };
}

function toRow(body: Record<string, unknown>) {
  return {
    code:                body.code,
    name:                body.name,
    cancellation_policy: body.cancellationPolicy,
    meal_plan:           body.mealPlan,
    is_active:           body.isActive ?? true,
  };
}

// GET /api/rate-plans
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('rate_plans')
      .select('*')
      .order('code');

    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toRatePlan));
  } catch (err) {
    next(err);
  }
});

// POST /api/rate-plans
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('rate_plans')
      .insert(toRow(req.body))
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toRatePlan(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/rate-plans/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('rate_plans')
      .update(toRow(req.body))
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) { res.status(404).json({ error: 'Rate plan not found' }); return; }
    res.json(toRatePlan(data));
  } catch (err) {
    next(err);
  }
});

export default router;
