/**
 * Public landing page — product overview and CTA.
 */

import { useNavigate } from "react-router-dom";
import { Stethoscope, Activity, Pill, Brain, Shield, Users } from "lucide-react";
import { Button } from "../components/ui/button";

const FEATURES = [
  {
    icon: Activity,
    title: "Multi-condition Vitals Tracking",
    desc: "Track glucose, BP, creatinine and more on a single longitudinal timeline. Condition-aware charts with reference ranges.",
    color: "bg-brand-50 text-brand-600",
  },
  {
    icon: Pill,
    title: "Medication Adherence",
    desc: "Daily checklists, missed dose alerts, and rolling 30-day adherence reports to keep patients on track.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Brain,
    title: "AI Clinical Decision Support",
    desc: "Claude-powered anomaly detection, SOAP note drafts, and drug interaction checks — always reviewed by your doctor.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Shield,
    title: "ABHA-ready Health Records",
    desc: "Patient profiles structured for FHIR R4 export. ABHA ID linking ready for Ayushman Bharat integration.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Users,
    title: "Doctor-first Workflows",
    desc: "Patient panel with risk stratification, SOAP note editor, e-prescriptions with drug interaction warnings.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Activity,
    title: "Offline Resilient",
    desc: "Log vitals without internet. Readings queue locally and sync automatically when connectivity returns.",
    color: "bg-green-50 text-green-600",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Arogya</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Sign in</Button>
            <Button size="sm" onClick={() => navigate("/signup")}>Get started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 rounded-full text-xs text-brand-700 font-medium mb-6 border border-brand-100">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          Built for India's chronic disease burden
        </div>

        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Continuous care for<br />
          <span className="text-brand-500">chronic conditions</span>
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          Arogya connects patients managing diabetes, hypertension, CKD, and heart disease
          with their doctors — powered by AI clinical decision support and ABHA-ready health records.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/signup")} className="px-8">
            Start for free
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
            Doctor sign in →
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 mt-16 pt-12 border-t border-slate-100">
          {[
            { label: "Chronic conditions tracked", value: "8+" },
            { label: "Vitals monitored", value: "11" },
            { label: "AI-assisted workflows", value: "3" },
            { label: "ABHA compliant", value: "Yes" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-brand-600">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Everything chronic care needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to start?</h2>
        <p className="text-slate-600 mb-8">
          Join patients and doctors managing chronic conditions better with Arogya.
        </p>
        <Button size="lg" onClick={() => navigate("/signup")}>
          Create your free account →
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        <p>© 2025 Arogya Health Technologies. Built with care for India.</p>
      </footer>
    </div>
  );
}
