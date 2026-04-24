import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/authenticate';

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
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;

    if (!String(body.roomNumber ?? '').trim() || !String(body.roomType ?? '').trim()) {
      res.status(400).json({ error: 'roomNumber and roomType are required' });
      return;
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
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

// POST /api/rooms/bulk
router.post('/bulk', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;

    const floor = Number(body.floor ?? 1);
    const start = Number(body.startNumber);
    const end = Number(body.endNumber);
    const padTo = Number(body.padTo ?? 0);
    const prefix = String(body.prefix ?? '').trim();
    const roomType = String(body.roomType ?? '').trim();
    const baseRate = Number(body.baseRate ?? 0);
    const maxOccupancy = Number(body.maxOccupancy ?? 2);
    const status = String(body.status ?? 'Available');

    if (!roomType) {
      res.status(400).json({ error: 'roomType is required' });
      return;
    }

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0 || end < start) {
      res.status(400).json({ error: 'startNumber and endNumber must be valid integers, with endNumber >= startNumber' });
      return;
    }

    const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const roomRows = numbers.map((n) => {
      const num = padTo > 0 ? String(n).padStart(padTo, '0') : String(n);
      return {
        room_number: `${prefix}${num}`,
        room_type: roomType,
        floor,
        base_rate: baseRate,
        status,
        max_occupancy: maxOccupancy,
      };
    });

    const { data, error } = await supabase
      .from('rooms')
      .insert(roomRows)
      .select();

    if (error) throw new Error(error.message);

    res.status(201).json({
      created: data?.length ?? 0,
      rooms: (data ?? []).map(toRoom),
    });
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

    const { error } = await query;
    if (error) throw new Error(error.message);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
