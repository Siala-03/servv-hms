/**
 * WhatsApp Business Cloud API (Meta Graph API v18)
 *
 * Setup:
 *  1. Create a Meta App at developers.facebook.com
 *  2. Add "WhatsApp" product → get a test phone number
 *  3. Copy the temporary access token + phone number ID to .env
 *  4. Add recipient numbers in the "Test recipients" list for sandbox testing
 *
 * For production: submit message templates for approval in Meta Business Manager.
 * Until templates are approved, text messages work for numbers that have
 * messaged your business number first (sandbox flow).
 */

import 'dotenv/config';

const GRAPH_URL  = 'https://graph.facebook.com/v18.0';
const PHONE_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN      = process.env.WHATSAPP_TOKEN;
const HOTEL_NAME = process.env.HOTEL_NAME ?? 'SERVV Hotel';

// ── Normalise phone to E.164 digits only (no +) ─────────────────────────────
function e164(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

// ── Core send function ───────────────────────────────────────────────────────
export async function sendText(to: string, body: string): Promise<void> {
  return send(to, body);
}

async function send(to: string, body: string): Promise<void> {
  if (!PHONE_ID || !TOKEN) {
    console.warn('[WhatsApp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN not set — skipping.');
    return;
  }

  const number = e164(to);
  if (number.length < 7) {
    console.warn(`[WhatsApp] Invalid phone number "${to}" — skipping.`);
    return;
  }

  try {
    const res = await fetch(`${GRAPH_URL}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:     number,
        type:   'text',
        text:   { body, preview_url: false },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[WhatsApp] Send failed:', JSON.stringify(err));
    } else {
      console.log(`[WhatsApp] ✓ Sent to ${number}`);
    }
  } catch (err) {
    // Network errors must never break the main operation
    console.error('[WhatsApp] Network error:', err);
  }
}

// ── Message builders ─────────────────────────────────────────────────────────

export function sendBookingConfirmation(params: {
  phone:       string;
  guestName:   string;
  bookingId:   string;
  roomNo:      string;
  roomType:    string;
  checkIn:     string;
  checkOut:    string;
  adults:      number;
  children:    number;
  amount:      string;
  checkinUrl?: string;
}): Promise<void> {
  const childLine = params.children > 0 ? `, ${params.children} child(ren)` : '';
  const lines = [
    `🏨 *${HOTEL_NAME}*`,
    '',
    `Hi ${params.guestName}! Your booking is confirmed ✅`,
    '',
    `📋 *${params.bookingId}*`,
    `🛏 Room ${params.roomNo} — ${params.roomType}`,
    `📅 Check-in:  ${params.checkIn}`,
    `📅 Check-out: ${params.checkOut}`,
    `👥 ${params.adults} adult(s)${childLine}`,
    `💵 Total: ${params.amount}`,
  ];

  if (params.checkinUrl) {
    lines.push('', `📲 *Pre-register online (saves time at arrival):*`, params.checkinUrl);
  }

  lines.push('', 'Reply to this message for assistance anytime.');
  return send(params.phone, lines.join('\n'));
}

export function sendCheckinLink(params: {
  phone:      string;
  guestName:  string;
  bookingId:  string;
  roomNo:     string;
  checkIn:    string;
  checkinUrl: string;
}): Promise<void> {
  const body = [
    `🏨 *${HOTEL_NAME}*`,
    '',
    `Hi ${params.guestName}! Your check-in is tomorrow 🎉`,
    '',
    `🛏 Room *${params.roomNo}*  |  📅 ${params.checkIn}`,
    '',
    '📲 *Complete online pre-registration now to skip the queue:*',
    params.checkinUrl,
    '',
    'Takes 30 seconds — just your ID number.',
  ].join('\n');

  return send(params.phone, body);
}

export function sendCheckinWelcome(params: {
  phone:     string;
  guestName: string;
  roomNo:    string;
  roomType:  string;
  checkOut:  string;
}): Promise<void> {
  const body = [
    `🏨 *${HOTEL_NAME}*`,
    '',
    `Welcome, ${params.guestName}! 🎉`,
    '',
    `You've been checked in to *Room ${params.roomNo}* (${params.roomType}).`,
    `Check-out is on ${params.checkOut}.`,
    '',
    '🔑 Your room key is ready at the front desk.',
    '',
    'Need anything? Just reply to this message!',
  ].join('\n');

  return send(params.phone, body);
}

export function sendCheckoutSummary(params: {
  phone:     string;
  guestName: string;
  roomNo:    string;
  total:     string;
}): Promise<void> {
  const body = [
    `🏨 *${HOTEL_NAME}*`,
    '',
    `Hi ${params.guestName}, thank you for staying with us! 🙏`,
    '',
    `Your stay in *Room ${params.roomNo}* has ended.`,
    '',
    `💵 *Total Bill: ${params.total}*`,
    '',
    'We hope to see you again soon! ⭐',
    'Reply REVIEW to leave us feedback.',
  ].join('\n');

  return send(params.phone, body);
}

export function sendOrderReceived(params: {
  phone:      string;
  guestName:  string;
  roomNo:     string;
  department: string;
  items:      string[];
  amount:     number;
}): Promise<void> {
  const itemList = params.items.map((i) => `  • ${i}`).join('\n');
  const body = [
    `🏨 *${HOTEL_NAME}*`,
    '',
    `Hi ${params.guestName}! Your ${params.department} order has been received 🍽️`,
    '',
    'Order:',
    itemList,
    '',
    `💵 Total: $${params.amount.toFixed(2)}`,
    '',
    'Estimated time: 20–30 minutes.',
  ].join('\n');

  return send(params.phone, body);
}

export function sendOrderDelivered(params: {
  phone:      string;
  guestName:  string;
  department: string;
}): Promise<void> {
  const body = [
    `🏨 *${HOTEL_NAME}*`,
    '',
    `Hi ${params.guestName}! Your ${params.department} order has been delivered ✅`,
    '',
    'Enjoy! Reply if you need anything else.',
  ].join('\n');

  return send(params.phone, body);
}

export function sendTaskAssigned(params: {
  phone:     string;
  staffName: string;
  roomNo:    string;
  roomType:  string;
  priority:  string;
  dueAt?:    string;
  notes?:    string;
}): Promise<void> {
  const lines = [
    `🏨 *${HOTEL_NAME} — Staff Alert*`,
    '',
    `Hi ${params.staffName}! A housekeeping task has been assigned to you:`,
    '',
    `🛏 *Room ${params.roomNo}* — ${params.roomType}`,
    `⚡ Priority: ${params.priority}`,
  ];

  if (params.dueAt) lines.push(`⏰ Due: ${params.dueAt}`);
  if (params.notes) lines.push(`📝 ${params.notes}`);

  lines.push('', 'Reply *DONE* to mark as complete.');

  return send(params.phone, lines.join('\n'));
}
