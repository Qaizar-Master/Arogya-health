/**
 * Patient Vitals page — log vitals (offline-capable) + time-series charts.
 * Vitals are saved to IndexedDB first, then synced to server.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceArea,
} from "recharts";
import { format } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import {
  enqueueVital, getPendingVitals, markSynced, pendingCount as getPendingCount,
} from "../../lib/offlineQueue";
import { useSyncStore } from "../../stores/sync.store";
import { VitalLog } from "../../types";
import { VITAL_RANGES, isVitalOutOfRange } from "../../lib/utils";

// ─── Zod schema for the log form ──────────────────────────────────────────────

const vitalSchema = z.object({
  bloodGlucose: z.coerce.number().positive().optional().or(z.literal("")),
  systolicBP: z.coerce.number().int().positive().optional().or(z.literal("")),
  diastolicBP: z.coerce.number().int().positive().optional().or(z.literal("")),
  heartRate: z.coerce.number().int().positive().optional().or(z.literal("")),
  weight: z.coerce.number().positive().optional().or(z.literal("")),
  spo2: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")),
  temperature: z.coerce.number().optional().or(z.literal("")),
  hba1c: z.coerce.number().min(0).max(20).optional().or(z.literal("")),
  creatinine: z.coerce.number().positive().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
}).refine((d) => {
  const vals = Object.values(d).filter((v) => v !== "" && v !== undefined);
  return vals.length > 1; // at least one vital field (notes excluded)
}, { message: "Log at least one vital value" });

type VitalForm = z.infer<typeof vitalSchema>;

// ─── Recharts custom dot — green if in range, red if out ─────────────────────

function VitalDot(props: {
  cx?: number; cy?: number; value?: number; field: string;
}) {
  const { cx = 0, cy = 0, value, field } = props;
  if (value === undefined) return null;
  const out = isVitalOutOfRange(field, value);
  return <circle cx={cx} cy={cy} r={4} fill={out ? "#E24B4A" : "#0F6E56"} stroke="white" strokeWidth={1.5} />;
}

// ─── Vitals chart for a single field ─────────────────────────────────────────

function VitalChart({ vitals, field, days }: { vitals: VitalLog[]; field: string; days: number }) {
  const range = VITAL_RANGES[field];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = vitals
    .filter((v) => {
      const val = v[field as keyof VitalLog];
      return val !== null && val !== undefined && new Date(v.recordedAt) >= cutoff;
    })
    .map((v) => ({
      date: format(new Date(v.recordedAt), "dd MMM"),
      value: v[field as keyof VitalLog] as number,
    }))
    .reverse();

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
        No data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        {range && (
          <ReferenceArea y1={range.min} y2={range.max} fill="#0F6E56" fillOpacity={0.07} />
        )}
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.[0] ? (
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-lg">
                <p className="font-medium text-slate-700">{label}</p>
                <p className="text-slate-900">
                  {payload[0].value} {range?.unit}
                </p>
                {range && (
                  <p className="text-slate-400">
                    Normal: {range.min}–{range.max}
                  </p>
                )}
                {isVitalOutOfRange(field, payload[0].value as number) && (
                  <p className="text-red-600 font-medium mt-0.5">Out of normal range</p>
                )}
              </div>
            ) : null
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0F6E56"
          strokeWidth={2}
          dot={(props) => <VitalDot key={props.index} {...props} field={field} />}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const VITAL_FIELDS = [
  { field: "bloodGlucose", label: "Blood Glucose" },
  { field: "systolicBP", label: "Systolic BP" },
  { field: "diastolicBP", label: "Diastolic BP" },
  { field: "heartRate", label: "Heart Rate" },
  { field: "weight", label: "Weight" },
  { field: "spo2", label: "SpO₂" },
  { field: "temperature", label: "Temperature" },
  { field: "hba1c", label: "HbA1c" },
  { field: "creatinine", label: "Creatinine" },
];

export default function VitalsPage() {
  const [selectedDays, setSelectedDays] = useState(30);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { setPendingCount, setSyncing, setSyncSuccess, setSyncError } = useSyncStore();

  const { data, isLoading } = useQuery({
    queryKey: ["vitals-me", { limit: 200 }],
    queryFn: () =>
      api.get<{ data: VitalLog[] }>("/vitals/me?limit=200").then((r) => r.data),
  });

  const vitals = data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VitalForm>({ resolver: zodResolver(vitalSchema) });

  const logMutation = useMutation({
    mutationFn: async (formData: VitalForm) => {
      const payload: Record<string, number | string> = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== "" && v !== undefined && k !== "notes") {
          payload[k] = Number(v);
        }
      });
      if (formData.notes) payload.notes = formData.notes;

      const localId = uuidv4();
      payload.localId = localId;
      payload.recordedAt = new Date().toISOString();

      // Optimistic: save to IndexedDB immediately
      await enqueueVital({
        localId,
        profileId: "", // filled by server
        recordedAt: payload.recordedAt as string,
        ...payload,
      } as any);

      // Update sync indicator
      const count = await getPendingCount();
      setPendingCount(count);

      // Try posting to server
      if (navigator.onLine) {
        try {
          await api.post("/vitals", payload);
          await markSynced([localId]);
          const newCount = await getPendingCount();
          setPendingCount(newCount);
        } catch {
          // Will sync later via background sync
        }
      }
    },
    onSuccess: () => {
      toast.success("Vital logged successfully");
      reset();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["vitals-me"] });
    },
    onError: () => {
      toast.error("Failed to log vital. It will sync when you're back online.");
    },
  });

  // Manual sync trigger
  const syncNow = async () => {
    setSyncing(true);
    try {
      const pending = await getPendingVitals();
      if (pending.length === 0) {
        setSyncSuccess(new Date());
        return;
      }

      await api.post("/vitals/batch", {
        vitals: pending.map(({ localId, recordedAt, ...rest }) => ({
          ...rest,
          localId,
          recordedAt,
        })),
      });

      await markSynced(pending.map((p) => p.localId));
      setSyncSuccess(new Date());
      queryClient.invalidateQueries({ queryKey: ["vitals-me"] });
      toast.success(`${pending.length} reading(s) synced to server`);
    } catch {
      setSyncError("Sync failed — will retry when connection improves");
    }
  };

  // Which fields have any data
  const fieldsWithData = VITAL_FIELDS.filter((f) =>
    vitals.some((v) => v[f.field as keyof VitalLog] !== null)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vitals</h1>
          <p className="text-slate-500 text-sm mt-1">Track your health measurements over time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncNow}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Log vitals
          </Button>
        </div>
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log new vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => logMutation.mutate(d))} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: "bloodGlucose", label: "Blood Glucose (mg/dL)" },
                  { name: "systolicBP", label: "Systolic BP (mmHg)" },
                  { name: "diastolicBP", label: "Diastolic BP (mmHg)" },
                  { name: "heartRate", label: "Heart Rate (bpm)" },
                  { name: "weight", label: "Weight (kg)" },
                  { name: "spo2", label: "SpO₂ (%)" },
                  { name: "temperature", label: "Temperature (°C)" },
                  { name: "hba1c", label: "HbA1c (%)" },
                  { name: "creatinine", label: "Creatinine (mg/dL)" },
                ].map(({ name, label }) => (
                  <div key={name} className="space-y-1">
                    <Label htmlFor={name}>{label}</Label>
                    <Input
                      id={name}
                      type="number"
                      step="any"
                      placeholder="—"
                      {...register(name as keyof VitalForm)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" placeholder="Any observations…" {...register("notes")} />
              </div>

              {errors.root && (
                <p className="text-xs text-red-600">{errors.root.message}</p>
              )}

              <div className="flex gap-3">
                <Button type="submit" loading={logMutation.isPending}>
                  Save reading
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Date range filter */}
      <div className="flex gap-2">
        {DATE_RANGES.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => setSelectedDays(days)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedDays === days
                ? "bg-brand-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : vitals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-500">No vitals logged yet. Click "Log vitals" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fieldsWithData.map(({ field, label }) => {
            const range = VITAL_RANGES[field];
            return (
              <Card key={field}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    {label}
                    {range && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        Normal: {range.min}–{range.max} {range.unit}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VitalChart vitals={vitals} field={field} days={selectedDays} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
