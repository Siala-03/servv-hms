/**
 * Offline mutation queue backed by IndexedDB.
 *
 * When the device is offline (or the backend is unreachable), API mutations
 * (POST / PUT / PATCH / DELETE) are serialised here instead of being dropped.
 * When connectivity is restored the queue is drained in order.
 */

const DB_NAME    = 'servv_offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

export interface QueuedMutation {
  id:          string;   // crypto.randomUUID()
  url:         string;   // full path, e.g. '/api/reservations'
  method:      string;   // POST | PUT | PATCH | DELETE
  body:        unknown;  // JSON-serialisable body
  label:       string;   // human-readable, shown in UI
  enqueuedAt:  number;   // Date.now()
}

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function enqueue(mutation: Omit<QueuedMutation, 'id' | 'enqueuedAt'>): Promise<void> {
  const db = await openDB();
  const record: QueuedMutation = {
    ...mutation,
    id:         crypto.randomUUID(),
    enqueuedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').add(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Drain queue when back online ─────────────────────────────────────────────

type SyncProgressCallback = (remaining: number) => void;

export async function drainQueue(
  baseUrl: string,
  onProgress?: SyncProgressCallback,
): Promise<{ synced: number; failed: number }> {
  const items = await getQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(`${baseUrl}${item.url}`, {
        method:  item.method,
        headers: { 'Content-Type': 'application/json' },
        body:    item.body ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok || res.status === 404) {
        // 404 means the record was deleted elsewhere — consider it handled
        await removeFromQueue(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    const remaining = (await getQueue()).length;
    onProgress?.(remaining);
  }

  return { synced, failed };
}
