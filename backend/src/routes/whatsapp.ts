import { Router } from 'express';
import {
  sendBookingConfirmation,
  sendCheckinWelcome,
  sendCheckoutSummary,
  sendOrderReceived,
  sendOrderDelivered,
  sendTaskAssigned,
} from '../services/whatsapp';

const router = Router();

const TEST_PHONE = process.env.WHATSAPP_TEST_PHONE ?? '+250783809328';

// POST /api/whatsapp/test?type=booking|checkin|checkout|order|delivered|task
router.post('/test', async (req, res) => {
  const type = (req.query.type as string) ?? 'booking';

  switch (type) {
    case 'booking':
      await sendBookingConfirmation({
        phone:     TEST_PHONE,
        guestName: 'Test Guest',
        bookingId: 'BK-TEST-001',
        roomNo:    '304',
        roomType:  'Deluxe Suite',
        checkIn:   '2026-04-21',
        checkOut:  '2026-04-24',
        adults:    2,
        children:  0,
        amount:    '$450.00',
      });
      break;

    case 'checkin':
      await sendCheckinWelcome({
        phone:     TEST_PHONE,
        guestName: 'Test Guest',
        roomNo:    '304',
        roomType:  'Deluxe Suite',
        checkOut:  '2026-04-24',
      });
      break;

    case 'checkout':
      await sendCheckoutSummary({
        phone:     TEST_PHONE,
        guestName: 'Test Guest',
        roomNo:    '304',
        total:     '$450.00',
      });
      break;

    case 'order':
      await sendOrderReceived({
        phone:      TEST_PHONE,
        guestName:  'Test Guest',
        roomNo:     '304',
        department: 'Room Service',
        items:      ['Grilled Chicken', 'Fries', 'Coke'],
        amount:     35.00,
      });
      break;

    case 'delivered':
      await sendOrderDelivered({
        phone:      TEST_PHONE,
        guestName:  'Test Guest',
        department: 'Room Service',
      });
      break;

    case 'task':
      await sendTaskAssigned({
        phone:     TEST_PHONE,
        staffName: 'Test Staff',
        roomNo:    '304',
        roomType:  'Deluxe Suite',
        priority:  'High',
        dueAt:     '2026-04-21 10:00',
        notes:     'Guest requested extra towels.',
      });
      break;

    default:
      res.status(400).json({ error: `Unknown type "${type}". Use: booking, checkin, checkout, order, delivered, task` });
      return;
  }

  res.json({ ok: true, type, sentTo: TEST_PHONE });
});

export default router;
