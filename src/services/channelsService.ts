import { api } from '../lib/api';
import { ChannelSyncResult } from '../domain/models';

export async function listChannels(): Promise<ChannelSyncResult[]> {
  return api.get<ChannelSyncResult[]>('/api/channels');
}

export async function listChannelHistory(): Promise<ChannelSyncResult[]> {
  return api.get<ChannelSyncResult[]>('/api/channels/history');
}

export async function recordSync(payload: Omit<ChannelSyncResult, 'id' | 'syncedAt'>): Promise<ChannelSyncResult> {
  return api.post<ChannelSyncResult>('/api/channels/sync', payload);
}
