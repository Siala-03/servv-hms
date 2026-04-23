import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/authenticate';

const router = Router();

function resolveHotelId(req: AuthRequest, bodyHotelId?: unknown) {
  const tokenHotelId = req.hotelId ?? null;
  if (tokenHotelId) return tokenHotelId;
  const explicitHotelId = String(bodyHotelId ?? '').trim();
  return explicitHotelId || null;
}

function toRoom(row: Record<string, unknown>) {
  return {
    id:           row.id,
    roomNumber:   row.room_number,
    roomType:     row.room_type,
    floor:        row.floor,
    baseRate:     Number(row.base_rate),
    status:       row.status,
    maxOccupancy: row.max_occupancy,
  };
}

// POST /api/rooms
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const hotelId = resolveHotelId(req, body.hotelId);
    if (!hotelId) {
      res.status(400).json({ error: 'hotelId is required' });
      return;
    }

    if (!String(body.roomNumber ?? '').trim() || !String(body.roomType ?? '').trim()) {
      res.status(400).json({ error: 'roomNumber and roomType are required' });
      return;
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        hotel_id:      hotelId,
        room_number:   body.roomNumber,
        room_type:     body.roomType,
        floor:         body.floor ?? 1,
        base_rate:     body.baseRate ?? 0,
        status:        body.status ?? 'Available',
        max_occupancy: body.maxOccupancy ?? 2,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let query = supabase
      .from('rooms')
      .select('*')
      .order('floor')
      .order('room_number');

    if (req.hotelId) query = query.eq('hotel_id', req.hotelId);

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toRoom));
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let query = supabase
      .from('rooms')
      .select('*')
      .eq('id', req.params.id);

    if (req.hotelId) query = query.eq('hotel_id', req.hotelId);

    const { data, error } = await query.single();

    if (error) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/rooms/:id/status  – quick status update (front desk)
router.patch('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    let query = supabase
      .from('rooms')
      .update({ status })
      .eq('id', req.params.id);

    if (req.hotelId) query = query.eq('hotel_id', req.hotelId);

    const { data, error } = await query.select().single();

    if (error) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    let query = supabase
      .from('rooms')
      .update({
        room_number:   body.roomNumber,
        room_type:     body.roomType,
        floor:         body.floor,
        base_rate:     body.baseRate,
        status:        body.status,
        max_occupancy: body.maxOccupancy,
      })
      .eq('id', req.params.id);

    if (req.hotelId) query = query.eq('hotel_id', req.hotelId);

    const { data, error } = await query.select().single();

    if (error) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let query = supabase
      .from('rooms')
      .delete()
      .eq('id', req.params.id);

    if (req.hotelId) query = query.eq('hotel_id', req.hotelId);

    const { error } = await query;
    if (error) throw new Error(error.message);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
