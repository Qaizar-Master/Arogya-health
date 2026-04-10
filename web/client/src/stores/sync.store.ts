/**
 * Sync status store — tracks the offline vitals queue state.
 * Displayed in the global header as "N readings pending sync".
 */

import { create } from "zustand";

interface SyncState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;

  setPendingCount: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncSuccess: (timestamp: Date) => void;
  setSyncError: (err: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncing: (isSyncing) => set({ isSyncing, syncError: null }),
  setSyncSuccess: (timestamp) =>
    set({ isSyncing: false, lastSyncedAt: timestamp, pendingCount: 0, syncError: null }),
  setSyncError: (syncError) => set({ isSyncing: false, syncError }),
}));
