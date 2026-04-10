/**
 * Doctor — Schedule page
 * Day-view calendar, consultation management, and new appointment booking.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, addDays, subDays, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { Consultation, Profile, Alert } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  SCHEDULED: "secondary",
  CANCELLED: "danger",
};

interface PatientWithAlerts extends Profile {
  alerts: Alert[];
}

// ─── New Consultation Form ────────────────────────────────────────────────────

function NewConsultForm({
  patients,
  selectedDate,
  onClose,
  onSuccess,
}: {
  patients: PatientWithAlerts[];
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    `${format(selectedDate, "yyyy-MM-dd")}T09:00`
  );
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [visitType, setVisitType] = useState<"in-person" | "telemedicine">("in-person");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !scheduledAt) return;
    setSubmitting(true);
    try {
      await api.post("/consultations", {
        patientId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        chiefComplaint: chiefComplaint || undefined,
        visitType,
      });
      toast.success("Consultation scheduled");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to schedule consultation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Consultation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="patientSelect">Patient</Label>
            <select
              id="patientSelect"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="scheduledAt">Date & time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="visitType">Visit type</Label>
              <select
                id="visitType"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as "in-person" | "telemedicine")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="in-person">In-person</option>
                <option value="telemedicine">Telemedicine</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="chiefComplaint">Chief complaint (optional)</Label>
            <Input
              id="chiefComplaint"
              placeholder="e.g. Routine follow-up, Blood sugar review…"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={submitting}>Schedule</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Consultation row ─────────────────────────────────────────────────────────

function ConsultRow({
  consult,
  onStatusChange,
}: {
  consult: Consultation;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
      {/* Time */}
      <div className="text-center w-14 flex-shrink-0">
        <p className="text-sm font-bold text-slate-900">
          {format(new Date(consult.scheduledAt), "h:mm")}
        </p>
        <p className="text-xs text-slate-400">
          {format(new Date(consult.scheduledAt), "a")}
        </p>
      </div>

      <div className="w-px h-10 bg-slate-200 flex-shrink-0" />

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {consult.patient
            ? `${consult.patient.firstName} ${consult.patient.lastName}`
            : "Patient"}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {consult.chiefComplaint ?? "General"} · {consult.visitType ?? "in-person"}
        </p>
      </div>

      {/* Status + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={STATUS_VARIANT[consult.status] ?? "secondary"} className="text-xs">
          {consult.status.replace("_", " ")}
        </Badge>

        {consult.status === "SCHEDULED" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onStatusChange(consult.id, "IN_PROGRESS")}
          >
            Start
          </Button>
        )}
        {consult.status === "IN_PROGRESS" && (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => onStatusChange(consult.id, "COMPLETED")}
          >
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewForm, setShowNewForm] = useState(false);
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: consultations, isLoading } = useQuery({
    queryKey: ["doctor-schedule", dateStr],
    queryFn: () =>
      api
        .get<Consultation[]>(`/consultations/doctor?date=${dateStr}`)
        .then((r) => r.data),
  });

  const { data: patients } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: () =>
      api.get<PatientWithAlerts[]>("/profile/doctor/patients").then((r) => r.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/consultations/${id}`, {
        status,
        ...(status === "COMPLETED" ? { completedAt: new Date().toISOString() } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-schedule", dateStr] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const sorted = [...(consultations ?? [])].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  const stats = {
    total: sorted.length,
    completed: sorted.filter((c) => c.status === "COMPLETED").length,
    scheduled: sorted.filter((c) => c.status === "SCHEDULED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your consultation calendar</p>
        </div>
        <Button size="sm" onClick={() => setShowNewForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          New consultation
        </Button>
      </div>

      {/* New consultation form */}
      {showNewForm && patients && patients.length > 0 && (
        <NewConsultForm
          patients={patients}
          selectedDate={selectedDate}
          onClose={() => setShowNewForm(false)}
          onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["doctor-schedule"] });
        queryClient.invalidateQueries({ queryKey: ["doctor-upcoming-consults"] });
      }}
        />
      )}
      {showNewForm && patients?.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-slate-500">
            No patients assigned yet. Ask an admin to link patients to your account.
          </CardContent>
        </Card>
      )}

      {/* Date navigator */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-base font-semibold text-slate-900">
              {isToday(selectedDate) ? "Today — " : ""}
              {format(selectedDate, "EEEE, dd MMMM yyyy")}
            </p>
            {stats.total > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {stats.completed}/{stats.total} completed · {stats.scheduled} remaining
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isToday(selectedDate) && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 text-xs text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
              >
                Today
              </button>
            )}
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && sorted.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No consultations scheduled for this day</p>
            <button
              className="mt-2 text-xs text-brand-600 hover:underline"
              onClick={() => setShowNewForm(true)}
            >
              Schedule one now
            </button>
          </CardContent>
        </Card>
      )}

      {/* Consultation list */}
      {!isLoading && sorted.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Clock className="w-3 h-3" />
            {sorted.length} consultation{sorted.length !== 1 ? "s" : ""}
          </div>
          {sorted.map((c) => (
            <ConsultRow
              key={c.id}
              consult={c}
              onStatusChange={(id, status) =>
                updateStatusMutation.mutate({ id, status })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
