import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

const JOIN_QUERY = `
  *,
  rooms        ( id, room_number, room_type, floor, status ),
  staff_members ( id, first_name, last_name )
`;

function toTask(row: Record<string, unknown>) {
  const rm = row.rooms as Record<string, unknown> | null;
  const st = row.staff_members as Record<string, unknown> | null;

  return {
    id:              row.id,
    roomId:          row.room_id,
    assignedStaffId: row.assigned_staff_id,
    priority:        row.priority,
    status:          row.status,
    dueAt:           row.due_at,
    notes:           row.notes ?? undefined,
    room: rm ? {
      id:         rm.id,
      roomNumber: rm.room_number,
      roomType:   rm.room_type,
      floor:      rm.floor,
      status:     rm.status,
    } : null,
    staff: st ? {
      id:        st.id,
      firstName: st.first_name,
      lastName:  st.last_name,
    } : null,
  };
}

// GET /api/housekeeping?status=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('housekeeping_tasks').select(JOIN_QUERY);
    if (req.query.status) query = query.eq('status', req.query.status as string);

    const { data, error } = await query.order('due_at', { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toTask));
  } catch (err) {
    next(err);
  }
});

// POST /api/housekeeping
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .insert({
        room_id:           b.roomId,
        assigned_staff_id: b.assignedStaffId ?? null,
        priority:          b.priority ?? 'Normal',
        status:            b.status ?? 'Open',
        due_at:            b.dueAt ?? null,
        notes:             b.notes ?? null,
      })
      .select(JOIN_QUERY)
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json(toTask(data));
  } catch (err) {
    next(err);
  }
});

// PUT /api/housekeeping/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .update({
        room_id:           b.roomId,
        assigned_staff_id: b.assignedStaffId ?? null,
        priority:          b.priority,
        status:            b.status,
        due_at:            b.dueAt ?? null,
        notes:             b.notes ?? null,
      })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json(toTask(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/housekeeping/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .update({ status })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json(toTask(data));
  } catch (err) {
    next(err);
  }
});

export default router;
