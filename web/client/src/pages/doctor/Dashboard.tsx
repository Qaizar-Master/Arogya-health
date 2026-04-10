/**
 * Doctor Dashboard — patient panel with risk stratification badges,
 * alert counts, and today's schedule.
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Users, Bell, Calendar, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import api from "../../lib/api";
import {
  Alert, Consultation, Profile,
} from "../../types";
import {
  computeRiskTier, RISK_TIER_STYLES, CONDITION_LABELS, fullName,
} from "../../lib/utils";

// ─── Patient card ─────────────────────────────────────────────────────────────

interface PatientWithAlerts extends Profile {
  alerts: Alert[];
}

function PatientCard({ patient }: { patient: PatientWithAlerts }) {
  const navigate = useNavigate();
  const tier = computeRiskTier(patient.alerts);
  const tierStyle = RISK_TIER_STYLES[tier];
  const unreadCount = patient.alerts.filter((a) => !a.isRead).length;
  const criticalCount = patient.alerts.filter(
    (a) => !a.isRead && (a.severity === "CRITICAL" || a.severity === "HIGH")
  ).length;

  return (
    <div
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/doctor/patients/${patient.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/doctor/patients/${patient.id}`)}
      aria-label={`View patient ${fullName(patient)}`}
    >
      {/* Risk dot */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-600">
            {patient.firstName[0]}{patient.lastName[0]}
          </span>
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${tierStyle.dot}`}
          aria-label={`Risk: ${tierStyle.label}`}
        />
      </div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{fullName(patient)}</p>
          <Badge className={tierStyle.badge}>{tierStyle.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {patient.conditions?.slice(0, 3).map((c) => (
            <span key={c.id} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {CONDITION_LABELS[c.conditionType]}
            </span>
          ))}
        </div>
      </div>

      {/* Alert badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {criticalCount > 0 && (
          <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">{criticalCount}</span>
          </div>
        )}
        {unreadCount > 0 && (
          <Badge variant="warning">{unreadCount} alerts</Badge>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const navigate = useNavigate();

  // Fetch patient panel — profiles linked to this doctor
  const { data: panelAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["doctor-panel-alerts"],
    queryFn: () => api.get<Alert[]>("/alerts/panel").then((r) => r.data),
    refetchInterval: 30_000,
  });

  // Today's consultations
  const { data: todayConsults, isLoading: consultsLoading } = useQuery({
    queryKey: ["doctor-today-consults"],
    queryFn: () =>
      api.get<Consultation[]>(`/consultations/doctor`).then((r) => r.data),
    refetchInterval: 60_000,
  });

  // Aggregate patient list from alerts (group by profileId)
  const patientMap = new Map<string, PatientWithAlerts>();
  (panelAlerts ?? []).forEach((alert) => {
    if (!patientMap.has(alert.profileId)) {
      patientMap.set(alert.profileId, {
        ...(alert.profile as Profile),
        id: alert.profileId, // profileId is the correct profile UUID
        alerts: [],
        conditions: [],
        medications: [],
        patientConsultations: [],
        doctorConsultations: [],
        assignedPatients: [],
        assignedDoctors: [],
        vitals: [],
      });
    }
    patientMap.get(alert.profileId)!.alerts.push(alert);
  });

  // Sort: RED first, then AMBER, then GREEN
  const TIER_ORDER = { RED: 0, AMBER: 1, GREEN: 2 };
  const patients = [...patientMap.values()].sort((a, b) => {
    const ta = computeRiskTier(a.alerts);
    const tb = computeRiskTier(b.alerts);
    return TIER_ORDER[ta] - TIER_ORDER[tb];
  });

  const criticalAlerts = (panelAlerts ?? []).filter(
    (a) => !a.isRead && (a.severity === "CRITICAL" || a.severity === "HIGH")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your patient panel and today's schedule</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Patients</p>
                <p className="text-2xl font-bold text-slate-900">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Urgent Alerts</p>
                <p className={`text-2xl font-bold ${criticalAlerts.length > 0 ? "text-red-600" : "text-slate-900"}`}>
                  {criticalAlerts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Today's Consults</p>
                <p className="text-2xl font-bold text-slate-900">{todayConsults?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient panel — takes 2/3 width */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Patient Panel</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/doctor/patients")}
            >
              View all
            </Button>
          </div>

          {alertsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : patients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No patients assigned yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {patients.slice(0, 10).map((p) => (
                <PatientCard key={p.id} patient={p} />
              ))}
            </div>
          )}
        </div>

        {/* Today's schedule */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Today's Schedule</h2>
          {consultsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !todayConsults?.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No consultations today</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayConsults.map((c) => (
                <Card key={c.id} className="cursor-pointer hover:border-brand-300 transition-colors"
                  onClick={() => navigate(`/doctor/patients/${c.patientId}/consult/${c.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {c.patient
                            ? `${c.patient.firstName} ${c.patient.lastName}`
                            : "Patient"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.chiefComplaint ?? "General"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-700">
                          {format(new Date(c.scheduledAt), "h:mm a")}
                        </p>
                        <Badge
                          variant={
                            c.status === "COMPLETED"
                              ? "success"
                              : c.status === "IN_PROGRESS"
                              ? "warning"
                              : "outline"
                          }
                          className="mt-1"
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
