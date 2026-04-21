import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { sendTaskAssigned } from '../services/whatsapp';

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
    const task = toTask(data);

    // Notify assigned staff member via WhatsApp
    const st = task.staff as Record<string, unknown> | null;
    const rm = task.room  as Record<string, unknown> | null;
    if (st && b.assignedStaffId) {
      // Fetch staff phone from staff_members table
      const staffQuery = supabase
        .from('staff_members')
        .select('phone, email')
        .eq('id', String(b.assignedStaffId))
        .single();

      Promise.resolve(staffQuery).then(({ data: staffRow }) => {
        const sr    = staffRow as Record<string, unknown> | null;
        const phone = String(sr?.phone ?? sr?.email ?? '');
        sendTaskAssigned({
          phone,
          staffName: `${st.firstName} ${st.lastName}`,
          roomNo:    rm ? String(rm.roomNumber) : String(b.roomId),
          roomType:  rm ? String(rm.roomType)   : '',
          priority:  String(b.priority ?? 'Normal'),
          dueAt:     b.dueAt ? String(b.dueAt) : undefined,
          notes:     b.notes ? String(b.notes) : undefined,
        }).catch(() => {});
      }).catch(() => {});
    }

    res.status(201).json(task);
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
    const task = toTask(data);

    // Notify staff if assignment changed
    const st = task.staff as Record<string, unknown> | null;
    const rm = task.room  as Record<string, unknown> | null;
    if (st && b.assignedStaffId) {
      Promise.resolve(
        supabase
          .from('staff_members')
          .select('phone')
          .eq('id', String(b.assignedStaffId))
          .single()
      ).then(({ data: staffRow }) => {
        const phone = String((staffRow as Record<string, unknown> | null)?.phone ?? '');
        if (phone.length > 5) {
          sendTaskAssigned({
            phone,
            staffName: `${st.firstName} ${st.lastName}`,
            roomNo:    rm ? String(rm.roomNumber) : '',
            roomType:  rm ? String(rm.roomType)   : '',
            priority:  String(b.priority ?? task.priority ?? 'Normal'),
            dueAt:     b.dueAt ? String(b.dueAt) : undefined,
            notes:     String(b.notes ?? task.notes ?? '') || undefined,
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    res.json(task);
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
