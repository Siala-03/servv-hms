import { api } from '../lib/api';
import { HousekeepingTask, TaskStatus } from '../domain/models';

interface HousekeepingTaskWithJoins extends HousekeepingTask {
  room?:  { id: string; roomNumber: string; roomType: string; floor: number; status: string } | null;
  staff?: { id: string; firstName: string; lastName: string } | null;
}

export async function listHousekeepingTasks(status?: TaskStatus): Promise<HousekeepingTaskWithJoins[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return api.get<HousekeepingTaskWithJoins[]>(`/api/housekeeping${qs}`);
}

export async function createHousekeepingTask(
  payload: Omit<HousekeepingTask, 'id'>,
): Promise<HousekeepingTaskWithJoins> {
  return api.post<HousekeepingTaskWithJoins>('/api/housekeeping', payload);
}

export async function updateHousekeepingTask(
  id: string,
  payload: Partial<HousekeepingTask>,
): Promise<HousekeepingTaskWithJoins> {
  return api.put<HousekeepingTaskWithJoins>(`/api/housekeeping/${id}`, payload);
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<HousekeepingTaskWithJoins> {
  return api.patch<HousekeepingTaskWithJoins>(`/api/housekeeping/${id}/status`, { status });
}
