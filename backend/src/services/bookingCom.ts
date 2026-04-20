import { HttpError } from '../lib/errors';

interface BookingComRoomSync {
  roomType: string;
  totalRooms: number;
  availableRooms: number;
  baseRate: number;
}

interface BookingComSyncPayload {
  hotelId: string;
  requestedAt: string;
  rooms: BookingComRoomSync[];
}

interface BookingComSyncResult {
  inventoryUpdated: number;
  ratesUpdated: number;
  statusText?: string;
}

function getAuthHeader(): string {
  const token = process.env.BOOKING_COM_TOKEN?.trim();
  if (token) return `Bearer ${token}`;

  const username = process.env.BOOKING_COM_USERNAME?.trim();
  const password = process.env.BOOKING_COM_PASSWORD?.trim();

  if (!username || !password) {
    throw new HttpError(
      500,
      'Booking.com credentials are missing. Set BOOKING_COM_TOKEN or BOOKING_COM_USERNAME + BOOKING_COM_PASSWORD.',
    );
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getSyncUrl(): string {
  const syncUrl = process.env.BOOKING_COM_SYNC_URL?.trim();
  if (!syncUrl) {
    throw new HttpError(500, 'BOOKING_COM_SYNC_URL is required for live Booking.com sync.');
  }
  return syncUrl;
}

export function getBookingComHotelId(): string {
  const hotelId = process.env.BOOKING_COM_HOTEL_ID?.trim();
  if (!hotelId) {
    throw new HttpError(500, 'BOOKING_COM_HOTEL_ID is required for live Booking.com sync.');
  }
  return hotelId;
}

export async function syncBookingCom(payload: BookingComSyncPayload): Promise<BookingComSyncResult> {
  const auth = getAuthHeader();
  const syncUrl = getSyncUrl();

  const response = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      'User-Agent': 'SERVV-HMS/1.0 (+https://servv.co)',
    },
    body: JSON.stringify(payload),
  });

  const responseText = (await response.text()).trim();

  if (!response.ok) {
    throw new HttpError(
      response.status,
      `Booking.com sync failed (${response.status}): ${responseText.slice(0, 220)}`,
    );
  }

  return {
    inventoryUpdated: payload.rooms.reduce((sum, room) => sum + room.availableRooms, 0),
    ratesUpdated: payload.rooms.length,
    statusText: responseText.slice(0, 220) || 'OK',
  };
}

export type { BookingComRoomSync, BookingComSyncPayload, BookingComSyncResult };
