import { VideoAnalysisUpload } from "@/components/ui/video-analysis-upload";
import { VideoAnalysisResults } from "@/components/ui/video-analysis-results";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function VideoAnalysis() {
  const { t } = useTranslation('videoAnalysis');
  const [historyAnalysisData, setHistoryAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false); // Don't show loading by default
  const [hasError, setHasError] = useState(false);
  const [location] = useLocation();

  // Reset to upload state when user clicks header button
  const resetToUploadState = () => {
    setHistoryAnalysisData(null);
    setHasError(false);
    sessionStorage.removeItem('videoAnalysisData');
    // Reset state silently
  };

  // Check for video analysis data from history navigation
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        // Check URL parameters for history data first
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const dataParam = urlParams.get('data');
        
        // Check if we have data to load before showing loading state
        const hasUrlData = tabParam === 'video' && dataParam && dataParam !== 'null';
        const hasStoredData = sessionStorage.getItem('videoAnalysisData');
        
        // Only show loading if we have data to load
        if (hasUrlData || hasStoredData) {
          if (isMounted) {
            setIsLoading(true);
            setHasError(false);
          }
        }
        
        if (hasUrlData) {
          try {
            const parsedData = JSON.parse(decodeURIComponent(dataParam));
            // Loaded video analysis data from URL params
            if (isMounted) {
              setHistoryAnalysisData(parsedData);
              setIsLoading(false);
            }
            return;
          } catch (error) {
            // Log quietly in development only
            if (import.meta.env.MODE === 'development') {
              console.error('Error parsing URL data:', error);
            }
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
            return;
          }
        }

        // Check sessionStorage for history data
        if (hasStoredData) {
          try {
            const parsedData = JSON.parse(hasStoredData);
            // Loaded video analysis data from sessionStorage
            if (isMounted) {
              setHistoryAnalysisData(parsedData);
              setIsLoading(false);
              // Clean up after loading
              sessionStorage.removeItem('videoAnalysisData');
            }
          } catch (error) {
            // Log quietly in development only
            if (import.meta.env.MODE === 'development') {
              console.error('Error parsing stored video analysis data:', error);
            }
            if (isMounted) {
              setHasError(true);
              setIsLoading(false);
            }
          }
        } else if (!tabParam) {
          // No history data and no tab param = fresh navigation from header
          if (isMounted) {
            resetToUploadState();
          }
        }
      } catch (error) {
        // Log quietly in development only
        if (import.meta.env.MODE === 'development') {
          console.error('Unexpected error in video analysis loading:', error);
        }
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    // Listen for custom event when history data is updated
    const handleDataUpdate = () => {
      if (isMounted) {
        loadData();
      }
    };
    
    window.addEventListener('videoAnalysisDataUpdated', handleDataUpdate);
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      window.removeEventListener('videoAnalysisDataUpdated', handleDataUpdate);
    };
  }, [location]);

  return (
    <div className="min-h-screen bg-athlete-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
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
                  // Clear any stored data
                  sessionStorage.removeItem('videoAnalysisData');
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
          <VideoAnalysisResults analysisData={historyAnalysisData} sport={historyAnalysisData.sport} />
        ) : (
          <VideoAnalysisUpload />
        )}
      </div>
    </div>
  );
}