import { VideoAnalysisUpload } from "@/components/ui/video-analysis-upload";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { useState, useEffect } from "react";

export default function VideoAnalysis() {
  const [historyAnalysisData, setHistoryAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Check for video analysis data from history navigation
  useEffect(() => {
    const storedData = sessionStorage.getItem('videoAnalysisData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log('Loaded video analysis data from sessionStorage:', parsedData);
        setHistoryAnalysisData(parsedData);
        // Clean up after loading
        sessionStorage.removeItem('videoAnalysisData');
      } catch (error) {
        console.error('Error parsing stored video analysis data:', error);
        setHasError(true);
      }
    }
    // Add small delay to prevent white screen flash
    setTimeout(() => setIsLoading(false), 100);
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
        
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-white">Loading video analysis...</span>
          </div>
        ) : hasError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">
              Error Loading Video Analysis
            </h3>
            <p className="text-red-700 dark:text-red-300">
              There was an issue loading the video analysis data. Please try again or upload a new video.
            </p>
          </div>
        ) : historyAnalysisData ? (
          <VideoAnalysisResults analysisData={historyAnalysisData} />
        ) : (
          <VideoAnalysisUpload />
        )}
      </div>
    </div>
  );
}