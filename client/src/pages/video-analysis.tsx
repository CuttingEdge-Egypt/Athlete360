import { VideoAnalysisUpload } from "@/components/ui/video-analysis-upload";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function VideoAnalysis() {
  const [historyAnalysisData, setHistoryAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [location] = useLocation();

  // Reset to upload state when user clicks header button
  const resetToUploadState = () => {
    setHistoryAnalysisData(null);
    setHasError(false);
    sessionStorage.removeItem('videoAnalysisData');
    console.log('Reset video analysis to upload state');
  };

  // Check for video analysis data from history navigation
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setHasError(false);
        
        // Check URL parameters for history data first
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const dataParam = urlParams.get('data');
        
        if (tabParam === 'video' && dataParam && dataParam !== 'null') {
          try {
            const parsedData = JSON.parse(decodeURIComponent(dataParam));
            console.log('Loaded video analysis data from URL params:', parsedData);
            if (isMounted) {
              setHistoryAnalysisData(parsedData);
              setIsLoading(false);
            }
            return;
          } catch (error) {
            console.error('Error parsing URL data:', error);
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
            return;
          }
        }

        // Check sessionStorage for history data
        const storedData = sessionStorage.getItem('videoAnalysisData');
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
            console.log('Loaded video analysis data from sessionStorage:', parsedData);
            if (isMounted) {
              setHistoryAnalysisData(parsedData);
              // Clean up after loading
              sessionStorage.removeItem('videoAnalysisData');
            }
          } catch (error) {
            console.error('Error parsing stored video analysis data:', error);
            if (isMounted) {
              setHasError(true);
            }
          }
        } else if (!tabParam) {
          // No history data and no tab param = fresh navigation from header
          if (isMounted) {
            resetToUploadState();
          }
        }

        // Add small delay to prevent white screen flash, but ensure component is still mounted
        await new Promise(resolve => setTimeout(resolve, 200));
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Unexpected error in video analysis loading:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [location]);

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
            <p className="text-red-700 dark:text-red-300 mb-4">
              There was an issue loading the video analysis data. This might happen if the analysis data is corrupted or the session has expired.
            </p>
            <div className="flex space-x-3">
              <Button 
                onClick={() => {
                  setHasError(false);
                  setHistoryAnalysisData(null);
                  setIsLoading(true);
                  // Clear any stored data and retry
                  sessionStorage.removeItem('videoAnalysisData');
                  setTimeout(() => setIsLoading(false), 300);
                }}
                variant="outline"
                className="border-red-400 text-red-600 hover:bg-red-50"
                data-testid="button-retry-loading"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => {
                  resetToUploadState();
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-upload-new"
              >
                Upload New Video
              </Button>
            </div>
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