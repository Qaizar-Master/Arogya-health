/**
 * Doctor — Patients page
 * Full list of assigned patients with search, risk-tier filter, and navigation.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Users, AlertTriangle, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { Profile, Alert, Consultation } from "../../types";
import { computeRiskTier, RISK_TIER_STYLES, CONDITION_LABELS, fullName } from "../../lib/utils";
import type { RiskTier } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientWithAlerts extends Profile {
  alerts: Alert[];
}

// ─── Patient card ─────────────────────────────────────────────────────────────

function PatientRow({
  patient,
  nextConsult,
}: {
  patient: PatientWithAlerts;
  nextConsult?: Consultation;
}) {
  const navigate = useNavigate();
  const tier = computeRiskTier(patient.alerts);
  const style = RISK_TIER_STYLES[tier];
  const unread = patient.alerts.filter((a) => !a.isRead).length;
  const critical = patient.alerts.filter(
    (a) => !a.isRead && (a.severity === "CRITICAL" || a.severity === "HIGH")
  ).length;

  return (
    <div
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/doctor/patients/${patient.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/doctor/patients/${patient.id}`)}
      aria-label={`View ${fullName(patient)}`}
    >
      {/* Avatar + risk dot */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-600">
            {patient.firstName[0]}{patient.lastName[0]}
          </span>
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${style.dot}`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{fullName(patient)}</p>
          <Badge className={style.badge}>{style.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {patient.conditions?.slice(0, 3).map((c) => (
            <span key={c.id} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {CONDITION_LABELS[c.conditionType as keyof typeof CONDITION_LABELS] ?? c.conditionType}
            </span>
          ))}
        </div>
        {nextConsult && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-brand-700">
            <Calendar className="w-3 h-3" />
            Next consult: {format(new Date(nextConsult.scheduledAt), "dd MMM, h:mm a")}
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {critical > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {critical} urgent
          </span>
        )}
        {unread > 0 && critical === 0 && (
          <Badge variant="warning">{unread} alerts</Badge>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TIER_ORDER: Record<RiskTier, number> = { RED: 0, AMBER: 1, GREEN: 2 };

export default function DoctorPatientsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<RiskTier | "ALL">("ALL");

  const { data: patients, isLoading } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: () => api.get<PatientWithAlerts[]>("/profile/doctor/patients").then((r) => r.data),
  });

  const { data: upcomingConsults } = useQuery({
    queryKey: ["doctor-upcoming-consults"],
    queryFn: () =>
      api.get<Consultation[]>("/consultations/doctor?upcoming=true").then((r) => r.data),
  });

  // Map: patientId → nearest upcoming consultation
  const nextConsultByPatient = useMemo(() => {
    const map = new Map<string, Consultation>();
    (upcomingConsults ?? [])
      .filter((c) => c.status === "SCHEDULED")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .forEach((c) => {
        if (!map.has(c.patientId)) map.set(c.patientId, c);
      });
    return map;
  }, [upcomingConsults]);

  const filtered = useMemo(() => {
    let list = patients ?? [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q)
      );
    }

    if (tierFilter !== "ALL") {
      list = list.filter((p) => computeRiskTier(p.alerts) === tierFilter);
    }

    return [...list].sort((a, b) => {
      const ta = computeRiskTier(a.alerts);
      const tb = computeRiskTier(b.alerts);
      return TIER_ORDER[ta] - TIER_ORDER[tb];
    });
  }, [patients, search, tierFilter]);

  const counts = useMemo(() => {
    const all = patients ?? [];
    return {
      RED: all.filter((p) => computeRiskTier(p.alerts) === "RED").length,
      AMBER: all.filter((p) => computeRiskTier(p.alerts) === "AMBER").length,
      GREEN: all.filter((p) => computeRiskTier(p.alerts) === "GREEN").length,
    };
  }, [patients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Patients</h1>
        <p className="text-slate-500 text-sm mt-1">
          {patients ? `${patients.length} patient${patients.length !== 1 ? "s" : ""} assigned` : "Loading…"}
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["ALL", "RED", "AMBER", "GREEN"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                tierFilter === tier
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {tier === "ALL" ? `All (${patients?.length ?? 0})` : `${tier} (${counts[tier]})`}
            </button>
          ))}
        </div>
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
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {search || tierFilter !== "ALL"
                ? "No patients match your filters"
                : "No patients assigned to you yet"}
            </p>
            {(search || tierFilter !== "ALL") && (
              <button
                onClick={() => { setSearch(""); setTierFilter("ALL"); }}
                className="mt-2 text-xs text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Patient list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((p) => (
            <PatientRow key={p.id} patient={p} nextConsult={nextConsultByPatient.get(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
