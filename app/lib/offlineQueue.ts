/**
 * Offline sync queue
 * When Supabase is unreachable, failed match syncs are stored here
 * and retried when connectivity returns.
 */

export interface QueuedSync {
  id: string;          // match_id — used for deduplication
  type: 'cricket' | 'golf' | 'x01';
  data: any;           // Full match data passed to the sync function
  queuedAt: string;    // ISO timestamp for debugging
}

const QUEUE_KEY = 'swamp-darts:sync-queue';

export function addToSyncQueue(type: QueuedSync['type'], matchId: string, data: any): void {
  try {
    const queue = getSyncQueue();
    if (queue.find(q => q.id === matchId)) return; // already queued — dedup
    queue.push({ id: matchId, type, data, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[offlineQueue] Queued ${type} match for later sync:`, matchId);
  } catch (_) {}
}

export function getSyncQueue(): QueuedSync[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removeFromSyncQueue(matchId: string): void {
  try {
    const queue = getSyncQueue().filter(q => q.id !== matchId);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

export function getSyncQueueLength(): number {
  return getSyncQueue().length;
}
