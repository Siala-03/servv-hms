import { Resend } from 'resend';
import { buildTicketHtml, TicketData } from './ticket';

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
