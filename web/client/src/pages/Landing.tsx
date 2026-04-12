/**
 * Arogya — Landing page, redesigned for maximum impact.
 */

import { useNavigate } from "react-router-dom";
import {
  Stethoscope, Activity, Pill, Brain, Shield,
  Bell, CheckCircle, ArrowRight, TrendingUp, Wifi,
  HeartPulse, FlaskConical, CalendarCheck, Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [  
  {
    icon: Activity,
    title: "Longitudinal Vitals",
    desc: "Glucose, BP, creatinine, SpO₂ — all on a single condition-aware timeline with clinical reference ranges highlighted.",
    color: "text-brand-600",
    bg: "bg-brand-50",
  },
  {
    icon: Pill,
    title: "Medication Adherence",
    desc: "Daily dose checklists, missed-dose alerts, and rolling 30-day adherence charts to keep patients on track.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Brain,
    title: "AI Decision Support",
    desc: "AI-powered anomaly detection flags dangerous trends. SOAP note drafts and drug interaction checks in seconds.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Shield,
    title: "ABHA-Ready Records",
    desc: "Patient profiles structured for FHIR R4 export. ABHA ID linking ready for Ayushman Bharat Digital Health Mission.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Wifi,
    title: "Offline-First",
    desc: "Log vitals without internet. Readings queue in IndexedDB and sync automatically when connectivity returns.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: CalendarCheck,
    title: "Smart Scheduling",
    desc: "Day-view consultation calendar with Start/Complete workflows. Patients see upcoming visits and SOAP-annotated history.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

const ROLES = [
  {
    role: "Patient",
    icon: HeartPulse,
    color: "brand",
    points: [
      "Log vitals with offline support",
      "Track medication adherence daily",
      "View SOAP notes from consultations",
      "Receive AI-flagged health alerts",
    ],
  },
  {
    role: "Doctor",
    icon: Stethoscope,
    color: "violet",
    points: [
      "Risk-stratified patient panel (RED / AMBER / GREEN)",
      "AI-generated SOAP draft from vitals",
      "Log test results directly into patient record",
      "Drug interaction checker on prescriptions",
    ],
  },
  {
    role: "Admin",
    icon: Shield,
    color: "amber",
    points: [
      "Manage users, roles, and access",
      "Link doctors to patients",
      "Platform-wide analytics and alert overview",
      "Activate / deactivate accounts",
    ],
  },
];

const STATS = [
  { value: "77M+", label: "Indians with diabetes" },
  { value: "220M+", label: "with hypertension" },
  { value: "8M+", label: "CKD patients" },
  { value: "∞", label: "untapped potential" },
];

// ─── Mini dashboard mockup ────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative select-none pointer-events-none">
      {/* Main card */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        {/* Titlebar */}
        <div className="bg-brand-600 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/20" />
            ))}
          </div>
          <p className="flex-1 text-center text-[11px] font-medium text-white/70 tracking-wide">
            arogya.health — Patient Dashboard
          </p>
        </div>

        <div className="p-4 space-y-3 bg-slate-50">
          {/* Patient row */}
          <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-slate-100">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-brand-700">RK</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900">Rajesh Kumar, 58 · Male</p>
              <p className="text-[10px] text-slate-400">Diabetes T2 · Hypertension · CKD Stage 2</p>
            </div>
            <div className="flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-medium px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
              2 alerts
            </div>
          </div>

          {/* Vitals grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Blood Glucose", value: "187", unit: "mg/dL", hi: true },
              { label: "Systolic BP", value: "142", unit: "mmHg", hi: true },
              { label: "Heart Rate", value: "76", unit: "bpm", hi: false },
            ].map(({ label, value, unit, hi }) => (
              <div
                key={label}
                className={`rounded-xl p-2.5 border ${
                  hi ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"
                }`}
              >
                <p className="text-[9px] text-slate-500 leading-none mb-1">{label}</p>
                <p className={`text-base font-bold leading-none ${hi ? "text-red-600" : "text-green-600"}`}>
                  {value}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">{unit}</p>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-700">Blood Glucose — 30 days</p>
              <p className="text-[9px] text-red-500 font-medium">↑ 12% this week</p>
            </div>
            <svg viewBox="0 0 220 44" className="w-full h-10">
              <defs>
                <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F6E56" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0F6E56" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points="0,36 22,32 44,34 66,28 88,24 110,26 132,20 154,17 176,22 198,16 220,14 220,44 0,44"
                fill="url(#gfill)"
              />
              <polyline
                points="0,36 22,32 44,34 66,28 88,24 110,26 132,20 154,17 176,22 198,16 220,14"
                fill="none"
                stroke="#0F6E56"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx="220" cy="14" r="3" fill="#0F6E56" />
            </svg>
          </div>

          {/* AI insight strip */}
          <div className="bg-violet-50 rounded-xl p-3 border border-violet-100 flex items-start gap-2">
            <Brain className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-violet-800">AI Insight</p>
              <p className="text-[9px] text-violet-600 leading-relaxed mt-0.5">
                Glucose trend +12% over 7 days. Recommend HbA1c check and medication review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge — top right */}
      <div
        className="absolute -right-5 -top-3 bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-900">Metformin taken</p>
          <p className="text-[9px] text-slate-400">Today, 8:02 AM</p>
        </div>
      </div>

      {/* Floating badge — bottom left */}
      <div
        className="absolute -left-5 bottom-16 bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Bell className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-900">Alert → Dr. Mehta</p>
          <p className="text-[9px] text-slate-400">High BP detected</p>
        </div>
      </div>

      {/* Floating badge — bottom right */}
      <div
        className="absolute -right-4 bottom-4 bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <Brain className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-900">SOAP draft ready</p>
          <p className="text-[9px] text-slate-400">AI-generated in 1.2s</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/arogya-icon.svg" alt="Arogya" className="w-8 h-8" />
            <span className="text-base font-bold text-slate-900 tracking-tight">Arogya</span>
            <span className="hidden sm:inline-block text-[10px] font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full ml-1">
              BETA
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#roles" className="hover:text-brand-600 transition-colors">Who it's for</a>
            <a href="#ai" className="hover:text-brand-600 transition-colors">AI</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")} className="shadow-sm">
              Get started
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden pt-24"
        style={{
          background: "linear-gradient(160deg, #0a0f0d 0%, #0d1f18 40%, #0f2e22 70%, #09271c 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow blobs */}
        <div
          className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(15,110,86,0.28) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-700/50 bg-brand-900/40 text-brand-300 text-xs font-medium mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                Built for India's chronic disease crisis
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight text-white mb-6">
                Smarter care for{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #4FAF91, #28967A, #88C9B5)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  chronic conditions
                </span>
              </h1>

              <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg">
                Arogya connects patients with diabetes, hypertension, and CKD to their
                doctors — with AI-powered clinical support, real-time vitals tracking,
                and ABHA-ready health records.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-14">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-900/40 px-8"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="border-white/15 text-white hover:bg-white/8 bg-white/5"
                >
                  View demo
                </Button>
              </div>

              {/* Inline trust badges */}
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: Shield, label: "ABHA-ready" },
                  { icon: Brain, label: "AI" },
                  { icon: Wifi, label: "Offline support" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Icon className="w-3.5 h-3.5 text-brand-400" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative lg:pl-8">
              <DashboardMockup />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, #fff)",
          }}
        />
      </section>

      {/* ── Problem statement ── */}
      <section className="bg-white py-20 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              The problem
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              India's chronic disease burden is{" "}
              <span className="text-brand-600">enormous</span>
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              Over 400 million Indians live with at least one chronic condition.
              Fragmented records, no continuity, zero AI support — Arogya changes that.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="text-center py-8 px-4 rounded-2xl border border-slate-100 bg-slate-50"
              >
                <p className="text-4xl font-bold text-brand-600 mb-2">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              Platform features
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Everything chronic care needs
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto">
              From first vital log to longitudinal clinical record — one platform for patients, doctors, and hospitals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group relative rounded-2xl p-6 border border-slate-100 bg-white hover:border-brand-200 hover:shadow-lg transition-all duration-200"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-5`}
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section
        id="roles"
        className="py-24"
        style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f0fdf8 100%)" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              Built for everyone
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              One platform, three roles
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ROLES.map(({ role, icon: Icon, color, points }) => {
              const colorMap: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
                brand: { ring: "border-brand-200", bg: "bg-brand-600", text: "text-brand-700", icon: "bg-brand-100" },
                violet: { ring: "border-violet-200", bg: "bg-violet-600", text: "text-violet-700", icon: "bg-violet-100" },
                amber: { ring: "border-amber-200", bg: "bg-amber-500", text: "text-amber-700", icon: "bg-amber-100" },
              };
              const c = colorMap[color];
              return (
                <div
                  key={role}
                  className={`bg-white rounded-2xl border-2 ${c.ring} p-7 flex flex-col gap-5`}
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{role}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <CheckCircle className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto"
                    onClick={() => navigate("/signup")}
                  >
                    Sign up as {role}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI section ── */}
      <section
        id="ai"
        className="py-24 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1035 0%, #12082a 40%, #0c1f18 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(109,40,217,0.2) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — AI features */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-700/50 bg-violet-900/30 text-violet-300 text-xs font-medium mb-8">
                <Brain className="w-3.5 h-3.5" />
                Powered by AI
              </div>

              <h2 className="text-4xl font-bold text-white leading-tight mb-5">
                AI that works{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  with your doctor
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                Every AI output is surfaced as a draft for the clinician to review —
                never replacing judgement, always augmenting it.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: Activity,
                    title: "Anomaly Detection",
                    desc: "Flags dangerous trends across 11 vital parameters with severity scoring.",
                  },
                  {
                    icon: FlaskConical,
                    title: "SOAP Note Drafting",
                    desc: "Generates Subjective/Objective/Assessment/Plan from vitals and complaint in seconds.",
                  },
                  {
                    icon: Pill,
                    title: "Drug Interaction Check",
                    desc: "Scans prescriptions for adverse interactions before they reach the patient.",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/8"
                  >
                    <div className="w-9 h-9 rounded-lg bg-violet-900/60 border border-violet-700/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — AI card mockup */}
            <div className="lg:pl-6">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)" }}
              >
                {/* Header */}
                <div className="bg-violet-900/80 px-4 py-3 border-b border-violet-800/50 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-300" />
                  <span className="text-xs font-semibold text-violet-200">AI Clinical Analysis — Rajesh Kumar</span>
                  <span className="ml-auto inline-flex items-center gap-1 bg-red-900/60 text-red-300 text-[10px] font-medium px-2 py-0.5 rounded-full">
                    <Zap className="w-2.5 h-2.5" />
                    HIGH urgency
                  </span>
                </div>

                <div className="bg-slate-900/90 p-5 space-y-4 text-xs">
                  {/* Anomalies */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Detected anomalies
                    </p>
                    <div className="space-y-2">
                      {[
                        { field: "Blood Glucose", val: "187 mg/dL", note: "38% above upper limit. Persistent over 3 readings." },
                        { field: "Systolic BP", val: "142 mmHg", note: "Stage 1 hypertension range. Trending up 5 days." },
                      ].map(({ field, val, note }) => (
                        <div
                          key={field}
                          className="flex items-start gap-3 p-2.5 bg-red-950/60 rounded-lg border border-red-900/40"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0 animate-pulse" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-red-300">{field}</span>
                              <span className="text-red-400">{val}</span>
                            </div>
                            <p className="text-slate-400 mt-0.5">{note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trend summary */}
                  <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/40">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Trend summary
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      Patient shows deteriorating glycaemic control over the past 10 days.
                      Concurrent rise in BP suggests possible stress-induced hyperglycaemia or subtherapeutic dosing.
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div className="p-3 bg-brand-900/40 rounded-lg border border-brand-800/40">
                    <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider mb-1.5">
                      Recommended action
                    </p>
                    <p className="text-brand-200 leading-relaxed">
                      Schedule review within 48 h. Order HbA1c and 24-h ambulatory BP monitoring.
                      Consider Metformin dose escalation pending kidney function results.
                    </p>
                  </div>

                  <p className="text-[10px] text-slate-600 text-center pt-1">
                    AI draft — clinical judgement required before acting
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              The workflow
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              From vitals to clinical action in minutes
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-1/2 -translate-x-1/2 w-[calc(100%-200px)] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "01", icon: Activity, title: "Patient logs vitals", desc: "Glucose, BP, SpO₂ — even offline. Auto-syncs when back online." },
                { step: "02", icon: Brain, title: "AI flags anomalies", desc: "AI analyses trends and surfaces alerts to the doctor instantly." },
                { step: "03", icon: Bell, title: "Doctor reviews alerts", desc: "Risk-stratified panel makes critical patients immediately visible." },
                { step: "04", icon: TrendingUp, title: "Care plan updated", desc: "SOAP note drafted, prescription checked, patient notified." },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-brand-50 border-2 border-brand-100 flex flex-col items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-brand-600" />
                    <span className="text-[9px] font-bold text-brand-400 mt-0.5">{step}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="py-12 border-y border-slate-100 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Built with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              "React + TypeScript",
              "Express + Prisma",
              "PostgreSQL / Supabase",
              "Groq API",
              "Tailwind CSS",
              "FHIR R4 / ABHA",
            ].map((tech) => (
              <span key={tech} className="text-sm font-medium text-slate-500">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-28 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #031D17 0%, #0C5A46 50%, #0F6E56 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(79,175,145,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            India's patients deserve{" "}
            <span className="text-brand-200">continuous care</span>
          </h2>
          <p className="text-lg text-brand-200/70 mb-10 max-w-xl mx-auto">
            Join Arogya — where doctors and patients are connected through intelligent,
            data-driven chronic care management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="bg-white text-brand-700 hover:bg-brand-50 px-10 font-semibold shadow-xl shadow-brand-900/30"
            >
              Create free account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login")}
              className="border-white/25 text-white hover:bg-white/8 bg-transparent"
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/arogya-icon.svg" alt="Arogya" className="w-7 h-7" />
            <span className="text-sm font-bold text-white">Arogya</span>
          </div>
          <p className="text-xs text-slate-500">
            © 2025 Arogya Health Technologies · Built with care for India
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
