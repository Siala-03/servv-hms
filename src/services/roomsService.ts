import { api } from '../lib/api';
import { Room, RoomStatus } from '../domain/models';

export async function listRooms(): Promise<Room[]> {
  return api.get<Room[]>('/api/rooms');
}

export async function createRoom(payload: Partial<Room> & { hotelId?: string }): Promise<Room> {
  return api.post<Room>('/api/rooms', payload);
}

export async function createRoomsBulk(payload: {
  floor: number;
  startNumber: number;
  endNumber: number;
  padTo?: number;
  prefix?: string;
  roomType: string;
  baseRate?: number;
  status?: RoomStatus;
  maxOccupancy?: number;
}): Promise<{ created: number; rooms: Room[] }> {
  return api.post<{ created: number; rooms: Room[] }>('/api/rooms/bulk', payload);
}

export async function getRoom(id: string): Promise<Room> {
  return api.get<Room>(`/api/rooms/${id}`);
}

export async function updateRoomStatus(id: string, status: RoomStatus): Promise<Room> {
  return api.patch<Room>(`/api/rooms/${id}/status`, { status });
}

export async function updateRoom(id: string, payload: Partial<Room>): Promise<Room> {
  return api.put<Room>(`/api/rooms/${id}`, payload);
}

export async function deleteRoom(id: string): Promise<void> {
  return api.delete<void>(`/api/rooms/${id}`);
}
