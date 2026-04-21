import { Resend } from 'resend';
import { buildTicketHtml, TicketData, buildCheckoutReceiptHtml, CheckoutReceiptData } from './ticket';

const resend     = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'bookings@servv.co';
const HOTEL_NAME = process.env.HOTEL_NAME ?? 'SERVV Hotel';

export async function sendBookingTicketEmail(data: TicketData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email.');
    return;
  }
  if (!data.email?.includes('@')) {
    console.warn('[Email] Invalid guest email — skipping.');
    return;
  }

  try {
    const html = buildTicketHtml(data);
    await resend.emails.send({
      from:    `${data.hotelName ?? HOTEL_NAME} <${FROM_EMAIL}>`,
      to:      data.email,
      subject: `Booking Confirmed — ${data.bookingId} | ${data.hotelName ?? HOTEL_NAME}`,
      html,
    });
    console.log(`[Email] ✓ Ticket sent to ${data.email}`);
  } catch (err) {
    console.error('[Email] Send failed:', err);
  }
}

export async function sendCheckoutReceiptEmail(data: CheckoutReceiptData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping checkout receipt.');
    return;
  }
  if (!data.email?.includes('@')) {
    console.warn('[Email] Invalid guest email — skipping checkout receipt.');
    return;
  }

  try {
    const html = buildCheckoutReceiptHtml(data);
    await resend.emails.send({
      from:    `${data.hotelName ?? HOTEL_NAME} <${FROM_EMAIL}>`,
      to:      data.email,
      subject: `Checkout Receipt — ${data.bookingId} | ${data.hotelName ?? HOTEL_NAME}`,
      html,
    });
    console.log(`[Email] ✓ Checkout receipt sent to ${data.email}`);
  } catch (err) {
    console.error('[Email] Checkout receipt send failed:', err);
  }
}
