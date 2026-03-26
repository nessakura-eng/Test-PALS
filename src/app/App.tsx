import { useState } from "react";
import { VideoUpload } from "./components/VideoUpload";
import { GradingResults } from "./components/GradingResults";
import { HistoryPanel } from "./components/HistoryPanel";
import { Activity } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

// ─── Individual PALS Critical Performance Step ───────────────
export interface CriticalStep {
  stepId: string;
  stepName: string;
  category: string;
  digitalTwinExpected: string;
  studentPerformed: string;
  grade: "A" | "B" | "C" | "NotObserved";
  gradeJustification: string;
  clinicalImpact?: string;
}

export interface DebriefingStep {
  stepName: string;
  studentResponse: string;
  grade: "A" | "B" | "C";
  gradeJustification: string;
}

export interface GradingResult {
  id: string;
  studentName: string;
  uploadDate: string;
  overallScore: number;
  finalRecommendation: "PASS" | "NR" | "";
  scenarioIdentified: string;
  scenarioCategory: "Respiratory" | "Shock" | "Cardiac" | "Unknown";
  criticalPerformanceSteps: CriticalStep[];
  debriefingStep?: DebriefingStep;
  studentSummary: string;
  strengths: string[];
  improvements: string[];
  videoUrl: string;
  detailedFeedback: string;
  rawResponse?: any;
  overallConclusion?: string;
}

export default function App() {
  const [currentResult, setCurrentResult] = useState<GradingResult | null>(null);
  const [gradingHistory, setGradingHistory] = useState<GradingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGradingComplete = (result: GradingResult) => {
    setCurrentResult(result);
    setGradingHistory((prev) => [result, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Toaster />
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3C1053] rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">PALS Training Assessment</h1>
              <p className="text-sm text-gray-600">AI-Powered Paediatric Advanced Life Support Evaluation</p>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VideoUpload
              onGradingComplete={handleGradingComplete}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
            {currentResult && <GradingResults result={currentResult} />}
          </div>
          <div className="lg:col-span-1">
            <HistoryPanel
              history={gradingHistory}
              onSelectResult={setCurrentResult}
              currentResultId={currentResult?.id}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
