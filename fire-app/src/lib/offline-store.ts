/**
 * IndexedDB-based offline data store for FireManager
 *
 * Stores pending operations (GPS tracks, drops, checklist completions)
 * when the device is offline. Syncs to Supabase when connectivity returns.
 */

const DB_NAME = "firemanager-offline";
const DB_VERSION = 1;

// Store names
const PENDING_OPS = "pending_operations";
const GPS_TRACKS = "gps_tracks";
const CACHED_DATA = "cached_data";

export interface PendingOperation {
  id: string;
  type: "gps_track" | "incendiary_drop" | "checklist" | "burn_execution" | "inventory";
  data: unknown;
  createdAt: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending operations queue
      if (!db.objectStoreNames.contains(PENDING_OPS)) {
        const store = db.createObjectStore(PENDING_OPS, { keyPath: "id" });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }

      // GPS tracks (large data, separate store)
      if (!db.objectStoreNames.contains(GPS_TRACKS)) {
        const store = db.createObjectStore(GPS_TRACKS, { keyPath: "id" });
        store.createIndex("startedAt", "startedAt", { unique: false });
      }

      // General cached data (project boundaries, burn plans, etc.)
      if (!db.objectStoreNames.contains(CACHED_DATA)) {
        db.createObjectStore(CACHED_DATA, { keyPath: "key" });
      }
    };
  });
}

/** Queue a pending operation for later sync */
export async function queueOperation(
  type: PendingOperation["type"],
  data: unknown
): Promise<string> {
  const db = await openDB();
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const op: PendingOperation = {
    id,
    type,
    data,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_OPS, "readwrite");
    tx.objectStore(PENDING_OPS).add(op);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all unsynced operations */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_OPS, "readonly");
    const store = tx.objectStore(PENDING_OPS);
    const request = store.getAll();
    request.onsuccess = () => {
      resolve((request.result as PendingOperation[]).filter((op) => !op.synced));
    };
    request.onerror = () => reject(request.error);
  });
}

/** Mark an operation as synced */
export async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_OPS, "readwrite");
    const store = tx.objectStore(PENDING_OPS);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const op = getReq.result;
      if (op) {
        op.synced = true;
        store.put(op);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Save a GPS track to IndexedDB */
export async function saveGpsTrack(track: {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string;
  points: Array<{ lat: number; lng: number; altitude: number | null; accuracy: number; timestamp: number }>;
  distanceKm: number;
}): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GPS_TRACKS, "readwrite");
    tx.objectStore(GPS_TRACKS).put(track);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all saved GPS tracks */
export async function getGpsTracks(): Promise<unknown[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GPS_TRACKS, "readonly");
    const request = tx.objectStore(GPS_TRACKS).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Cache arbitrary data (e.g., project boundaries for offline use) */
export async function cacheData(
  key: string,
  data: unknown
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA, "readwrite");
    tx.objectStore(CACHED_DATA).put({ key, data, cachedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve cached data */
export async function getCachedData<T = unknown>(
  key: string
): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHED_DATA, "readonly");
    const request = tx.objectStore(CACHED_DATA).get(key);
    request.onsuccess = () => {
      resolve(request.result ? (request.result.data as T) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Clear all synced operations (cleanup) */
export async function clearSyncedOperations(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_OPS, "readwrite");
    const store = tx.objectStore(PENDING_OPS);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const op = cursor.value as PendingOperation;
        if (op.synced) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
