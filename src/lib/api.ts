// Thin fetch wrapper with offline-queue fallback for mutations.

const BASE = (import.meta as Record<string, unknown> & { env: Record<string, string> }).env
  .VITE_API_URL ?? 'http://localhost:4000';

// Lazy-imported so the queue module is only loaded in the browser
let queueModule: typeof import('./offlineQueue') | null = null;
async function getQueue() {
  if (!queueModule) queueModule = await import('./offlineQueue');
  return queueModule;
}

// ── Custom events so components can react to queue changes ──────────────────
export const QUEUE_CHANGED = 'servv:queue-changed';
function emitQueueChanged() {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED));
}

// ── Core request ─────────────────────────────────────────────────────────────
async function request<T>(
  path: string,
  init?: RequestInit,
  queueLabel?: string,  // if set, queue the mutation when offline
): Promise<T> {
  const url = `${BASE}${path}`;

  // For write operations, fall back to offline queue if no network
  const isMutation = init?.method && init.method !== 'GET';
  if (isMutation && !navigator.onLine) {
    const q = await getQueue();
    await q.enqueue({
      url:    path,
      method: init!.method!,
      body:   init?.body ? JSON.parse(init.body as string) : undefined,
      label:  queueLabel ?? `${init!.method} ${path}`,
    });
    emitQueueChanged();
    // Return a sentinel so callers know it was queued
    return { __queued: true } as unknown as T;
  }

  const userId = localStorage.getItem('servv_user_id');
  const authHeader: Record<string, string> = userId ? { 'x-user-id': userId } : {};

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path),

  post: <T>(path: string, body: unknown, label?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, label),

  put: <T>(path: string, body: unknown, label?: string) =>
    request<T>(path, { method: 'PUT',  body: JSON.stringify(body) }, label),

  patch: <T>(path: string, body: unknown, label?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, label),

  delete: <T>(path: string, label?: string) =>
    request<T>(path, { method: 'DELETE' }, label),
};

// ── Sync queue when coming back online ────────────────────────────────────────
export async function syncOfflineQueue(
  onProgress?: (remaining: number) => void,
): Promise<{ synced: number; failed: number }> {
  const q = await getQueue();
  const result = await q.drainQueue(BASE, onProgress);
  emitQueueChanged();
  return result;
}

export async function getQueueLength(): Promise<number> {
  const q = await getQueue();
  const items = await q.getQueue();
  return items.length;
}
