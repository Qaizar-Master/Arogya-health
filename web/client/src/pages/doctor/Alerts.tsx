/**
 * Doctor — Alerts page
 * All unread alerts from assigned patients. Filter by severity, mark as read.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { Alert, AlertSeverity } from "../../types";
import { SEVERITY_BADGE } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PanelAlert extends Alert {
  profile?: { firstName: string; lastName: string };
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SEVERITIES: Array<AlertSeverity | "ALL"> = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function DoctorAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "ALL">("ALL");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["doctor-panel-alerts"],
    queryFn: () => api.get<PanelAlert[]>("/alerts/panel").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (alertId: string) => api.put(`/alerts/${alertId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-panel-alerts"] });
    },
    onError: () => toast.error("Failed to mark alert as read"),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async (alertIds: string[]) => {
      await Promise.all(alertIds.map((id) => api.put(`/alerts/${id}/read`)));
    },
    onSuccess: () => {
      toast.success("All alerts marked as read");
      queryClient.invalidateQueries({ queryKey: ["doctor-panel-alerts"] });
    },
    onError: () => toast.error("Failed to mark alerts as read"),
  });

  const filtered = (alerts ?? []).filter(
    (a) => severityFilter === "ALL" || a.severity === severityFilter
  );

  const counts: Record<string, number> = { ALL: alerts?.length ?? 0 };
  (alerts ?? []).forEach((a) => {
    counts[a.severity] = (counts[a.severity] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Alerts</h1>
          <p className="text-slate-500 text-sm mt-1">
            {alerts ? `${alerts.length} unread alert${alerts.length !== 1 ? "s" : ""} across your patients` : "Loading…"}
          </p>
        </div>
        {(alerts?.length ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate((alerts ?? []).map((a) => a.id))}
            loading={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Severity filters */}
      <div className="flex gap-2 flex-wrap">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              severityFilter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s === "ALL" ? `All (${counts.ALL})` : `${s} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {severityFilter !== "ALL"
                ? `No ${severityFilter} alerts`
                : "No unread alerts — all clear!"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alert list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200"
            >
              {/* Severity badge */}
              <Badge
                className={`${SEVERITY_BADGE[alert.severity as AlertSeverity]} flex-shrink-0 mt-0.5`}
              >
                {alert.severity}
              </Badge>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {alert.profile && (
                  <button
                    className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1 mb-1"
                    onClick={() => navigate(`/doctor/patients/${alert.profileId}`)}
                  >
                    {alert.profile.firstName} {alert.profile.lastName}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                <p className="text-sm text-slate-700">{alert.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </p>
              </div>

              {/* Mark read */}
              <button
                className="text-xs text-slate-400 hover:text-brand-600 flex-shrink-0 mt-0.5"
                onClick={() => markReadMutation.mutate(alert.id)}
                aria-label="Mark as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
