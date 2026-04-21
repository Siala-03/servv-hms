// Generates the HTML booking ticket — used for email and PDF

export interface TicketData {
  bookingId:       string;
  guestName:       string;
  email:           string;
  phone:           string;
  roomNumber:      string;
  roomType:        string;
  floor:           number | string;
  ratePlan:        string;
  mealPlan?:       string;
  checkIn:         string;
  checkOut:        string;
  adults:          number;
  children?:       number;
  totalAmount:     string;
  currency:        string;
  checkinUrl:      string;
  hotelName:       string;
  hotelAddress?:   string;
  hotelPhone?:     string;
  hotelEmail?:     string;
  specialRequests?: string;
  notes?:          string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000);
}

export function buildTicketHtml(d: TicketData): string {
  const n     = nights(d.checkIn, d.checkOut);
  const child = (d.children ?? 0) > 0 ? ` · ${d.children} child(ren)` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Booking Confirmation — ${d.bookingId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f4f0; color: #1a1a1a; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }

  /* Header */
  .header { background: #141414; padding: 32px 36px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .brand { color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.5; }
  .hotel-name { color: #fff; font-size: 20px; font-weight: 700; text-align: right; }
  .ticket-title { color: #d97706; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 6px; }
  .booking-id { color: #fff; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
  .status-badge { display: inline-block; background: #d97706; color: #000; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; margin-top: 8px; }

  /* Dates strip */
  .dates { display: flex; background: #1e1e1e; }
  .date-box { flex: 1; padding: 20px 24px; text-align: center; }
  .date-box + .date-box { border-left: 1px solid rgba(255,255,255,0.08); }
  .date-label { color: #d97706; font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 6px; }
  .date-value { color: #fff; font-size: 17px; font-weight: 700; }
  .date-sub { color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 3px; }
  .nights-box { flex: 0 0 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px solid rgba(255,255,255,0.08); }
  .nights-num { color: #fff; font-size: 28px; font-weight: 800; line-height: 1; }
  .nights-label { color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }

  /* Body */
  .body { padding: 28px 36px; }

  /* Two-col grid */
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .field label { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #9ca3af; display: block; margin-bottom: 4px; }
  .field span { font-size: 14px; font-weight: 600; color: #111; }

  /* Divider */
  .divider { border: none; border-top: 1px solid #f0ede8; margin: 20px 0; }

  /* Guest box */
  .guest-box { background: #fafaf8; border: 1px solid #ede9e3; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
  .guest-name { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .guest-contact { font-size: 12px; color: #6b7280; }

  /* Total */
  .total-row { display: flex; justify-content: space-between; align-items: center; background: #141414; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .total-label { color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .total-amount { color: #fff; font-size: 22px; font-weight: 800; }

  /* CTA */
  .cta { text-align: center; margin-bottom: 24px; }
  .cta p { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
  .cta a { display: inline-block; background: #d97706; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.02em; }

  /* Hotel info */
  .hotel-info { background: #fafaf8; border: 1px solid #ede9e3; border-radius: 8px; padding: 16px 20px; font-size: 12px; color: #6b7280; line-height: 1.8; }
  .hotel-info strong { color: #374151; font-weight: 600; }

  /* Footer */
  .footer { background: #f5f4f0; padding: 16px 36px; text-align: center; font-size: 10px; color: #9ca3af; letter-spacing: 0.05em; }
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="header">
    <div class="header-top">
      <div class="brand">Powered by SERVV HMS</div>
      <div class="hotel-name">${d.hotelName}</div>
    </div>
    <div class="ticket-title">Booking Confirmation</div>
    <div class="booking-id">${d.bookingId}</div>
    <div class="status-badge">✓ Confirmed</div>
  </div>

  <!-- Dates -->
  <div class="dates">
    <div class="date-box">
      <div class="date-label">Check-in</div>
      <div class="date-value">${fmtDate(d.checkIn)}</div>
      <div class="date-sub">From 14:00</div>
    </div>
    <div class="nights-box">
      <div class="nights-num">${n}</div>
      <div class="nights-label">Night${n !== 1 ? 's' : ''}</div>
    </div>
    <div class="date-box">
      <div class="date-label">Check-out</div>
      <div class="date-value">${fmtDate(d.checkOut)}</div>
      <div class="date-sub">By 11:00</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Guest -->
    <div class="guest-box">
      <div class="guest-name">${d.guestName}</div>
      <div class="guest-contact">${d.email} &nbsp;·&nbsp; ${d.phone}</div>
    </div>

    <!-- Room details grid -->
    <div class="grid">
      <div class="field">
        <label>Room</label>
        <span>Room ${d.roomNumber}</span>
      </div>
      <div class="field">
        <label>Room Type</label>
        <span>${d.roomType}</span>
      </div>
      <div class="field">
        <label>Floor</label>
        <span>${d.floor}</span>
      </div>
      <div class="field">
        <label>Rate Plan</label>
        <span>${d.ratePlan}</span>
      </div>
      ${d.mealPlan ? `<div class="field"><label>Meal Plan</label><span>${d.mealPlan}</span></div>` : ''}
      <div class="field">
        <label>Guests</label>
        <span>${d.adults} Adult${d.adults !== 1 ? 's' : ''}${child}</span>
      </div>
    </div>

    ${(d.specialRequests || d.notes) ? `
    <div class="guest-box" style="margin-bottom:20px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Special Requests / Notes</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;">${d.specialRequests || d.notes}</div>
    </div>` : ''}

    <hr class="divider" />

    <!-- Total -->
    <div class="total-row">
      <div class="total-label">Total Amount</div>
      <div class="total-amount">${d.currency} ${d.totalAmount}</div>
    </div>

    <!-- CTA -->
    <div class="cta">
      <p>Skip the queue — complete your online pre-registration before arrival</p>
      <a href="${d.checkinUrl}">Complete Pre-Check-In →</a>
    </div>

    <hr class="divider" />

    <!-- Hotel info -->
    <div class="hotel-info">
      <strong>${d.hotelName}</strong><br />
      ${d.hotelAddress ? `📍 ${d.hotelAddress}<br />` : ''}
      ${d.hotelPhone   ? `📞 ${d.hotelPhone}<br />`   : ''}
      ${d.hotelEmail   ? `✉️ ${d.hotelEmail}`          : ''}
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    This is an automated booking confirmation from SERVV HMS. Please keep this for your records.
  </div>

</div>
</body>
</html>`;
}

// Plain-text version for WhatsApp
export function buildTicketText(d: TicketData): string {
  const n     = nights(d.checkIn, d.checkOut);
  const child = (d.children ?? 0) > 0 ? `, ${d.children} child(ren)` : '';
  const lines = [
    `🏨 *${d.hotelName}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *BOOKING CONFIRMATION*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Ref: *${d.bookingId}*`,
    `Status: ✅ Confirmed`,
    ``,
    `👤 *Guest*`,
    `${d.guestName}`,
    ``,
    `📅 *Check-in:*  ${fmtDate(d.checkIn)}`,
    `📅 *Check-out:* ${fmtDate(d.checkOut)}`,
    `🌙 Duration: *${n} night${n !== 1 ? 's' : ''}*`,
    ``,
    `🛏 *Room ${d.roomNumber}* — ${d.roomType}`,
    `🏢 Floor ${d.floor}`,
    `🍽 ${d.ratePlan}${d.mealPlan ? ` (${d.mealPlan})` : ''}`,
    `👥 ${d.adults} adult${d.adults !== 1 ? 's' : ''}${child}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💵 *TOTAL: ${d.currency} ${d.totalAmount}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📲 *Complete pre-registration (skip queue):*`,
    `${d.checkinUrl}`,
    ``,
    `_Reply to this message for assistance._`,
  ];
  if (d.specialRequests || d.notes) {
    lines.push(``, `📝 *Special Requests:* ${d.specialRequests || d.notes}`);
  }
  if (d.hotelPhone)   lines.push(``, `📞 ${d.hotelPhone}`);
  if (d.hotelAddress) lines.push(`📍 ${d.hotelAddress}`);
  return lines.join('\n');
}
