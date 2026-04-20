import { api } from '../lib/api';
import { Reservation, ReservationStatus } from '../domain/models';
import { guestProfiles, reservationsSeed, rooms } from '../data/hmsSeed';

export interface ReservationListItem {
  id: string;
  guest: string;
  email: string;
  room: string;
  roomNo: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  channel: string;
  amount: string;
}

interface ApiReservation extends Reservation {
  guest?: { id: string; firstName: string; lastName: string; email: string } | null;
  room?:  { id: string; roomNumber: string; roomType: string } | null;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
const currFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function fmtDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

function toListItem(reservation: ApiReservation): ReservationListItem {
  return {
    id: reservation.id,
    guest: reservation.guest ? `${reservation.guest.firstName} ${reservation.guest.lastName}` : 'Unknown Guest',
    email: reservation.guest?.email ?? 'unknown@example.com',
    room: reservation.room?.roomType ?? 'Unknown Room',
    roomNo: reservation.room?.roomNumber ?? '-',
    checkIn: fmtDate(reservation.checkInDate),
    checkOut: fmtDate(reservation.checkOutDate),
    status: reservation.status,
    channel: reservation.channel,
    amount: currFmt.format(reservation.totalAmount),
  };
}

function listReservationItemsFromSeed(filters?: {
  status?: string;
  channel?: string;
}): ReservationListItem[] {
  const statusFilter = filters?.status;
  const channelFilter = filters?.channel;

  return reservationsSeed
    .filter((reservation) => (statusFilter ? reservation.status === statusFilter : true))
    .filter((reservation) => (channelFilter ? reservation.channel === channelFilter : true))
    .map((reservation) => {
      const guest = guestProfiles.find((profile) => profile.id === reservation.guestId);
      const room = rooms.find((roomRecord) => roomRecord.id === reservation.roomId);

      return {
        id: reservation.id,
        guest: guest ? `${guest.firstName} ${guest.lastName}` : 'Unknown Guest',
        email: guest?.email ?? 'unknown@example.com',
        room: room?.roomType ?? 'Unknown Room',
        roomNo: room?.roomNumber ?? '-',
        checkIn: fmtDate(reservation.checkInDate),
        checkOut: fmtDate(reservation.checkOutDate),
        status: reservation.status,
        channel: reservation.channel,
        amount: currFmt.format(reservation.totalAmount),
      };
    });
}

export async function listReservationItems(filters?: {
  status?: string;
  channel?: string;
}): Promise<ReservationListItem[]> {
  const params = new URLSearchParams();
  if (filters?.status)  params.set('status',  filters.status);
  if (filters?.channel) params.set('channel', filters.channel);

  const qs = params.toString();
  try {
    const data = await api.get<ApiReservation[]>(`/api/reservations${qs ? `?${qs}` : ''}`);
    return data.map(toListItem);
  } catch {
    return listReservationItemsFromSeed(filters);
  }
}

export async function getReservation(id: string): Promise<ApiReservation> {
  return api.get<ApiReservation>(`/api/reservations/${id}`);
}

export async function createReservation(payload: Partial<Reservation>): Promise<ApiReservation> {
  return api.post<ApiReservation>('/api/reservations', payload);
}

export async function updateReservationStatus(id: string, status: ReservationStatus): Promise<ApiReservation> {
  return api.patch<ApiReservation>(`/api/reservations/${id}/status`, { status });
}

export function listReservationStatuses(): ReservationStatus[] {
  return ['Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled'];
}

export async function listReservationChannels(): Promise<string[]> {
  try {
    const data = await api.get<ApiReservation[]>('/api/reservations');
    const channels = new Set(data.map((reservation) => reservation.channel));
    return Array.from(channels).sort((left, right) => left.localeCompare(right));
  } catch {
    const channels = new Set(reservationsSeed.map((reservation) => reservation.channel));
    return Array.from(channels).sort((left, right) => left.localeCompare(right));
  }
}
