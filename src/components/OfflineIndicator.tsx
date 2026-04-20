import React, { useCallback, useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueLength, syncOfflineQueue, QUEUE_CHANGED } from '../lib/api';

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

export function OfflineIndicator() {
  const isOnline          = useOnlineStatus();
  const [queueLen, setQueueLen] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  const refreshCount = useCallback(async () => {
    const n = await getQueueLength().catch(() => 0);
    setQueueLen(n);
  }, []);

  // Re-count whenever the queue changes
  useEffect(() => {
    refreshCount();
    window.addEventListener(QUEUE_CHANGED, refreshCount);
    return () => window.removeEventListener(QUEUE_CHANGED, refreshCount);
  }, [refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOnline || queueLen === 0) return;
    handleSync();
  }, [isOnline]); // eslint-disable-line

  async function handleSync() {
    setSyncState('syncing');
    try {
      const { synced, failed } = await syncOfflineQueue((remaining) => {
        setQueueLen(remaining);
      });
      setSyncState(synced > 0 || failed === 0 ? 'done' : 'error');
      await refreshCount();
    } catch {
      setSyncState('error');
    }
    // Reset to idle after 3 s
    setTimeout(() => setSyncState('idle'), 3000);
  }

  // Hidden when online and nothing pending and not just synced
  if (isOnline && queueLen === 0 && syncState === 'idle') return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-lg border text-sm font-medium transition-all duration-300
        ${!isOnline
          ? 'bg-slate-900 text-white border-slate-700'
          : syncState === 'syncing'
          ? 'bg-amber-50 text-amber-900 border-amber-200'
          : syncState === 'done'
          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
          : syncState === 'error'
          ? 'bg-red-50 text-red-900 border-red-200'
          : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}
    >
      {/* Icon */}
      {!isOnline ? (
        <WifiOff className="w-4 h-4 shrink-0" />
      ) : syncState === 'syncing' ? (
        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
      ) : syncState === 'done' ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
      ) : (
        <Wifi className="w-4 h-4 shrink-0 text-amber-600" />
      )}

      {/* Label */}
      <span>
        {!isOnline && queueLen === 0 && 'No connection — changes will sync when back online'}
        {!isOnline && queueLen > 0  && `Offline — ${queueLen} change${queueLen > 1 ? 's' : ''} pending sync`}
        {isOnline  && syncState === 'syncing' && `Syncing ${queueLen} pending change${queueLen > 1 ? 's' : ''}…`}
        {isOnline  && syncState === 'done'    && 'All changes saved ✓'}
        {isOnline  && syncState === 'error'   && 'Some changes failed to sync'}
        {isOnline  && syncState === 'idle' && queueLen > 0 && `${queueLen} change${queueLen > 1 ? 's' : ''} pending`}
      </span>

      {/* Manual sync button */}
      {isOnline && queueLen > 0 && syncState === 'idle' && (
        <button
          onClick={handleSync}
          className="ml-1 px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
        >
          Sync now
        </button>
      )}
    </div>
  );
}
