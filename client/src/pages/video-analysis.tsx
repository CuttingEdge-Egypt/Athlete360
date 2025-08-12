import { VideoAnalysisUpload } from "@/components/ui/video-analysis-upload";

export default function VideoAnalysis() {
  return (
    <div className="min-h-screen bg-athlete-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Video Analysis</h1>
          <p className="text-gray-400">
            Upload taekwondo match videos for comprehensive AI-powered analysis using Google Gemini
          </p>
        </div>
        
        <VideoAnalysisUpload />
      </div>
    </div>
  );
}