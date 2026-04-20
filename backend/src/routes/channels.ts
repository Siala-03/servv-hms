import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function toChannel(row: Record<string, unknown>) {
  return {
    id:                row.id,
    channel:           row.channel,
    inventoryUpdated:  row.inventory_updated,
    ratesUpdated:      row.rates_updated,
    status:            row.status,
    syncedAt:          row.synced_at,
    errorMessage:      row.error_message ?? undefined,
  };
}

// GET /api/channels  – latest sync result per channel
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('channel_sync_results')
      .select('*')
      .order('synced_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Keep only the most recent record per channel
    const seen = new Set<string>();
    const latest = (data ?? []).filter((row) => {
      if (seen.has(row.channel)) return false;
      seen.add(row.channel);
      return true;
    });

    res.json(latest.map(toChannel));
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/history – full sync log
router.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('channel_sync_results')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toChannel));
  } catch (err) {
    next(err);
  }
});

// POST /api/channels/sync  – record a sync result (called by channel integration jobs)
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('channel_sync_results')
      .insert({
        channel:            b.channel,
        inventory_updated:  b.inventoryUpdated ?? 0,
        rates_updated:      b.ratesUpdated ?? 0,
        status:             b.status ?? 'Connected',
        error_message:      b.errorMessage ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toChannel(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/channels/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, errorMessage } = req.body as { status: string; errorMessage?: string };
    const { data, error } = await supabase
      .from('channel_sync_results')
      .update({ status, error_message: errorMessage ?? null })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) { res.status(404).json({ error: 'Channel record not found' }); return; }
    res.json(toChannel(data));
  } catch (err) {
    next(err);
  }
});

export default router;
