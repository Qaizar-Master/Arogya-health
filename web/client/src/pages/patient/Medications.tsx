/**
 * Patient — Medications page
 * View active medications, log adherence, add new medications.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pill, Check, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { Medication } from "../../types";
import { adherenceColor } from "../../lib/utils";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addMedSchema = z.object({
  name: z.string().min(1, "Name required"),
  genericName: z.string().optional(),
  dosage: z.string().min(1, "Dosage required"),
  frequency: z.string().min(1, "Frequency required"),
  route: z.string().default("oral"),
  startDate: z.string().min(1, "Start date required"),
  prescribedBy: z.string().optional(),
  notes: z.string().optional(),
});

type AddMedForm = z.infer<typeof addMedSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAdherence(med: Medication): number | null {
  const logs = med.adherenceLogs ?? [];
  const done = logs.filter((l) => l.status !== "PENDING");
  if (done.length === 0) return null;
  const taken = done.filter((l) => l.status === "TAKEN");
  return Math.round((taken.length / done.length) * 100);
}

// ─── Medication card ──────────────────────────────────────────────────────────

function MedCard({ med, onRefresh }: { med: Medication; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const logMutation = useMutation({
    mutationFn: (status: "TAKEN" | "MISSED" | "SKIPPED") =>
      api.post(`/medications/${med.id}/adherence`, {
        scheduledAt: new Date().toISOString(),
        takenAt: status === "TAKEN" ? new Date().toISOString() : undefined,
        status,
      }),
    onSuccess: (_data, status) => {
      toast.success(
        status === "TAKEN"
          ? `Marked dose of ${med.name} as taken`
          : `Dose logged as ${status.toLowerCase()}`
      );
      onRefresh();
    },
    onError: () => toast.error("Failed to log dose"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.put(`/medications/${med.id}`, { active: false }),
    onSuccess: () => {
      toast.success(`${med.name} deactivated`);
      onRefresh();
    },
    onError: () => toast.error("Failed to deactivate medication"),
  });

  const adherence = calcAdherence(med);
  const recentLogs = (med.adherenceLogs ?? []).slice(0, 7);

  return (
    <Card className={med.active ? "" : "opacity-60"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Pill className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900">{med.name}</p>
                {med.genericName && (
                  <span className="text-xs text-slate-400">({med.genericName})</span>
                )}
                <Badge variant={med.active ? "success" : "secondary"}>
                  {med.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                {med.dosage} · {med.frequency} · {med.route}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Since {format(new Date(med.startDate), "dd MMM yyyy")}
                {med.prescribedBy && ` · ${med.prescribedBy}`}
              </p>
            </div>
          </div>

          {/* Adherence % */}
          {adherence !== null && (
            <div className="text-right flex-shrink-0">
              <p className={`text-lg font-bold ${adherenceColor(adherence)}`}>{adherence}%</p>
              <p className="text-[10px] text-slate-400">adherence</p>
            </div>
          )}
        </div>

        {/* Log dose buttons — active only */}
        {med.active && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 mr-1">Log today's dose:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => logMutation.mutate("TAKEN")}
              loading={logMutation.isPending}
            >
              <Check className="w-3 h-3" /> Taken
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => logMutation.mutate("MISSED")}
              loading={logMutation.isPending}
            >
              <X className="w-3 h-3" /> Missed
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={() => logMutation.mutate("SKIPPED")}
              loading={logMutation.isPending}
            >
              <Clock className="w-3 h-3" /> Skip
            </Button>
            <div className="flex-1" />
            <button
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              onClick={() => setExpanded((v) => !v)}
            >
              History
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Recent logs */}
        {expanded && recentLogs.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-slate-500 mb-2">Recent doses</p>
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {format(new Date(log.scheduledAt), "dd MMM, h:mm a")}
                </span>
                <Badge
                  variant={
                    log.status === "TAKEN"
                      ? "success"
                      : log.status === "MISSED"
                      ? "danger"
                      : log.status === "SKIPPED"
                      ? "warning"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {log.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Deactivate */}
        {med.active && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
            <button
              className="text-xs text-slate-400 hover:text-red-600 transition-colors"
              onClick={() => deactivateMutation.mutate()}
            >
              Deactivate medication
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add medication form ──────────────────────────────────────────────────────

function AddMedForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddMedForm>({ resolver: zodResolver(addMedSchema) });

  const onSubmit = async (data: AddMedForm) => {
    try {
      await api.post("/medications", {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
      });
      toast.success(`${data.name} added`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to add medication");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add new medication</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Drug name *</Label>
              <Input id="name" placeholder="e.g. Metformin" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="genericName">Generic name</Label>
              <Input id="genericName" placeholder="e.g. metformin hydrochloride" {...register("genericName")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dosage">Dosage *</Label>
              <Input id="dosage" placeholder="e.g. 500mg" {...register("dosage")} />
              {errors.dosage && <p className="text-xs text-red-600">{errors.dosage.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="frequency">Frequency *</Label>
              <Input id="frequency" placeholder="e.g. twice daily" {...register("frequency")} />
              {errors.frequency && <p className="text-xs text-red-600">{errors.frequency.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="route">Route</Label>
              <select
                id="route"
                {...register("route")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="oral">Oral</option>
                <option value="subcutaneous">Subcutaneous</option>
                <option value="intravenous">Intravenous</option>
                <option value="topical">Topical</option>
                <option value="inhaled">Inhaled</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Start date *</Label>
              <Input
                id="startDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                {...register("startDate")}
              />
              {errors.startDate && <p className="text-xs text-red-600">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <Label htmlFor="prescribedBy">Prescribed by</Label>
              <Input id="prescribedBy" placeholder="Doctor's name" {...register("prescribedBy")} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={isSubmitting}>Add medication</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MedicationsPage() {
  const [showAll, setShowAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: medications, isLoading } = useQuery({
    queryKey: ["medications-me", showAll],
    queryFn: () =>
      api
        .get<Medication[]>(`/medications/me${showAll ? "" : "?active=true"}`)
        .then((r) => r.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["medications-me"] });

  const activeMeds = (medications ?? []).filter((m) => m.active);
  const inactiveMeds = (medications ?? []).filter((m) => !m.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medications</h1>
          <p className="text-slate-500 text-sm mt-1">Track your prescriptions and daily adherence</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show inactive
          </label>
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-2" />
            Add medication
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddMedForm onClose={() => setShowAddForm(false)} onSuccess={refresh} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Active medications */}
      {!isLoading && activeMeds.length === 0 && !showAll && (
        <Card>
          <CardContent className="py-16 text-center">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No active medications on record</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add medication" to add your first prescription</p>
          </CardContent>
        </Card>
      )}

      {activeMeds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active · {activeMeds.length}
          </p>
          {activeMeds.map((med) => (
            <MedCard key={med.id} med={med} onRefresh={refresh} />
          ))}
        </div>
      )}

      {/* Inactive medications */}
      {showAll && inactiveMeds.length > 0 && (
        <div className="space-y-3 mt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Inactive · {inactiveMeds.length}
          </p>
          {inactiveMeds.map((med) => (
            <MedCard key={med.id} med={med} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
