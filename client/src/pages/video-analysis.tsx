import { VideoAnalysisUpload } from "@/components/ui/video-analysis-upload";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { useState, useEffect } from "react";

export default function VideoAnalysis() {
  const [historyAnalysisData, setHistoryAnalysisData] = useState<any>(null);

  // Check for video analysis data from history navigation
  useEffect(() => {
    const storedData = sessionStorage.getItem('videoAnalysisData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setHistoryAnalysisData(parsedData);
        // Clean up after loading
        sessionStorage.removeItem('videoAnalysisData');
      } catch (error) {
        console.error('Error parsing stored video analysis data:', error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-athlete-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Video Analysis</h1>
          <p className="text-gray-400">
            Upload taekwondo match videos for comprehensive AI-powered analysis using Google Gemini
          </p>
        </div>
        
        {historyAnalysisData ? (
          <VideoAnalysisResults analysisData={historyAnalysisData} />
        ) : (
          <VideoAnalysisUpload />
        )}
      </div>
    </div>
  );
}