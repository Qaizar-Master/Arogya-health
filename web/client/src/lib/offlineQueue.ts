/**
 * Offline vitals queue — IndexedDB via `idb`.
 *
 * When the patient logs a vital while offline (or before network confirms),
 * the reading is stored here first (optimistic). On reconnect, the sync
 * manager flushes all pending entries to POST /api/vitals/batch.
 */

import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "arogya-offline";
const STORE_NAME = "pending-vitals";
const DB_VERSION = 1;

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface PendingVital {
  localId: string;          // UUID generated client-side
  profileId: string;
  recordedAt: string;       // ISO string
  bloodGlucose?: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  weight?: number;
  spo2?: number;
  temperature?: number;
  hba1c?: number;
  creatinine?: number;
  egfr?: number;
  cholesterol?: number;
  notes?: string;
  queuedAt: string;         // when it was added to the queue
  synced: boolean;
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "localId" });
          store.createIndex("synced", "synced");
          store.createIndex("profileId", "profileId");
        }
      },
    });
  }
  return dbPromise;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Adds a vital reading to the local queue. */
export async function enqueueVital(vital: Omit<PendingVital, "queuedAt" | "synced">): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, {
    ...vital,
    queuedAt: new Date().toISOString(),
    synced: false,
  });
}

/** Returns all un-synced pending vitals. */
export async function getPendingVitals(): Promise<PendingVital[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter((v) => !v.synced);
}

/** Marks a set of vitals as synced (by localId). */
export async function markSynced(localIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all(
    localIds.map(async (id) => {
      const item = await tx.store.get(id);
      if (item) await tx.store.put({ ...item, synced: true });
    })
  );
  await tx.done;
}

/** Removes synced vitals older than 7 days (housekeeping). */
export async function pruneOldSynced(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await Promise.all(
    all
      .filter((v) => v.synced && v.queuedAt < cutoff)
      .map((v) => tx.store.delete(v.localId))
  );
  await tx.done;
}

/** Total count of pending (un-synced) vitals. */
export async function pendingCount(): Promise<number> {
  const pending = await getPendingVitals();
  return pending.length;
}
