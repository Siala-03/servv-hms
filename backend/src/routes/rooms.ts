import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

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
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        hotel_id:      body.hotelId,
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
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('floor')
      .order('room_number');

    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toRoom));
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/rooms/:id/status  – quick status update (front desk)
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const { data, error } = await supabase
      .from('rooms')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('rooms')
      .update({
        room_number:   body.roomNumber,
        room_type:     body.roomType,
        floor:         body.floor,
        base_rate:     body.baseRate,
        status:        body.status,
        max_occupancy: body.maxOccupancy,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(toRoom(data));
  } catch (err) {
    next(err);
  }
});

export default router;
