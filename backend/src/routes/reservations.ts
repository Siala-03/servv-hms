import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';
import {
  sendBookingConfirmation,
  sendCheckinWelcome,
  sendCheckoutSummary,
  sendText,
} from '../services/whatsapp';
import { sendBookingTicketEmail } from '../services/email';
import { buildTicketText, TicketData } from '../services/ticket';

const currFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const router = Router();

// Full reservation row with joined guest + room + rate_plan
function toReservation(row: Record<string, unknown>) {
  const g = row.guests as Record<string, unknown> | null;
  const rm = row.rooms as Record<string, unknown> | null;
  const rp = row.rate_plans as Record<string, unknown> | null;

  return {
    id:           row.id,
    guestId:      row.guest_id,
    roomId:       row.room_id,
    ratePlanId:   row.rate_plan_id,
    channel:      row.channel,
    status:       row.status,
    checkInDate:  row.check_in_date,
    checkOutDate: row.check_out_date,
    adults:       row.adults,
    children:     row.children,
    totalAmount:  Number(row.total_amount),
    currency:     row.currency,
    createdAt:    row.created_at,
    // Denormalized joins (convenient for list views)
    guest: g ? {
      id:        g.id,
      firstName: g.first_name,
      lastName:  g.last_name,
      email:     g.email,
      phone:     g.phone,
    } : null,
    room: rm ? {
      id:         rm.id,
      roomNumber: rm.room_number,
      roomType:   rm.room_type,
      floor:      rm.floor,
      hotelId:    rm.hotel_id,
    } : null,
    ratePlan: rp ? {
      id:       rp.id,
      code:     rp.code,
      name:     rp.name,
      mealPlan: rp.meal_plan,
    } : null,
  };
}

const JOIN_QUERY = `
  *,
  guests     ( id, first_name, last_name, email, phone ),
  rooms      ( id, room_number, room_type, floor, hotel_id ),
  rate_plans ( id, code, name, meal_plan )
`;

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// GET /api/reservations?status=&channel=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = supabase.from('reservations').select(JOIN_QUERY);

    if (req.query.status) {
      query = query.eq('status', req.query.status as string);
    }
    if (req.query.channel) {
      query = query.eq('channel', req.query.channel as string);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json((data ?? []).map(toReservation));
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(JOIN_QUERY)
      .eq('id', req.params.id)
      .single();

    if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
    res.json(toReservation(data));
  } catch (err) {
    next(err);
  }
});

// POST /api/reservations
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        guest_id:      b.guestId,
        room_id:       b.roomId,
        rate_plan_id:  b.ratePlanId,
        channel:       b.channel,
        status:        b.status ?? 'Pending',
        check_in_date: b.checkInDate,
        check_out_date: b.checkOutDate,
        adults:        b.adults ?? 1,
        children:      b.children ?? 0,
        total_amount:  b.totalAmount ?? 0,
        currency:      b.currency ?? 'USD',
      })
      .select(JOIN_QUERY)
      .single();

    if (error) throw new Error(error.message);
    const r = toReservation(data);

    // Fire-and-forget: email + WhatsApp ticket
    const g  = r.guest as Record<string, unknown> | null;
    const rm = r.room  as Record<string, unknown> | null;
    if (g) {
      const phone      = String(g.phone ?? '');
      const guestName  = `${g.firstName} ${g.lastName}`;
      const checkinUrl = `${FRONTEND_URL}/checkin/${r.id}`;
      const amount     = currFmt.format(Number(r.totalAmount));

      // Fetch hotel info for ticket
      const hotelId = rm ? String((rm as any).hotelId ?? '') : '';
      const hotelQuery = hotelId
        ? supabase.from('hotel_accounts').select('name,address,phone,email').eq('id', hotelId).single()
        : supabase.from('hotel_accounts').select('name,address,phone,email').limit(1).single();

      Promise.resolve(hotelQuery).then(({ data: hotel }) => {
        const h = hotel as Record<string, unknown> | null;
        const rp = r.ratePlan as Record<string, unknown> | null;
        const ticketData: TicketData = {
          bookingId:    String(r.id),
          guestName,
          email:        String(g.email ?? ''),
          phone,
          roomNumber:   rm ? String(rm.roomNumber) : '',
          roomType:     rm ? String(rm.roomType)   : '',
          floor:        rm ? String((rm as any).floor ?? '') : '',
          ratePlan:     rp ? String(rp.name ?? 'Standard') : 'Standard',
          mealPlan:     rp ? String(rp.mealPlan ?? '') : '',
          checkIn:      String(r.checkInDate),
          checkOut:     String(r.checkOutDate),
          adults:       Number(r.adults),
          children:     Number(r.children),
          totalAmount:  amount,
          currency:     String(r.currency ?? 'USD'),
          checkinUrl,
          hotelName:    h ? String(h.name) : (process.env.HOTEL_NAME ?? 'SERVV Hotel'),
          hotelAddress: h ? String(h.address ?? '') : '',
          hotelPhone:   h ? String(h.phone ?? '')   : '',
          hotelEmail:   h ? String(h.email ?? '')   : '',
        };

        // Email ticket
        sendBookingTicketEmail(ticketData).catch(() => {});

        // WhatsApp: text ticket + confirmation
        if (phone.length > 5) {
          sendText(phone, buildTicketText(ticketData)).catch(() => {});
        }
      }).catch(() => {});
    }

    res.status(201).json(r);
  } catch (err) {
    next(err);
  }
});

// PUT /api/reservations/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const b = req.body as Record<string, unknown>;
    const { data, error } = await supabase
      .from('reservations')
      .update({
        guest_id:      b.guestId,
        room_id:       b.roomId,
        rate_plan_id:  b.ratePlanId,
        channel:       b.channel,
        status:        b.status,
        check_in_date: b.checkInDate,
        check_out_date: b.checkOutDate,
        adults:        b.adults,
        children:      b.children,
        total_amount:  b.totalAmount,
        currency:      b.currency,
      })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
    res.json(toReservation(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reservations/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', req.params.id)
      .select(JOIN_QUERY)
      .single();

    if (error) { res.status(404).json({ error: 'Reservation not found' }); return; }
    const r = toReservation(data);

    // WhatsApp on check-in / check-out
    const g  = r.guest as Record<string, unknown> | null;
    const rm = r.room  as Record<string, unknown> | null;
    if (g && rm) {
      const guestName = `${g.firstName} ${g.lastName}`;
      const phone     = String(g.phone ?? '');

      if (status === 'Checked-in') {
        sendCheckinWelcome({
          phone, guestName,
          roomNo:   String(rm.roomNumber),
          roomType: String(rm.roomType),
          checkOut: String(r.checkOutDate),
        }).catch(() => {});
      } else if (status === 'Checked-out') {
        const folioQuery = supabase
          .from('folio_line_items')
          .select('unit_price, quantity, folios!inner(reservation_id)')
          .eq('folios.reservation_id', req.params.id);

        Promise.resolve(folioQuery).then(({ data: lines }) => {
          const total = (lines ?? []).reduce(
            (sum, l) => sum + Number((l as Record<string,unknown>).unit_price) * Number((l as Record<string,unknown>).quantity),
            0,
          );
          sendCheckoutSummary({
            phone, guestName,
            roomNo: String(rm.roomNumber),
            total:  currFmt.format(total),
          }).catch(() => {});
        }).catch(() => {});
      }
    }

    res.json(r);
  } catch (err) {
    next(err);
  }
});

export default router;
