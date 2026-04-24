import { Router } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { supabase } from '../lib/supabase';

const router = Router();

type Severity = 'high' | 'medium' | 'low';
type Category = 'arrivals' | 'folio' | 'inventory' | 'housekeeping';

interface NotificationItem {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  message: string;
  count?: number;
  actionPath?: string;
  createdAt: string;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const now = new Date();
    const today = isoDate(now);
    const weekEnd = isoDate(addDays(now, 6));
    const hotelId = req.hotelId;

    const applyHotel = (query: any) => (hotelId ? query.eq('hotel_id', hotelId) : query);

    const [roomsResp, reservationsResp, tasksResp] = await Promise.all([
      supabase.from('rooms').select('id'),
      applyHotel(
        supabase
          .from('reservations')
          .select('id, status, check_in_date, check_out_date, room_id, guest_id, rooms(room_number), guests(first_name,last_name)')
          .not('status', 'in', '("Cancelled","Checked-out")')
          .lte('check_in_date', weekEnd)
          .gte('check_out_date', today),
      ),
      applyHotel(
        supabase
          .from('housekeeping_tasks')
          .select('id, priority, status')
          .eq('status', 'Open'),
      ),
    ]);

    const rooms = roomsResp.data ?? [];
    const reservations = reservationsResp.data ?? [];
    const tasks = tasksResp.data ?? [];

    const notifications: NotificationItem[] = [];

    // 1) Late arrivals risk (today arrivals still not checked-in)
    const lateArrivals = reservations.filter((r: any) =>
      r.check_in_date === today && ['Confirmed', 'Pending'].includes(String(r.status)),
    );

    if (lateArrivals.length > 0) {
      const severity: Severity = lateArrivals.length >= 6 ? 'high' : lateArrivals.length >= 3 ? 'medium' : 'low';
      notifications.push({
        id: 'late-arrivals',
        severity,
        category: 'arrivals',
        title: 'Late Arrival Risk',
        message: `${lateArrivals.length} expected arrival${lateArrivals.length !== 1 ? 's are' : ' is'} still not checked in for today.`,
        count: lateArrivals.length,
        actionPath: '/front-desk',
        createdAt: new Date().toISOString(),
      });
    }

    // 2) Unpaid folio risk (in-house guests due out today or earlier)
    const dueCheckouts = reservations.filter((r: any) =>
      String(r.status) === 'Checked-in' && String(r.check_out_date) <= today,
    );

    if (dueCheckouts.length > 0) {
      const dueIds = dueCheckouts.map((r: any) => r.id);
      const { data: folios } = await supabase
        .from('folios')
        .select('id, reservation_id, is_closed')
        .in('reservation_id', dueIds);

      const folioByRes = new Map((folios ?? []).map((f: any) => [f.reservation_id, f]));
      const atRisk = dueCheckouts.filter((r: any) => {
        const f = folioByRes.get(r.id);
        return !f || f.is_closed === false;
      });

      if (atRisk.length > 0) {
        notifications.push({
          id: 'unpaid-folio-risk',
          severity: atRisk.length >= 4 ? 'high' : 'medium',
          category: 'folio',
          title: 'Unsettled Folio Risk',
          message: `${atRisk.length} checked-in guest${atRisk.length !== 1 ? 's have' : ' has'} checkout due with open/unsettled folio status.`,
          count: atRisk.length,
          actionPath: '/front-desk',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3) Overbook risk (next 7 days)
    const totalRooms = rooms.length;
    if (totalRooms > 0) {
      const riskyDays: string[] = [];

      for (let i = 0; i <= 6; i++) {
        const d = isoDate(addDays(now, i));
        const inHouse = reservations.filter((r: any) => r.check_in_date <= d && r.check_out_date > d).length;
        if (inHouse > totalRooms) riskyDays.push(d);
      }

      if (riskyDays.length > 0) {
        notifications.push({
          id: 'overbook-risk',
          severity: 'high',
          category: 'inventory',
          title: 'Overbook Risk Detected',
          message: `${riskyDays.length} day${riskyDays.length !== 1 ? 's' : ''} in the next week exceed available room inventory.`,
          count: riskyDays.length,
          actionPath: '/reservations',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4) Housekeeping backlog
    if (tasks.length > 0) {
      const urgent = tasks.filter((t: any) => String(t.priority) === 'Urgent').length;
      const severity: Severity = urgent > 0 || tasks.length > 15 ? 'high' : tasks.length > 8 ? 'medium' : 'low';

      notifications.push({
        id: 'housekeeping-backlog',
        severity,
        category: 'housekeeping',
        title: 'Housekeeping Backlog',
        message: `${tasks.length} open housekeeping task${tasks.length !== 1 ? 's' : ''} (${urgent} urgent).`,
        count: tasks.length,
        actionPath: '/housekeeping',
        createdAt: new Date().toISOString(),
      });
    }

    const severityRank: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
    notifications.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

    res.json({
      summary: {
        total: notifications.length,
        high: notifications.filter((n) => n.severity === 'high').length,
        medium: notifications.filter((n) => n.severity === 'medium').length,
        low: notifications.filter((n) => n.severity === 'low').length,
      },
      items: notifications,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
