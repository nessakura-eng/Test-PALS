import { useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Upload, Video, X, Loader2, AudioLines } from "lucide-react";
import { toast } from "sonner";
import { GradingResult, CriticalStep, DebriefingStep } from "../App";
import { Alert, AlertDescription } from "./ui/alert";

interface VideoUploadProps {
  onGradingComplete: (result: GradingResult) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export function VideoUpload({ onGradingComplete, isProcessing, setIsProcessing }: VideoUploadProps) {
  const [studentName, setStudentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const N8N_WEBHOOK_URL = "https://flow.aclsai.com/webhook/audio-upload";

  const parseStructuredResponse = (raw: any): Partial<GradingResult> => {
    // Step 1: already the right shape
    if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw as any).criticalPerformanceSteps) {
      return raw as Partial<GradingResult>;
    }

    // Step 2: unwrap n8n envelope shapes
    let candidate: any = raw;
    if (Array.isArray(candidate)) candidate = candidate[0];
    if (candidate && typeof candidate === "object") {
      if (typeof candidate.output === "string")      candidate = candidate.output;
      else if (typeof candidate.text === "string")   candidate = candidate.text;
      else if (typeof candidate.result === "string") candidate = candidate.result;
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate) && (candidate as any).criticalPerformanceSteps) {
      return candidate as Partial<GradingResult>;
    }

    const text: string = typeof candidate === "string" ? candidate : JSON.stringify(candidate ?? raw);

    // Strip code fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const unwrapped = fenceMatch ? fenceMatch[1].trim() : text.trim();

    try {
      const parsed = JSON.parse(unwrapped);
      if (parsed && typeof parsed === "object") return parsed as Partial<GradingResult>;
    } catch (_) {}

    const braceMatch = unwrapped.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        const parsed = JSON.parse(braceMatch[0]);
        if (parsed && typeof parsed === "object") return parsed as Partial<GradingResult>;
      } catch (_) {}
    }

    return { detailedFeedback: text };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
        setSelectedFile(file);
        toast.success(`${file.type.startsWith("video/") ? "Video" : "Audio"} file selected`);
      } else {
        toast.error("Please select a valid video or audio file");
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) { toast.error("Please enter student name"); return; }
    if (!selectedFile) { toast.error("Please select a video file"); return; }

    setIsProcessing(true);
    const isVideo = selectedFile.type.startsWith("video/");
    const fileType = isVideo ? "video" : "audio";
    let loadingToast = toast.loading(`Uploading ${fileType} file...`);

    try {
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("studentName", studentName);

      setTimeout(() => {
        toast.loading(`Transcribing ${fileType} — this may take a few minutes...`, { id: loadingToast });
      }, 2000);
      if (isVideo) {
        setTimeout(() => {
          toast.loading("Video transcription in progress — please wait...", { id: loadingToast });
        }, 30000);
      }

      const response = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);

      toast.loading("Processing AI analysis...", { id: loadingToast });

      const contentType = response.headers.get("content-type");
      let rawData: any;
      if (contentType?.includes("application/json")) {
        rawData = await response.json();
      } else {
        rawData = await response.text();
      }

      const parsed = parseStructuredResponse(rawData);

      const gradingResult: GradingResult = {
        id: Date.now().toString(),
        studentName,
        uploadDate: new Date().toISOString(),
        overallScore: parsed.overallScore || 0,
        finalRecommendation: parsed.finalRecommendation || "",
        scenarioIdentified: parsed.scenarioIdentified || "",
        scenarioCategory: parsed.scenarioCategory || "Unknown",
        criticalPerformanceSteps: parsed.criticalPerformanceSteps || [],
        debriefingStep: parsed.debriefingStep,
        studentSummary: parsed.studentSummary || "",
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        videoUrl: isVideo ? URL.createObjectURL(selectedFile) : "",
        detailedFeedback: parsed.detailedFeedback || "",
        rawResponse: rawData,
        overallConclusion: parsed.overallConclusion || "",
      };

      toast.dismiss(loadingToast);
      toast.success("Analysis complete!");
      onGradingComplete(gradingResult);

      setStudentName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.dismiss(loadingToast);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error("Unable to connect to n8n webhook", {
          description: "Ensure n8n workflow is active and network is stable.",
          duration: 8000,
        });
      } else if (error instanceof Error) {
        toast.error("Failed to process video", { description: error.message, duration: 5000 });
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
      console.error("Error details:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-white">
      <div className="flex items-center gap-2 mb-6">
        <Upload className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Upload Training Recording</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="studentName" className="text-gray-700">Student Name</Label>
          <Input
            id="studentName"
            type="text"
            placeholder="Enter student's full name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            disabled={isProcessing}
            className="border-gray-300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mediaFile" className="text-gray-700">Training Video or Audio</Label>
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
            >
              <div className="flex items-center justify-center gap-3 mb-3">
                <Video className="w-10 h-10 text-gray-400" />
                <span className="text-gray-300 text-2xl">or</span>
                <AudioLines className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Click to upload video or audio</p>
              <p className="text-xs text-gray-500">Video: MP4, MOV, AVI | Audio: MP3, WAV, M4A</p>
              <input
                ref={fileInputRef}
                id="mediaFile"
                type="file"
                accept="video/*,audio/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded">
                    {selectedFile.type.startsWith("video/")
                      ? <Video className="w-5 h-5 text-blue-600" />
                      : <AudioLines className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {selectedFile.type.startsWith("video/") ? "Video" : "Audio"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={handleRemoveFile} disabled={isProcessing}
                  className="hover:bg-red-100 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isProcessing || !studentName || !selectedFile}
          className="w-full bg-[#3C1053] hover:bg-[#2a0b3a]"
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Performance...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />Upload & Analyze</>
          )}
        </Button>
      </form>
    </Card>
  );
}
