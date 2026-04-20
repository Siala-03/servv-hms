// In-memory conversation state per WhatsApp number.
// State expires after TTL_MS of inactivity.

const TTL_MS = 15 * 60 * 1000; // 15 minutes

export type ConvMode =
  | 'idle'
  | 'awaiting_order'
  | 'awaiting_maintenance'
  | 'booking_check_in'
  | 'booking_check_out'
  | 'booking_guests'
  | 'booking_pick_room'
  | 'booking_name'
  | 'booking_email'
  | 'booking_confirm';

export interface BookingData {
  checkIn?:    string;
  checkOut?:   string;
  adults?:     number;
  children?:   number;
  rooms?:      { id: string; roomType: string; roomNumber: string; baseRate: number; totalPrice: number }[];
  selectedRoom?: { id: string; roomType: string; roomNumber: string; totalPrice: number };
  name?:       string;
  email?:      string;
}

export interface ConvState {
  mode:           ConvMode;
  reservationId?: string;
  guestId?:       string;
  guestName?:     string;
  roomNumber?:    string;
  booking?:       BookingData;
  ts:             number;
}

const map = new Map<string, ConvState>();

export function getConvState(phone: string): ConvState {
  const s = map.get(phone);
  if (!s || Date.now() - s.ts > TTL_MS) return { mode: 'idle', ts: Date.now() };
  return s;
}

export function setConvState(phone: string, patch: Partial<ConvState>) {
  const existing = getConvState(phone);
  map.set(phone, { ...existing, ...patch, ts: Date.now() });
}

export function clearConvState(phone: string) {
  map.delete(phone);
}
