import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { getBookingComHotelId, syncBookingCom } from '../services/bookingCom';

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

async function insertChannelSyncResult(payload: {
  channel: string;
  inventoryUpdated: number;
  ratesUpdated: number;
  status: string;
  errorMessage?: string;
}) {
  const { data, error } = await supabase
    .from('channel_sync_results')
    .insert({
      channel: payload.channel,
      inventory_updated: payload.inventoryUpdated,
      rates_updated: payload.ratesUpdated,
      status: payload.status,
      error_message: payload.errorMessage ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toChannel(data);
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
    const record = await insertChannelSyncResult({
      channel: String(b.channel ?? 'Unknown'),
      inventoryUpdated: Number(b.inventoryUpdated ?? 0),
      ratesUpdated: Number(b.ratesUpdated ?? 0),
      status: String(b.status ?? 'Connected'),
      errorMessage: b.errorMessage ? String(b.errorMessage) : undefined,
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/channels/booking-com/sync – live Booking.com sync
router.post('/booking-com/sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = getBookingComHotelId();

    const { data: roomRows, error } = await supabase
      .from('rooms')
      .select('room_type, status, base_rate');

    if (error) throw new Error(error.message);

    const aggregated = new Map<string, { totalRooms: number; availableRooms: number; baseRate: number }>();
    for (const room of roomRows ?? []) {
      const key = String(room.room_type);
      const existing = aggregated.get(key) ?? { totalRooms: 0, availableRooms: 0, baseRate: Number(room.base_rate ?? 0) };

      existing.totalRooms += 1;
      if (room.status === 'Available') existing.availableRooms += 1;
      if (!existing.baseRate) existing.baseRate = Number(room.base_rate ?? 0);

      aggregated.set(key, existing);
    }

    const payload = {
      hotelId,
      requestedAt: new Date().toISOString(),
      rooms: Array.from(aggregated.entries()).map(([roomType, stats]) => ({
        roomType,
        totalRooms: stats.totalRooms,
        availableRooms: stats.availableRooms,
        baseRate: stats.baseRate,
      })),
    };

    try {
      const result = await syncBookingCom(payload);
      const record = await insertChannelSyncResult({
        channel: 'Booking.com',
        inventoryUpdated: result.inventoryUpdated,
        ratesUpdated: result.ratesUpdated,
        status: 'Connected',
        errorMessage: result.statusText,
      });

      res.status(201).json(record);
    } catch (syncErr) {
      const message = syncErr instanceof Error ? syncErr.message : 'Booking.com sync failed';
      const record = await insertChannelSyncResult({
        channel: 'Booking.com',
        inventoryUpdated: 0,
        ratesUpdated: 0,
        status: 'Disconnected',
        errorMessage: message,
      });

      res.status(502).json({
        ...record,
        error: message,
      });
    }
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
