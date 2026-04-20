import { api } from '../lib/api';
import { Room, RoomStatus } from '../domain/models';

export async function listRooms(): Promise<Room[]> {
  return api.get<Room[]>('/api/rooms');
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
