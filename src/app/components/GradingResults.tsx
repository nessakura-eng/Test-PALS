import { useState } from "react";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  CheckCircle2, AlertTriangle, XCircle, Award, TrendingUp,
  Bot, Download, ChevronDown, ChevronUp, User, Brain,
  Activity, Code2, ShieldCheck, ShieldAlert, ClipboardList, BookOpen,
} from "lucide-react";
import { GradingResult, CriticalStep, DebriefingStep } from "../App";
import { Button } from "./ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GradingResultsProps {
  result: GradingResult;
}

// ── Grade helpers ──────────────────────────────────────────────
const GRADE_CONFIG = {
  A: {
    icon: CheckCircle2,
    label: "Correct",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    icon_color: "text-emerald-500",
  },
  B: {
    icon: AlertTriangle,
    label: "Incorrect",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    icon_color: "text-amber-500",
  },
  C: {
    icon: XCircle,
    label: "Not Performed",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    icon_color: "text-red-500",
  },
  NotObserved: {
    icon: XCircle,
    label: "Not Observed",
    bg: "bg-gray-50",
    border: "border-gray-200",
    badge: "bg-gray-100 text-gray-500",
    icon_color: "text-gray-400",
  },
} as const;

const CATEGORY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  TeamLeader:        { label: "Team Leader",         color: "text-[#3C1053]", dot: "bg-[#3C1053]" },
  PatientManagement: { label: "Patient Management",  color: "text-blue-700",  dot: "bg-blue-600" },
  CaseConclusion:    { label: "Case Conclusion / Debriefing", color: "text-teal-700", dot: "bg-teal-600" },
};

const SCENARIO_CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  Respiratory: { color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-200" },
  Shock:       { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  Cardiac:     { color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  Unknown:     { color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200" },
};

// ── Collapsible Step Card ──────────────────────────────────────
function StepCard({ step }: { step: CriticalStep }) {
  const [open, setOpen] = useState(false);
  const cfg = GRADE_CONFIG[step.grade] || GRADE_CONFIG.NotObserved;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.icon_color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{step.stepName}</p>
          {!open && step.gradeJustification && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{step.gradeJustification}</p>
          )}
        </div>
        <Badge className={`${cfg.badge} text-xs font-semibold flex-shrink-0`}>
          {step.grade === "NotObserved" ? "Not Observed" : `Grade ${step.grade}`}
        </Badge>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
               : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-inherit px-4 pb-4 pt-3 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            {/* Digital Twin side */}
            <div className="rounded-lg bg-[#3C1053]/6 border border-[#3C1053]/15 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5 text-[#3C1053]" />
                <span className="text-xs font-semibold text-[#3C1053] uppercase tracking-wide">
                  Digital Twin — Ideal
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {step.digitalTwinExpected || "—"}
              </p>
            </div>

            {/* Student side */}
            <div className={`rounded-lg border p-3 ${
              step.grade === "A" ? "bg-emerald-50/60 border-emerald-200" :
              step.grade === "B" ? "bg-amber-50/60 border-amber-200" :
              "bg-red-50/60 border-red-200"
            }`}>
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Student — Observed
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {step.studentPerformed || "Not observed in video"}
              </p>
            </div>
          </div>

          {step.gradeJustification && (
            <div className="rounded-lg bg-white/70 border border-gray-200 px-3 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Grading Rationale:{" "}
              </span>
              <span className="text-sm text-gray-700">{step.gradeJustification}</span>
            </div>
          )}

          {step.clinicalImpact && step.grade !== "A" && (
            <div className="flex gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                  Clinical Impact:{" "}
                </span>
                <span className="text-sm text-orange-700">{step.clinicalImpact}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Debriefing Step Card ───────────────────────────────────────
function DebriefingCard({ step }: { step: DebriefingStep }) {
  const [open, setOpen] = useState(false);
  const cfg = GRADE_CONFIG[step.grade] || GRADE_CONFIG.NotObserved;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <BookOpen className="w-5 h-5 flex-shrink-0 text-teal-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{step.stepName}</p>
          {!open && step.gradeJustification && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{step.gradeJustification}</p>
          )}
        </div>
        <Badge className={`${cfg.badge} text-xs font-semibold flex-shrink-0`}>
          Grade {step.grade}
        </Badge>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
               : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-inherit px-4 pb-4 pt-3 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                  Debriefing Step
                </span>
              </div>
              <p className="text-sm text-gray-700">{step.stepName}</p>
            </div>
            <div className={`rounded-lg border p-3 ${
              step.grade === "A" ? "bg-emerald-50/60 border-emerald-200" :
              step.grade === "B" ? "bg-amber-50/60 border-amber-200" :
              "bg-red-50/60 border-red-200"
            }`}>
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Student Response
                </span>
              </div>
              <p className="text-sm text-gray-700">{step.studentResponse || "Not observed"}</p>
            </div>
          </div>
          {step.gradeJustification && (
            <div className="rounded-lg bg-white/70 border border-gray-200 px-3 py-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rationale:{" "}
              </span>
              <span className="text-sm text-gray-700">{step.gradeJustification}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Score circle ───────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#10b981" : score >= 65 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" stroke={color}
          strokeWidth="10" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold text-gray-900">{score}%</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function GradingResults({ result }: GradingResultsProps) {
  const [activeTab, setActiveTab] = useState("comparison");

  const steps = result.criticalPerformanceSteps || [];
  const totalSteps = steps.length;
  const gradeA = steps.filter(s => s.grade === "A").length;
  const gradeB = steps.filter(s => s.grade === "B").length;
  const gradeC = steps.filter(s => s.grade === "C" || s.grade === "NotObserved").length;

  // Group steps by category
  const stepsByCategory = steps.reduce<Record<string, CriticalStep[]>>((acc, step) => {
    const cat = step.category || "PatientManagement";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(step);
    return acc;
  }, {});

  const categoryOrder = ["TeamLeader", "PatientManagement", "CaseConclusion"];

  const isPass = result.finalRecommendation === "PASS";
  const scenCat = result.scenarioCategory || "Unknown";
  const scenCfg = SCENARIO_CATEGORY_CONFIG[scenCat] || SCENARIO_CATEGORY_CONFIG.Unknown;

  const exportPDF = () => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const m = 20;

    doc.setFillColor(60, 16, 83);
    doc.rect(0, 0, pw, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("PALS Clinical Training Assessment", pw / 2, 16, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Student Information", m, 38);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${result.studentName}`, m, 47);
    doc.text(`Date: ${new Date(result.uploadDate).toLocaleString()}`, m, 54);
    doc.text(`Score: ${result.overallScore}%`, m, 61);
    doc.text(`Recommendation: ${result.finalRecommendation || "N/A"}`, m, 68);
    doc.text(`Scenario: ${result.scenarioIdentified || "N/A"}`, m, 75);
    doc.text(`Category: ${result.scenarioCategory || "N/A"}`, m, 82);

    if (result.studentSummary) {
      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text("Summary", m, 95);
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(result.studentSummary, pw - m * 2);
      doc.text(lines, m, 103);
    }

    if (steps.length > 0) {
      doc.addPage();
      doc.setFillColor(60, 16, 83);
      doc.rect(0, 0, pw, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("Critical Performance Steps", pw / 2, 16, { align: "center" });

      autoTable(doc, {
        head: [["Step", "Category", "Digital Twin Expected", "Student Performed", "Grade"]],
        body: steps.map(s => [
          s.stepName,
          s.category,
          s.digitalTwinExpected || "—",
          s.studentPerformed || "Not observed",
          s.grade === "NotObserved" ? "N/O" : s.grade,
        ]),
        startY: 30,
        theme: "striped",
        headStyles: { fillColor: [60, 16, 83], textColor: [255, 255, 255], fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40 },
          4: { cellWidth: 14, halign: "center" },
        },
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "top" },
        margin: { left: m, right: m },
      });
    }

    doc.save(`${result.studentName}_PALS_Assessment.pdf`);
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-white">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-[#3C1053]" />
            <h2 className="text-xl font-semibold text-gray-900">Performance Assessment</h2>
          </div>
          <p className="text-sm text-gray-700 font-medium">{result.studentName}</p>
          <p className="text-xs text-gray-500">{new Date(result.uploadDate).toLocaleString()}</p>
          {result.scenarioIdentified && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${scenCfg.color} ${scenCfg.bg} ${scenCfg.border}`}>
                <ClipboardList className="w-3 h-3" />
                {result.scenarioCategory}
              </span>
              <span className="text-xs text-indigo-600 font-medium">
                {result.scenarioIdentified}
              </span>
            </div>
          )}
        </div>

        {result.finalRecommendation && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
            isPass
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-red-100 text-red-700 border border-red-200"
          }`}>
            {isPass
              ? <ShieldCheck className="w-4 h-4" />
              : <ShieldAlert className="w-4 h-4" />}
            {isPass ? "PASS" : "Needs Remediation"}
          </div>
        )}
      </div>

      {/* ── Score summary ── */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-5 mb-6 border border-indigo-100">
        <div className="flex items-center gap-6">
          <ScoreRing score={result.overallScore} />
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { label: "Correct",       count: gradeA, color: "text-emerald-600", bar: "bg-emerald-500" },
              { label: "Incorrect",     count: gradeB, color: "text-amber-600",   bar: "bg-amber-500" },
              { label: "Not Performed", count: gradeC, color: "text-red-600",     bar: "bg-red-400" },
            ].map(({ label, count, color, bar }) => (
              <div key={label} className="text-center bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                <span className={`text-2xl font-bold ${color}`}>{count}</span>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar} rounded-full transition-all`}
                    style={{ width: totalSteps ? `${(count / totalSteps) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AHA PALS pass rule reminder */}
        <div className="mt-4 flex items-start gap-2 bg-white/60 rounded-lg px-3 py-2 border border-indigo-100">
          <ShieldCheck className="w-4 h-4 text-[#3C1053] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-[#3C1053]">AHA PALS Pass Rule: </span>
            All critical performance steps must be completed correctly. Any missed step results in{" "}
            <span className="font-semibold">Needs Remediation (NR)</span>.
          </p>
        </div>

        {result.studentSummary && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed border-t border-indigo-100 pt-3">
            {result.studentSummary}
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="comparison" className="flex items-center gap-1.5 text-xs">
            <Brain className="w-3.5 h-3.5" />Step Comparison
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center gap-1.5 text-xs">
            <Bot className="w-3.5 h-3.5" />AI Analysis
          </TabsTrigger>
          <TabsTrigger value="raw-data" className="flex items-center gap-1.5 text-xs">
            <Code2 className="w-3.5 h-3.5" />Raw Data
          </TabsTrigger>
        </TabsList>

        {/* ══ CRITICAL PERFORMANCE STEPS TAB ══ */}
        <TabsContent value="comparison" className="space-y-6">
          {steps.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No step-by-step data available.</p>
              <p className="text-xs text-gray-400 mt-1">Check the AI Analysis tab for narrative feedback.</p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-500 font-medium self-center">Legend:</span>
                {(["A", "B", "C"] as const).map(g => {
                  const c = GRADE_CONFIG[g];
                  const I = c.icon;
                  return (
                    <span key={g} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.badge}`}>
                      <I className="w-3.5 h-3.5" />
                      Grade {g} — {c.label}
                    </span>
                  );
                })}
              </div>

              {/* Steps grouped by category */}
              {categoryOrder
                .filter(cat => stepsByCategory[cat]?.length > 0)
                .map(cat => {
                  const catSteps = stepsByCategory[cat];
                  const catCfg = CATEGORY_CONFIG[cat] || { label: cat, color: "text-gray-700", dot: "bg-gray-400" };
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${catCfg.dot}`} />
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${catCfg.color}`}>
                          {catCfg.label}
                        </h3>
                        <span className="text-xs text-gray-400 ml-1">({catSteps.length} steps)</span>
                      </div>
                      <div className="space-y-2 pl-4">
                        {catSteps.map(step => <StepCard key={step.stepId} step={step} />)}
                      </div>
                    </div>
                  );
                })}

              {/* Debriefing Step */}
              {result.debriefingStep && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700">
                      Case Conclusion / Debriefing
                    </h3>
                    <span className="text-xs text-gray-400 ml-1">(scope of practice)</span>
                  </div>
                  <div className="pl-4">
                    <DebriefingCard step={result.debriefingStep} />
                  </div>
                </div>
              )}

              {/* Strengths & Improvements */}
              {(result.strengths.length > 0 || result.improvements.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  {result.strengths.length > 0 && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-sm font-bold text-emerald-800">Strengths</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-emerald-700 flex gap-2">
                            <span className="text-emerald-400 flex-shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.improvements.length > 0 && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <h4 className="text-sm font-bold text-red-800">Areas for Improvement</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-red-700 flex gap-2">
                            <span className="text-red-400 flex-shrink-0">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Overall conclusion */}
              {result.overallConclusion && (
                <div className="rounded-xl bg-gradient-to-br from-[#3C1053]/5 to-indigo-50 border border-[#3C1053]/15 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-[#3C1053]" />
                    <h4 className="text-sm font-bold text-[#3C1053]">Instructor Conclusion</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.overallConclusion}</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ══ AI ANALYSIS TAB ══ */}
        <TabsContent value="ai-analysis" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-[#3C1053]" />
            <h3 className="font-semibold text-gray-900">AI-Generated Feedback</h3>
          </div>
          {result.detailedFeedback ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {result.detailedFeedback}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No AI analysis available</p>
            </div>
          )}
        </TabsContent>

        {/* ══ RAW DATA TAB ══ */}
        <TabsContent value="raw-data" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Complete n8n Response</h3>
          </div>
          {result.rawResponse ? (
            <div className="bg-gray-900 rounded-xl p-5 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(result.rawResponse, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <Code2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No raw data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Export */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Button onClick={exportPDF} className="bg-[#3C1053] hover:bg-[#2a0b3a] text-white">
          <Download className="w-4 h-4 mr-2" />
          Export Full Report as PDF
        </Button>
      </div>
    </Card>
  );
}
