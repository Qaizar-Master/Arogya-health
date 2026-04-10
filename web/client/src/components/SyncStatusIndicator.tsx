/**
 * Sync status badge shown in the patient portal header.
 * Shows: "N readings pending sync" or "Synced" or a spinner when syncing.
 */

import { Loader2, WifiOff, CheckCircle2 } from "lucide-react";
import { useSyncStore } from "../stores/sync.store";
import { cn } from "../lib/utils";

export function SyncStatusIndicator() {
  const { pendingCount, isSyncing, lastSyncedAt, syncError } = useSyncStore();

  if (syncError) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
        <WifiOff className="w-3 h-3" />
        <span>Sync failed</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Syncing…</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
        <WifiOff className="w-3 h-3" />
        <span>{pendingCount} reading{pendingCount > 1 ? "s" : ""} pending sync</span>
      </div>
    );
  }

  if (lastSyncedAt) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full")}>
        <CheckCircle2 className="w-3 h-3" />
        <span>Synced</span>
      </div>
    );
  }

  return null;
}
