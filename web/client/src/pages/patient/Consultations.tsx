/**
 * Patient — Consultations page
 * View upcoming and past consultations with SOAP notes and prescriptions.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, Stethoscope, FileText, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { Consultation } from "../../types";

// ─── Status badge variant map ─────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  SCHEDULED: "secondary",
  CANCELLED: "danger",
};

// ─── Consultation card ────────────────────────────────────────────────────────

function ConsultCard({ consult }: { consult: Consultation }) {
  const [expanded, setExpanded] = useState(false);
  const hasSoap = !!consult.soapNote;
  const hasRx = !!consult.prescription;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Stethoscope className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {consult.doctor
                  ? `Dr. ${consult.doctor.firstName} ${consult.doctor.lastName}`
                  : "Doctor"}
              </p>
              {consult.doctor?.speciality && (
                <p className="text-xs text-slate-400">{consult.doctor.speciality}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {consult.chiefComplaint ?? "General consultation"}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-slate-900">
              {format(new Date(consult.scheduledAt), "dd MMM yyyy")}
            </p>
            <p className="text-xs text-slate-500">
              {format(new Date(consult.scheduledAt), "h:mm a")}
            </p>
            <Badge variant={STATUS_VARIANT[consult.status] ?? "secondary"} className="mt-1">
              {consult.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Expand button — only for completed */}
        {consult.status === "COMPLETED" && (hasSoap || hasRx) && (
          <button
            className="mt-3 text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide details" : "View notes & prescription"}
          </button>
        )}

        {/* Expanded: SOAP note + Prescription */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            {hasSoap && consult.soapNote && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Clinical Notes</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {consult.soapNote.subjective && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-slate-600 mb-1">Subjective</p>
                      <p className="text-slate-700 leading-relaxed">{consult.soapNote.subjective}</p>
                    </div>
                  )}
                  {consult.soapNote.objective && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-slate-600 mb-1">Objective</p>
                      <p className="text-slate-700 leading-relaxed">{consult.soapNote.objective}</p>
                    </div>
                  )}
                  {consult.soapNote.assessment && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-slate-600 mb-1">Assessment</p>
                      <p className="text-slate-700 leading-relaxed">{consult.soapNote.assessment}</p>
                    </div>
                  )}
                  {consult.soapNote.plan && (
                    <div className="bg-brand-50 rounded-lg p-3">
                      <p className="font-semibold text-brand-700 mb-1">Plan</p>
                      <p className="text-brand-800 leading-relaxed">{consult.soapNote.plan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasRx && consult.prescription && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Prescription</p>
                </div>
                <div className="space-y-2">
                  {consult.prescription.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-2 bg-slate-50 rounded-lg text-xs"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{item.drugName}</p>
                        <p className="text-slate-500">
                          {item.dosage} · {item.frequency} · {item.duration}
                        </p>
                        {item.specialInstr && (
                          <p className="text-amber-600 mt-0.5">{item.specialInstr}</p>
                        )}
                      </div>
                      {item.interactionFlag && (
                        <Badge variant="warning" className="text-[10px]">Interaction</Badge>
                      )}
                    </div>
                  ))}
                  {consult.prescription.instructions && (
                    <p className="text-xs text-slate-600 bg-amber-50 p-2 rounded-lg">
                      <span className="font-medium">Instructions: </span>
                      {consult.prescription.instructions}
                    </p>
                  )}
                  {consult.prescription.followUpDate && (
                    <p className="text-xs text-brand-700">
                      Follow-up: {format(new Date(consult.prescription.followUpDate), "dd MMM yyyy")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConsultationsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { data: consultations, isLoading } = useQuery({
    queryKey: ["consultations-me"],
    queryFn: () => api.get<Consultation[]>("/consultations/me").then((r) => r.data),
  });

  const now = new Date();
  const upcoming = (consultations ?? []).filter(
    (c) => c.status === "SCHEDULED" && new Date(c.scheduledAt) >= now
  );
  const past = (consultations ?? []).filter(
    (c) => c.status !== "SCHEDULED" || new Date(c.scheduledAt) < now
  );

  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
        <p className="text-slate-500 text-sm mt-1">Your appointment history and clinical notes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "upcoming" ? "Upcoming" : "Past"}
            <span className="ml-2 text-xs text-slate-400">
              ({t === "upcoming" ? upcoming.length : past.length})
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayed.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {tab === "upcoming" ? "No upcoming consultations scheduled" : "No past consultations on record"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Consultation list */}
      {!isLoading && (
        <div className="space-y-3">
          {displayed.map((c) => (
            <ConsultCard key={c.id} consult={c} />
          ))}
        </div>
      )}
    </div>
  );
}
