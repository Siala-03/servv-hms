import { api } from '../lib/api';
import { StaffMember } from '../domain/models';

export async function listStaff(): Promise<StaffMember[]> {
  return api.get<StaffMember[]>('/api/staff');
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  return api.get<StaffMember>(`/api/staff/${id}`);
}

export async function createStaffMember(payload: Omit<StaffMember, 'id'>): Promise<StaffMember> {
  return api.post<StaffMember>('/api/staff', payload);
}

export async function updateStaffMember(id: string, payload: Partial<StaffMember>): Promise<StaffMember> {
  return api.put<StaffMember>(`/api/staff/${id}`, payload);
}
