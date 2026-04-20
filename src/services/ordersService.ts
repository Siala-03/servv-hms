import { api } from '../lib/api';
import { ServiceOrder, OrderStatus } from '../domain/models';

interface ServiceOrderWithJoins extends ServiceOrder {
  guest?:      { id: string; firstName: string; lastName: string } | null;
  roomNumber?: string | null;
}

export async function listOrders(filters?: {
  status?: OrderStatus;
  department?: string;
}): Promise<ServiceOrderWithJoins[]> {
  const params = new URLSearchParams();
  if (filters?.status)     params.set('status',     filters.status);
  if (filters?.department) params.set('department', filters.department);
  const qs = params.toString();
  return api.get<ServiceOrderWithJoins[]>(`/api/orders${qs ? `?${qs}` : ''}`);
}

export async function createOrder(
  payload: Omit<ServiceOrder, 'id' | 'requestedAt'>,
): Promise<ServiceOrderWithJoins> {
  return api.post<ServiceOrderWithJoins>('/api/orders', payload);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<ServiceOrderWithJoins> {
  return api.patch<ServiceOrderWithJoins>(`/api/orders/${id}/status`, { status });
}

export async function updateOrder(id: string, payload: Partial<ServiceOrder>): Promise<ServiceOrderWithJoins> {
  return api.put<ServiceOrderWithJoins>(`/api/orders/${id}`, payload);
}
