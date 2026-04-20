import { api } from '../lib/api';
import { Folio, FolioLineItem } from '../domain/models';

export async function getFolioByReservation(reservationId: string): Promise<Folio> {
  return api.get<Folio>(`/api/folios/by-reservation/${reservationId}`);
}

export async function createFolio(reservationId: string): Promise<Folio> {
  return api.post<Folio>('/api/folios', { reservationId });
}

export async function addLineItem(
  folioId: string,
  payload: Pick<FolioLineItem, 'description' | 'quantity' | 'unitPrice'>,
): Promise<FolioLineItem> {
  return api.post<FolioLineItem>(`/api/folios/${folioId}/line-items`, payload);
}

export async function closeFolio(folioId: string): Promise<Folio> {
  return api.patch<Folio>(`/api/folios/${folioId}/close`, {});
}
