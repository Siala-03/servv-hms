// In-memory conversation state per WhatsApp number.
// State expires after TTL_MS of inactivity.

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export type ConvMode = 'idle' | 'awaiting_order' | 'awaiting_maintenance';

export interface ConvState {
  mode:           ConvMode;
  reservationId?: string;
  guestId?:       string;
  guestName?:     string;
  roomNumber?:    string;
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
