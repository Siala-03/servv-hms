import { api } from '../lib/api';
import { GuestProfile } from '../domain/models';

export async function listGuests(): Promise<GuestProfile[]> {
  return api.get<GuestProfile[]>('/api/guests');
}

export async function getGuest(id: string): Promise<GuestProfile> {
  return api.get<GuestProfile>(`/api/guests/${id}`);
}

export async function createGuest(payload: Omit<GuestProfile, 'id' | 'createdAt'>): Promise<GuestProfile> {
  return api.post<GuestProfile>('/api/guests', payload);
}

export async function updateGuest(id: string, payload: Partial<GuestProfile>): Promise<GuestProfile> {
  return api.put<GuestProfile>(`/api/guests/${id}`, payload);
}

export async function deleteGuest(id: string): Promise<void> {
  return api.delete<void>(`/api/guests/${id}`);
}
