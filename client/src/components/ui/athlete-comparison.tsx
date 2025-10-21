import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelect } from "@/components/ui/country-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { ProgressBar } from "@/components/ui/progress-bar";
import { Flag } from "@/components/ui/flag";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { 
  Users2, 
  Zap, 
  Activity, 
  User, 
  Brain, 
  Trophy, 
  TrendingUp, 
  Target, 
  Star, 
  TrendingDown,
  Languages,
  Search,
  ChevronsUpDown,
  ChevronDown,
  Check,
  CalendarDays,
  RefreshCw,
  Sparkles,
  Eye,
  Loader2
} from "lucide-react";

type Sport = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
};

type Athlete = {
  id: string;
  name: string;
  nameArabic: string | null;
  country: string | null;
  rank: number | null;
  profileImageUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string | null;
  sportId: string;
};

type AthleteComparisonProps = {
  preloadedComparisonData?: any;
};

export function AthleteComparison({ preloadedComparisonData }: AthleteComparisonProps) {
  const { t, i18n } = useTranslation();
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCountry1, setSelectedCountry1] = useState("");
  const [selectedCountry2, setSelectedCountry2] = useState("");
  const [selectedAthlete1, setSelectedAthlete1] = useState("");
  const [selectedAthlete2, setSelectedAthlete2] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language === 'ar' ? 'arabic' : 'english');
  const [searchSport, setSearchSport] = useState("");
  const [searchAthlete1, setSearchAthlete1] = useState("");
  const [searchAthlete2, setSearchAthlete2] = useState("");
  const [openSportPopover, setOpenSportPopover] = useState(false);
  const [openAthletePopover1, setOpenAthletePopover1] = useState(false);
  const [openAthletePopover2, setOpenAthletePopover2] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const isComparisonArabic = selectedLanguage === 'arabic';
  const isArabic = i18n.language === 'ar';
  const abortControllerRef = useRef<AbortController | null>(null);
  const queueIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressPhase, setProgressPhase] = useState<{ message: string; progress: number; originalMessage?: string } | null>(null);
  const [comparisonData, setComparisonData] = useState(() => {
    console.log("AthleteComparison received preloadedComparisonData:", preloadedComparisonData);
    if (preloadedComparisonData) {
      return {
        ...preloadedComparisonData,
        isRawResponse: true,
        // Default structure to prevent errors
        athlete1: { name: "Athlete 1", country: "Unknown", rank: "N/A" },
        athlete2: { name: "Athlete 2", country: "Unknown", rank: "N/A" }
      };
    }
    return preloadedComparisonData || null;
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Preview modal state
  const [previewModal, setPreviewModal] = useState<{ open: boolean; serviceType: string | null }>({ open: false, serviceType: null });
  
  // Preview data types
  interface PreviewAnalysisItem {
    serviceType: string;
    resultData: any;
    createdAt: string;
  }

  interface PreviewApiResponse {
    success: boolean;
    data: PreviewAnalysisItem[];
    count: number;
  }

  // Fetch preview data based on site language
  const { data: previewData, isLoading: previewLoading } = useQuery<PreviewApiResponse>({
    queryKey: ['/api/preview/latest-by-type', i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/preview/latest-by-type?language=${i18n.language}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch preview data');
      return res.json();
    },
    enabled: previewModal.open && !!previewModal.serviceType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get the specific analysis data for the selected service type
  const getAnalysisForPreview = () => {
    if (!previewData?.data || !previewModal.serviceType) return null;
    return previewData.data.find((item: any) => item.serviceType === previewModal.serviceType);
  };

  const selectedPreviewAnalysis = getAnalysisForPreview();

  // Restore loading state from queue when component mounts or becomes active
  useEffect(() => {
    if (window.generationQueue && (window.generationQueue as any).getQueue) {
      const queue = (window.generationQueue as any).getQueue();
      const ongoingComparison = queue.find((item: any) => 
        item.serviceType === 'comparison' && 
        (item.status === 'running' || item.status === 'pending')
      );
      
      // Only restore if there's an ongoing comparison AND we're not already in an error state
      if (ongoingComparison && !progressPhase && !comparisonData) {
        console.log('[COMPARISON] Restoring loading state from queue:', ongoingComparison);
        queueIdRef.current = ongoingComparison.id;
        setIsLoading(true);
        
        // Translate the progress message from queue
        const translatedMessage = translateProgressMessage(ongoingComparison.progressMessage || 'Analyzing athlete profiles...');
        
        setProgressPhase({
          message: translatedMessage,
          progress: 15, // Start with initial progress
          originalMessage: ongoingComparison.progressMessage || 'Analyzing athlete profiles...'
        });
        setShowForm(false);
        
        // Reconnect WebSocket if needed
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/comparison-progress`);
          wsRef.current = ws;
        }
      }
    }
    
    // Poll queue status to detect if the comparison failed while we were on another tab
    const pollInterval = setInterval(() => {
      if (window.generationQueue && queueIdRef.current && (window.generationQueue as any).getQueue) {
        const queue = (window.generationQueue as any).getQueue();
        const currentItem = queue.find((item: any) => item.id === queueIdRef.current);
        
        if (currentItem && currentItem.status === 'error' && isLoading) {
          console.log('[COMPARISON] Detected error in queue, clearing loading state');
          setIsLoading(false);
          setProgressPhase(null);
          setShowForm(true);
        }
      }
    }, 500); // Check every 500ms
    
    return () => clearInterval(pollInterval);
  }, [isLoading]); // Re-run when loading state changes

  // Update comparison data when preloaded data changes
  useEffect(() => {
    if (preloadedComparisonData) {
      if (preloadedComparisonData?.isRawResponse) {
        setComparisonData({
          gptResponse: preloadedComparisonData.gptResponse,
          geminiResponse: preloadedComparisonData.geminiResponse,
          isRawResponse: true,
          athlete1: { name: "Athlete 1", country: "Unknown", rank: "N/A" },
          athlete2: { name: "Athlete 2", country: "Unknown", rank: "N/A" }
        });
      } else {
        setComparisonData(preloadedComparisonData);
      }
    }
  }, [preloadedComparisonData]);

  // Update language when site language changes
  useEffect(() => {
    setSelectedLanguage(i18n.language === 'ar' ? 'arabic' : 'english');
  }, [i18n.language]);

  // Re-translate progress message when language changes
  useEffect(() => {
    if (progressPhase?.originalMessage) {
      setProgressPhase(prev => prev ? {
        ...prev,
        message: translateProgressMessage(prev.originalMessage!)
      } : null);
    }
  }, [i18n.language]);

  // Helper function to translate backend progress messages
  const translateProgressMessage = (message: string): string => {
    const messageMap: Record<string, string> = {
      "Starting comparison...": t("analysis.comparison.startingComparison", "Starting comparison..."),
      "Loading athlete data...": t("analysis.comparison.loadingAthleteData", "Loading athlete data..."),
      "Analyzing athlete profiles...": t("analysis.comparison.analyzingAthleteProfiles", "Analyzing athlete profiles..."),
      "Overview complete, analyzing strengths...": t("analysis.comparison.overviewCompleteAnalyzingStrengths", "Overview complete, analyzing strengths..."),
      "Generating head-to-head prediction...": t("analysis.comparison.generatingHeadToHead", "Generating head-to-head prediction..."),
      "Finalizing comparison...": t("analysis.comparison.finalizingComparison", "Finalizing comparison...")
    };
    return messageMap[message] || message;
  };

  // WebSocket connection for progress updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ranking-progress`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to progress updates');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Received message:', data);
        // Accept all comparison-progress messages regardless of queueId
        // since we only have one active comparison at a time in this component
        if (data.type === 'comparison-progress') {
          console.log('[WS] Progress update:', data.progress, data.message);
          setProgressPhase({
            message: translateProgressMessage(data.message),
            progress: data.progress,
            originalMessage: data.message // Store original English message for re-translation
          });
        } else if (data.type === 'comparison-complete') {
          console.log('[WS] Comparison complete, fetching result');
          setIsLoading(false); // Clear loading state when comparison completes
          setProgressPhase(null); // Clear progress
          
          // Fetch the comparison result from history if we don't have it (e.g., user switched tabs)
          if (!comparisonData) {
            console.log('[WS] Fetching comparison data from API');
            fetch('/api/user-history?limit=1&serviceType=comparison', {
              credentials: 'include'
            })
              .then(res => res.json())
              .then(history => {
                if (history && history.length > 0) {
                  const latestComparison = history[0];
                  console.log('[WS] Loaded comparison data from history');
                  setComparisonData(latestComparison.resultData);
                  
                  toast({
                    title: t("analysis.comparison.comparisonComplete", "Comparison Complete"),
                    description: t("analysis.comparison.comparisonSuccess", "AI-powered athlete comparison generated successfully!"),
                  });
                }
              })
              .catch(err => console.error('[WS] Failed to fetch comparison:', err));
          }
          
          // Update queue status to completed using the correct queue ID
          if (window.generationQueue && queueIdRef.current) {
            window.generationQueue.update(queueIdRef.current, { status: 'completed' });
          }
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected from progress updates');
    };

    return () => {
      ws.close();
    };
  }, []);

  // Register cancel handler for comparison generations
  useEffect(() => {
    const originalCancelGeneration = window.cancelGeneration;

    const comparisonCancelHandler = (athleteName: string, serviceType: string) => {
      // Only handle comparison cancellation if we have an active controller
      if (serviceType === 'comparison' && abortControllerRef.current) {
        console.log('[COMPARISON] Cancelling comparison request:', athleteName);
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        // Don't clear queueIdRef - let the mutation's onSettled handler do it
        // so the onError handler can still update the queue status
        setProgressPhase(null); // Clear progress
        setIsLoading(false); // Clear loading state
        return; // Don't call original handler since we handled it
      }

      // Call original handler for other service types or if no active controller
      if (originalCancelGeneration) {
        originalCancelGeneration(athleteName, serviceType);
      }
    };

    window.cancelGeneration = comparisonCancelHandler;

    // Cleanup on unmount - only restore if our handler is still active
    return () => {
      // Only restore original handler if the current handler is still ours
      if (window.cancelGeneration === comparisonCancelHandler) {
        window.cancelGeneration = originalCancelGeneration;
      }
    };
  }, []);

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  // Get all countries
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ["/api/countries"],
  });

  // Get athletes for athlete 1 (by sport and country 1)
  const { data: allAthletes1 = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport, selectedCountry1, "athlete1"],
    enabled: !!selectedSport,
    queryFn: async () => {
      const url = new URL(`/api/athletes/by-sport/${selectedSport}`, window.location.origin);
      if (selectedCountry1) {
        url.searchParams.set('country', selectedCountry1);
      }
      const response = await fetch(url.toString());
      return response.json();
    }
  });

  // Get athletes for athlete 2 (by sport and country 2)
  const { data: allAthletes2 = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes/by-sport", selectedSport, selectedCountry2, "athlete2"],
    enabled: !!selectedSport,
    queryFn: async () => {
      const url = new URL(`/api/athletes/by-sport/${selectedSport}`, window.location.origin);
      if (selectedCountry2) {
        url.searchParams.set('country', selectedCountry2);
      }
      const response = await fetch(url.toString());
      return response.json();
    }
  });

  // Deduplicate athletes for athlete 1 with safety checks
  const athletes1 = Array.isArray(allAthletes1) ? allAthletes1.reduce((acc: Athlete[], current) => {
    if (!current || !current.name) return acc; // Skip invalid athletes

    const existingIndex = acc.findIndex(athlete => 
      athlete.name && athlete.name.toLowerCase().trim() === current.name.toLowerCase().trim()
    );

    if (existingIndex === -1) {
      acc.push(current);
    } else {
      // Keep the more recent record (or the one with more complete data)
      const existing = acc[existingIndex];
      const currentDate = new Date(current.updatedAt || current.createdAt || 0);
      const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);

      if (currentDate > existingDate || 
          (current.bio && current.bio.length > (existing.bio?.length || 0))) {
        acc[existingIndex] = current;
      }
    }

    return acc;
  }, []) : [];

  // Deduplicate athletes for athlete 2 with safety checks
  const athletes2 = Array.isArray(allAthletes2) ? allAthletes2.reduce((acc: Athlete[], current) => {
    if (!current || !current.name) return acc; // Skip invalid athletes

    const existingIndex = acc.findIndex(athlete => 
      athlete.name && athlete.name.toLowerCase().trim() === current.name.toLowerCase().trim()
    );

    if (existingIndex === -1) {
      acc.push(current);
    } else {
      // Keep the more recent record (or the one with more complete data)
      const existing = acc[existingIndex];
      const currentDate = new Date(current.updatedAt || current.createdAt || 0);
      const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);

      if (currentDate > existingDate || 
          (current.bio && current.bio.length > (existing.bio?.length || 0))) {
        acc[existingIndex] = current;
      }
    }

    return acc;
  }, []) : [];

  const comparisonMutation = useMutation({
    mutationFn: async () => {
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Initialize progress with original message for re-translation
      setIsLoading(true); // Set loading state
      setProgressPhase({ 
        message: t("analysis.comparison.startingComparison", "Starting comparison..."), 
        progress: 0,
        originalMessage: "Starting comparison..."
      });

      console.log('[COMPARISON] Sending request with queueId:', queueIdRef.current);

      const response = await apiRequest("POST", "/api/athletes/compare", {
        athlete1Id: selectedAthlete1,
        athlete2Id: selectedAthlete2,
        language: selectedLanguage,
        queueId: queueIdRef.current // Send queue ID to backend for progress tracking
      }, {
        signal: abortControllerRef.current.signal
      });
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonData(data);
      setProgressPhase(null); // Clear progress on success
      setIsLoading(false); // Clear loading state

      // Update queue to completed
      if (window.generationQueue && queueIdRef.current) {
        window.generationQueue.update(queueIdRef.current, { status: 'completed' });
      }

      // Invalidate history to show comparison immediately
      queryClient.invalidateQueries({ queryKey: ["/api/user-history"] });

      // Check for partial refund notification
      if (data.partialRefund) {
        toast({
          title: "Comparison Partially Complete",
          description: `Basic comparison generated successfully! Some detailed tabs couldn't be generated, so we've refunded ${data.partialRefund.amount} tokens.`,
          variant: "default",
        });
      } else {
        toast({
          title: t("analysis.comparison.comparisonComplete", "Comparison Complete"),
          description: t("analysis.comparison.comparisonSuccess", "AI-powered athlete comparison generated successfully!"),
        });
      }
    },
    onError: (error: any) => {
      setProgressPhase(null); // Clear progress on error
      setIsLoading(false); // Clear loading state
      setShowForm(true); // Show form again so user can retry

      // Check if this is a cancellation
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        // Don't show error toast for user-initiated cancellation
        return;
      }

      // Check if it's an insufficient tokens error (402)
      const isInsufficientTokens = 
        error?.status === 402 || 
        error?.response?.status === 402 ||
        error?.message?.toLowerCase().includes('insufficient');

      toast({
        title: isInsufficientTokens 
          ? t("errors.insufficientTokens", "Insufficient Tokens")
          : t("analysis.comparison.comparisonFailed", "Comparison Failed"),
        description: isInsufficientTokens
          ? "You don't have enough tokens to generate this comparison. Please purchase more tokens to continue."
          : error.message || t("analysis.comparison.comparisonError", "Failed to generate comparison"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Clean up abort controller and queue ID when mutation settles (success, error, or cancel)
      abortControllerRef.current = null;
      queueIdRef.current = null;
    },
  });

  // Cancel comparison handler
  const handleCancelComparison = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      // Don't clear queueIdRef yet - let the mutation's onSettled handler do it
      // so the onError handler can still update the queue status
      setProgressPhase(null);
      setIsLoading(false); // Clear loading state
      setShowForm(true); // Show form again after cancellation

      toast({
        title: "Comparison Cancelled",
        description: "The comparison has been cancelled.",
        variant: "default",
      });
    }
  };

  const handleCompare = () => {
    if (!selectedAthlete1 || !selectedAthlete2) {
      toast({
        title: t("analysis.comparison.selectionRequired", "Selection Required"),
        description: t("analysis.comparison.selectTwoAthletes", "Please select two athletes to compare"),
        variant: "destructive",
      });
      return;
    }

    if (selectedAthlete1 === selectedAthlete2) {
      toast({
        title: t("analysis.comparison.invalidSelection", "Invalid Selection"),
        description: t("analysis.comparison.selectDifferentAthletes", "Please select two different athletes"),
        variant: "destructive",
      });
      return;
    }

    // Get athlete names for queue display
    const athlete1 = athletes1.find(a => a && a.id === selectedAthlete1);
    const athlete2 = athletes2.find(a => a && a.id === selectedAthlete2);
    const comparisonName = `${athlete1?.name || 'Athlete 1'} vs ${athlete2?.name || 'Athlete 2'}`;

    // Add to generation queue if available and capture the queue ID
    if (window.generationQueue) {
      // Capture the queue ID returned by add() - this is the correct ID to use
      const queueId = window.generationQueue.add(comparisonName, 'comparison', false);
      queueIdRef.current = queueId;

      console.log('[COMPARISON] Generated queueId:', queueId);

      // Immediately update status to running when we start the mutation and add retry callback
      window.generationQueue.update(queueId, { 
        status: 'running', 
        progressMessage: t("analysis.comparison.analyzingAthleteProfiles", "Analyzing athlete profiles..."),
        onRetry: () => {
          // Retry comparison with the same athlete selections
          handleCompare();
        }
      });

      // Update queue status when mutation completes
      comparisonMutation.mutate(undefined, {
        onError: (error: any) => {
          // Check if this is a cancellation
          const isCancelled = error.name === 'AbortError' || error.message?.includes('aborted');

          // Check if it's an insufficient tokens error (402)
          const isInsufficientTokens = 
            error?.status === 402 || 
            error?.response?.status === 402 ||
            error?.message?.toLowerCase().includes('insufficient');

          if (window.generationQueue && queueIdRef.current) {
            if (isCancelled) {
              // Update queue status to show cancellation
              window.generationQueue.update(queueIdRef.current, { 
                status: 'error',
                error: 'Cancelled by user'
              });
            } else {
              window.generationQueue.update(queueIdRef.current, { 
                status: 'error',
                error: isInsufficientTokens 
                  ? 'Insufficient tokens' 
                  : (error.message || 'Comparison failed - tokens refunded')
              });
            }
          }

          // Show error toast with appropriate message (skip for cancellation)
          if (!isCancelled && window.showToast) {
            window.showToast(
              isInsufficientTokens ? "Insufficient Tokens" : "Comparison Failed",
              isInsufficientTokens 
                ? "You don't have enough tokens to generate this comparison. Please purchase more tokens to continue."
                : "Unable to generate comparison. Tokens have been refunded.",
              "destructive"
            );
          }
        }
      });
    } else {
      comparisonMutation.mutate();
    }
  };

  // Use comparisonData state that is initialized with preloaded data
  const availableAthletes1 = athletes1.filter((a: Athlete) => a && a.id && a.id !== selectedAthlete2);
  const availableAthletes2 = athletes2.filter((a: Athlete) => a && a.id && a.id !== selectedAthlete1);
  
  // Get full athlete objects for selected athletes
  const selectedAthleteObject1 = athletes1.find((a: Athlete) => a?.id === selectedAthlete1);
  const selectedAthleteObject2 = athletes2.find((a: Athlete) => a?.id === selectedAthlete2);
  
  // Filter athletes based on search
  const filteredAthletes1 = availableAthletes1.filter((athlete: Athlete) => {
    if (!searchAthlete1.trim()) return true;
    const searchLower = searchAthlete1.toLowerCase();
    return (
      athlete.name?.toLowerCase().includes(searchLower) ||
      athlete.nameArabic?.toLowerCase().includes(searchLower) ||
      athlete.country?.toLowerCase().includes(searchLower)
    );
  });
  
  const filteredAthletes2 = availableAthletes2.filter((athlete: Athlete) => {
    if (!searchAthlete2.trim()) return true;
    const searchLower = searchAthlete2.toLowerCase();
    return (
      athlete.name?.toLowerCase().includes(searchLower) ||
      athlete.nameArabic?.toLowerCase().includes(searchLower) ||
      athlete.country?.toLowerCase().includes(searchLower)
    );
  });

  // Filter sports based on search
  const filteredSports = Array.isArray(sports) ? sports.filter((sport: Sport) => {
    if (!searchSport.trim()) return true;
    const searchLower = searchSport.toLowerCase();
    return sport.name?.toLowerCase().includes(searchLower);
  }) : [];

  // Get selected sport name for display
  const selectedSportObject = Array.isArray(sports) ? sports.find((s: Sport) => s.id === selectedSport) : null;

  return (
    <>
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <div className={`flex justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
          <CardTitle className={`flex items-center gap-2 text-white ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Users2 className="h-5 w-5" />
            {t("analysis.comparison.title", "Athlete Comparison")}
          </CardTitle>
          {showForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewModal({ open: true, serviceType: 'comparison' })}
              disabled={previewLoading && previewModal.serviceType === 'comparison'}
              className={`border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 ${isArabic ? 'flex-row-reverse' : ''}`}
              data-testid="button-preview-comparison"
            >
              {previewLoading && previewModal.serviceType === 'comparison' ? (
                <Loader2 className={`h-4 w-4 animate-spin ${isArabic ? 'ml-2' : 'mr-2'}`} />
              ) : (
                <Eye className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
              )}
              {t('common:buttons.preview')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show "Generate New Comparison" button when results are displayed */}
        {comparisonData && !showForm && (
          <Button
            onClick={() => {
              setShowForm(true);
              setComparisonData(null);
            }}
            className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}
            data-testid="button-generate-new-comparison"
          >
            <Sparkles className="h-4 w-4" />
            {t("analysis.comparison.generateNew", "Generate New Comparison")}
          </Button>
        )}

        {/* Selection Form */}
        {showForm && (
          <>
            {/* Sport and Language Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium text-gray-300 ${isArabic ? 'text-right block' : ''}`}>
                  {t("analysis.comparison.sport", "Sport")}
                </label>
                <Popover open={openSportPopover} onOpenChange={setOpenSportPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openSportPopover}
                      className={`w-full justify-between bg-athlete-gray-700 border-gray-600 hover:bg-athlete-gray-600 text-white ${isArabic ? 'flex-row-reverse' : ''}`}
                      data-testid="select-sport"
                    >
                      <span className={`${!selectedSport && 'text-gray-400'}`}>
                        {selectedSportObject?.name || t("analysis.comparison.selectSport", "Select sport...")}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 opacity-50 ${isArabic ? 'mr-2' : 'ml-2'}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-athlete-gray-700 border-gray-600" align={isArabic ? "end" : "start"}>
                    <div className="p-2">
                      <div className="relative">
                        <Search className={`absolute top-2.5 h-4 w-4 text-gray-400 ${isArabic ? 'right-2' : 'left-2'}`} />
                        <Input
                          placeholder={t("analysis.comparison.searchSports", "Search sports...")}
                          value={searchSport}
                          onChange={(e) => setSearchSport(e.target.value)}
                          className={`!bg-athlete-gray-600 border-gray-500 !text-white placeholder:text-gray-400 ${isArabic ? 'pr-8 text-right' : 'pl-8'}`}
                          dir={isArabic ? 'rtl' : 'ltr'}
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredSports.length === 0 ? (
                        <div className={`p-4 text-center text-gray-400 ${isArabic ? 'text-right' : ''}`}>
                          {t("analysis.comparison.noSportsFound", "No sports found")}
                        </div>
                      ) : (
                        filteredSports.map((sport: Sport) => (
                          <button
                            key={sport.id}
                            onClick={() => {
                              setSelectedSport(sport.id);
                              setSelectedCountry1("");
                              setSelectedCountry2("");
                              setSelectedAthlete1("");
                              setSelectedAthlete2("");
                              setOpenSportPopover(false);
                              setSearchSport("");
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-athlete-gray-600 text-white transition-colors ${
                              selectedSport === sport.id ? 'bg-athlete-gray-600' : ''
                            } ${isArabic ? 'text-right' : ''}`}
                          >
                            {sport.name}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium text-gray-300 ${isArabic ? 'text-right block' : ''}`}>
                  {t("analysis.comparison.language", "Language")}
                </label>
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                  data-testid="select-language"
                >
                  <SelectTrigger className="bg-athlete-gray-700 border-gray-600" dir={isArabic ? 'rtl' : 'ltr'}>
                    <SelectValue placeholder={t("analysis.comparison.selectLanguage", "Select language...")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">
                      <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <Languages className="w-4 h-4" />
                        {t("analysis.comparison.english", "English")}
                      </div>
                    </SelectItem>
                    <SelectItem value="arabic">
                      <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <Languages className="w-4 h-4" />
                        {t("analysis.comparison.arabic", "عربي")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Two-Column Athlete Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Athlete 1 Column */}
              <Card className="bg-athlete-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className={`text-lg text-white flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <User className="h-5 w-5 text-blue-400" />
                    {t("analysis.comparison.athlete1", "Athlete 1")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Country Select for Athlete 1 */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium text-gray-300 ${isArabic ? 'text-right block' : ''}`}>
                      {t("analysis.comparison.country", "Country")}
                    </label>
                    <CountrySelect
                      value={selectedCountry1 || "all"}
                      onValueChange={(value) => {
                        setSelectedCountry1(value === "all" ? "" : value);
                        setSelectedAthlete1("");
                      }}
                      placeholder="All countries"
                      countries={Array.isArray(countries) ? countries : []}
                      testId="select-country1"
                    />
                  </div>

                  {/* Searchable Athlete Dropdown for Athlete 1 */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium text-gray-300 ${isArabic ? 'text-right block' : ''}`}>
                      {t("analysis.comparison.selectAthlete", "Select Athlete")}
                    </label>
                    <Popover open={openAthletePopover1} onOpenChange={setOpenAthletePopover1}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAthletePopover1}
                          className={`w-full justify-between bg-athlete-gray-700 border-gray-600 text-white hover:bg-athlete-gray-600 ${isArabic ? 'flex-row-reverse' : ''}`}
                          disabled={!selectedSport}
                          data-testid="select-athlete1"
                        >
                          {selectedAthleteObject1 ? (
                            <span className="truncate">{selectedAthleteObject1.name}</span>
                          ) : (
                            <span className="text-gray-400">
                              {selectedSport ? t("analysis.comparison.selectFirstAthlete", "Select first athlete...") : t("analysis.comparison.selectSportFirst", "Select a sport first")}
                            </span>
                          )}
                          <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${isArabic ? 'mr-2' : 'ml-2'}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-athlete-gray-700 border-gray-600" align="start">
                        <div className="p-3 border-b border-gray-600">
                          <div className="relative">
                            <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 ${isArabic ? 'right-3' : 'left-3'}`} />
                            <Input
                              placeholder={t("analysis.comparison.searchAthletes", "Search athletes...")}
                              value={searchAthlete1}
                              onChange={(e) => setSearchAthlete1(e.target.value)}
                              className={`!bg-athlete-gray-700 border-athlete-gray-600 !text-white placeholder:text-gray-400 focus:!bg-athlete-gray-700 focus:border-athlete-gray-500 ${isArabic ? 'pr-9' : 'pl-9'}`}
                              data-testid="input-athlete1-search"
                              dir={isArabic ? 'rtl' : 'ltr'}
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-auto">
                          {filteredAthletes1.length === 0 ? (
                            <div className="p-3 text-center text-gray-400">
                              {searchAthlete1 ? t("analysis.comparison.noAthletesFound", "No athletes found") : t("analysis.comparison.noAthletesAvailable", "No athletes available")}
                            </div>
                          ) : (
                            filteredAthletes1.map((athlete: Athlete) => (
                              <Button
                                key={athlete.id}
                                variant="ghost"
                                className={`w-full justify-start text-left hover:bg-athlete-gray-600 h-auto py-3 px-3 ${isArabic ? 'flex-row-reverse' : ''}`}
                                onClick={() => {
                                  setSelectedAthlete1(athlete.id);
                                  setOpenAthletePopover1(false);
                                  setSearchAthlete1("");
                                }}
                              >
                                <Check className={`h-4 w-4 flex-shrink-0 ${selectedAthlete1 === athlete.id ? 'opacity-100' : 'opacity-0'} ${isArabic ? 'ml-2' : 'mr-2'}`} />
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="text-white font-medium truncate">{athlete.name}</div>
                                  {athlete.nameArabic && (
                                    <div className="text-gray-400 text-sm truncate">{athlete.nameArabic}</div>
                                  )}
                                  <div className="text-xs text-gray-500 truncate">
                                    {athlete.country && `${athlete.country}`}
                                    {athlete.rank && ` • #${athlete.rank}`}
                                  </div>
                                </div>
                              </Button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Athlete 1 Profile Display */}
                  {selectedAthleteObject1 && (
                    <TooltipProvider>
                      <div className="mt-4">
                        {/* Last Update */}
                        {selectedAthleteObject1.updatedAt && (
                          <div className={`flex items-center ${isArabic ? 'gap-2 flex-row-reverse' : 'gap-2'} mb-2 ${isArabic ? 'text-base font-medium' : 'text-sm'} text-gray-300`}>
                            <CalendarDays className={`${isArabic ? 'w-5 h-5' : 'w-4 h-4'}`} />
                            <span>{t('interface.lastUpdate', 'Last Update')}: {new Date(selectedAthleteObject1.updatedAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                        
                        {/* Profile Card */}
                        <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          {/* Profile Image */}
                          <div className="relative w-16 h-16 flex-shrink-0">
                            {selectedAthleteObject1.profileImageUrl ? (
                              <img 
                                src={selectedAthleteObject1.profileImageUrl}
                                alt={selectedAthleteObject1.name}
                                className="w-16 h-16 rounded-full object-cover"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  img.style.display = 'none';
                                  const fallback = img.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-16 h-16 rounded-full bg-athlete-gray-600 flex items-center justify-center ${selectedAthleteObject1.profileImageUrl ? 'hidden' : 'flex'}`}
                            >
                              <User className="text-gray-400" size={24} />
                            </div>
                          </div>

                          {/* Athlete Info and Buttons */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold truncate">{selectedAthleteObject1.name}</h4>
                            {selectedAthleteObject1.nameArabic && (
                              <p className="text-gray-400 text-sm truncate">{selectedAthleteObject1.nameArabic}</p>
                            )}
                            <div className={`flex items-center gap-2 mt-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              <Flag country={selectedAthleteObject1.country || "US"} className="w-6 h-4 rounded shadow-sm" />
                              <span className="text-sm text-gray-400">{selectedAthleteObject1.country || "Unknown"}</span>
                            </div>
                            
                            {/* Update Info Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 w-full bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 text-xs"
                                  data-testid="button-update-info-athlete1"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isArabic ? 'ml-1' : 'mr-1'}`} />
                                  {t('athleteSearch.rankingUpdate.updateButton', 'Update Info')}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{t('athleteSearch.rankingUpdate.tooltip.help', 'Update athlete profile information')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </TooltipProvider>
                  )}
                </CardContent>
              </Card>

              {/* Athlete 2 Column */}
              <Card className="bg-athlete-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className={`text-lg text-white flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <User className="h-5 w-5 text-purple-400" />
                    {t("analysis.comparison.athlete2", "Athlete 2")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Country Select for Athlete 2 */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium text-gray-300 ${isArabic ? 'text-right block' : ''}`}>
                      {t("analysis.comparison.country", "Country")}
                    </label>
                    <CountrySelect
                      value={selectedCountry2 || "all"}
                      onValueChange={(value) => {
                        setSelectedCountry2(value === "all" ? "" : value);
                        setSelectedAthlete2("");
                      }}
                      placeholder="All countries"
                      countries={Array.isArray(countries) ? countries : []}
                      testId="select-country2"
                    />
                  </div>

                  {/* Searchable Athlete Dropdown for Athlete 2 */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium text-gray-300 ${isArabic ? 'text-right block' : ''}`}>
                      {t("analysis.comparison.selectAthlete", "Select Athlete")}
                    </label>
                    <Popover open={openAthletePopover2} onOpenChange={setOpenAthletePopover2}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAthletePopover2}
                          className={`w-full justify-between bg-athlete-gray-700 border-gray-600 text-white hover:bg-athlete-gray-600 ${isArabic ? 'flex-row-reverse' : ''}`}
                          disabled={!selectedSport}
                          data-testid="select-athlete2"
                        >
                          {selectedAthleteObject2 ? (
                            <span className="truncate">{selectedAthleteObject2.name}</span>
                          ) : (
                            <span className="text-gray-400">
                              {selectedSport ? t("analysis.comparison.selectSecondAthlete", "Select second athlete...") : t("analysis.comparison.selectSportFirst", "Select a sport first")}
                            </span>
                          )}
                          <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${isArabic ? 'mr-2' : 'ml-2'}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-athlete-gray-700 border-gray-600" align="start">
                        <div className="p-3 border-b border-gray-600">
                          <div className="relative">
                            <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 ${isArabic ? 'right-3' : 'left-3'}`} />
                            <Input
                              placeholder={t("analysis.comparison.searchAthletes", "Search athletes...")}
                              value={searchAthlete2}
                              onChange={(e) => setSearchAthlete2(e.target.value)}
                              className={`!bg-athlete-gray-700 border-athlete-gray-600 !text-white placeholder:text-gray-400 focus:!bg-athlete-gray-700 focus:border-athlete-gray-500 ${isArabic ? 'pr-9' : 'pl-9'}`}
                              data-testid="input-athlete2-search"
                              dir={isArabic ? 'rtl' : 'ltr'}
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-auto">
                          {filteredAthletes2.length === 0 ? (
                            <div className="p-3 text-center text-gray-400">
                              {searchAthlete2 ? t("analysis.comparison.noAthletesFound", "No athletes found") : t("analysis.comparison.noAthletesAvailable", "No athletes available")}
                            </div>
                          ) : (
                            filteredAthletes2.map((athlete: Athlete) => (
                              <Button
                                key={athlete.id}
                                variant="ghost"
                                className={`w-full justify-start text-left hover:bg-athlete-gray-600 h-auto py-3 px-3 ${isArabic ? 'flex-row-reverse' : ''}`}
                                onClick={() => {
                                  setSelectedAthlete2(athlete.id);
                                  setOpenAthletePopover2(false);
                                  setSearchAthlete2("");
                                }}
                              >
                                <Check className={`h-4 w-4 flex-shrink-0 ${selectedAthlete2 === athlete.id ? 'opacity-100' : 'opacity-0'} ${isArabic ? 'ml-2' : 'mr-2'}`} />
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="text-white font-medium truncate">{athlete.name}</div>
                                  {athlete.nameArabic && (
                                    <div className="text-gray-400 text-sm truncate">{athlete.nameArabic}</div>
                                  )}
                                  <div className="text-xs text-gray-500 truncate">
                                    {athlete.country && `${athlete.country}`}
                                    {athlete.rank && ` • #${athlete.rank}`}
                                  </div>
                                </div>
                              </Button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Athlete 2 Profile Display */}
                  {selectedAthleteObject2 && (
                    <TooltipProvider>
                      <div className="mt-4">
                        {/* Last Update */}
                        {selectedAthleteObject2.updatedAt && (
                          <div className={`flex items-center ${isArabic ? 'gap-2 flex-row-reverse' : 'gap-2'} mb-2 ${isArabic ? 'text-base font-medium' : 'text-sm'} text-gray-300`}>
                            <CalendarDays className={`${isArabic ? 'w-5 h-5' : 'w-4 h-4'}`} />
                            <span>{t('interface.lastUpdate', 'Last Update')}: {new Date(selectedAthleteObject2.updatedAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                        
                        {/* Profile Card */}
                        <div className={`flex items-start gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          {/* Profile Image */}
                          <div className="relative w-16 h-16 flex-shrink-0">
                            {selectedAthleteObject2.profileImageUrl ? (
                              <img 
                                src={selectedAthleteObject2.profileImageUrl}
                                alt={selectedAthleteObject2.name}
                                className="w-16 h-16 rounded-full object-cover"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  img.style.display = 'none';
                                  const fallback = img.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-16 h-16 rounded-full bg-athlete-gray-600 flex items-center justify-center ${selectedAthleteObject2.profileImageUrl ? 'hidden' : 'flex'}`}
                            >
                              <User className="text-gray-400" size={24} />
                            </div>
                          </div>

                          {/* Athlete Info and Buttons */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold truncate">{selectedAthleteObject2.name}</h4>
                            {selectedAthleteObject2.nameArabic && (
                              <p className="text-gray-400 text-sm truncate">{selectedAthleteObject2.nameArabic}</p>
                            )}
                            <div className={`flex items-center gap-2 mt-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                              <Flag country={selectedAthleteObject2.country || "US"} className="w-6 h-4 rounded shadow-sm" />
                              <span className="text-sm text-gray-400">{selectedAthleteObject2.country || "Unknown"}</span>
                            </div>
                            
                            {/* Update Info Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 w-full bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 text-xs"
                                  data-testid="button-update-info-athlete2"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isArabic ? 'ml-1' : 'mr-1'}`} />
                                  {t('athleteSearch.rankingUpdate.updateButton', 'Update Info')}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{t('athleteSearch.rankingUpdate.tooltip.help', 'Update athlete profile information')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </TooltipProvider>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Compare Button */}
            <Button
              onClick={() => {
                handleCompare();
                setShowForm(false);
              }}
              disabled={!selectedAthlete1 || !selectedAthlete2 || comparisonMutation.isPending}
              className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}
              data-testid="button-compare"
            >
              <Zap className="h-4 w-4" />
              {t("analysis.comparison.compareAthletes", "Compare Athletes")}
            </Button>
          </>
        )}

        {/* Progress Bar - Shown outside form so it remains visible during generation */}
        {(comparisonMutation.isPending || isLoading) && (
          <ProgressBar 
            isActive={true}
            currentPhase={progressPhase || undefined}
            onCancel={handleCancelComparison}
            className="mt-4"
          />
        )}

        {/* Parsed Comparison Results - New Modular Tab Structure */}
        {(comparisonData?.tabs || comparisonData?.isRawResponse) && (
          <div className="space-y-6 mt-8">
            <Separator className="bg-gray-600" />
            {(() => {
              // Parse modular tab responses
              let overviewData = null;
              let strengthsData = null;
              let weaknessesData = null;
              let competitionHistoryData = null;
              let headToHeadData = null;

              // Helper function to safely parse AI-generated JSON with cleanup
              const safeParseJSON = (rawResponse: string, tabName: string) => {
                if (!rawResponse?.trim()) {
                  // Return fallback when rawResponse is missing or empty
                  return getTabFallbackData(tabName);
                }

                try {
                  // First attempt: Direct parsing
                  return JSON.parse(rawResponse);
                } catch (error) {
                  console.warn(`First parse attempt failed for ${tabName}:`, error instanceof Error ? error.message : 'Unknown error');

                  try {
                    // Second attempt: Clean up common issues including markdown code blocks
                    let cleaned = rawResponse.trim();

                    // Remove markdown code fences if present
                    if (cleaned.startsWith('```')) {
                      // Remove opening fence (```json or just ```)
                      const firstNewline = cleaned.indexOf('\n');
                      if (firstNewline > 0) {
                        cleaned = cleaned.substring(firstNewline + 1);
                      }
                      // Remove closing fence
                      if (cleaned.endsWith('```')) {
                        cleaned = cleaned.substring(0, cleaned.length - 3);
                      }
                      cleaned = cleaned.trim();
                    }

                    // Find the earliest valid opening brace
                    const openBraceIndex = cleaned.indexOf('{');
                    const openBracketIndex = cleaned.indexOf('[');
                    const firstValidIndex = openBraceIndex >= 0 && openBracketIndex >= 0 
                      ? Math.min(openBraceIndex, openBracketIndex)
                      : Math.max(openBraceIndex, openBracketIndex);

                    if (firstValidIndex > 0) {
                      cleaned = cleaned.substring(firstValidIndex);
                    }

                    // Remove any text after the last } or ]
                    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
                    if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
                      cleaned = cleaned.substring(0, lastBrace + 1);
                    }

                    // Fix common JSON issues
                    cleaned = cleaned
                      .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces
                      .replace(/[\u201C\u201D]/g, '"') // Fix smart double quotes
                      .replace(/[\u2018\u2019]/g, "'") // Fix smart single quotes
                      .replace(/–/g, '-') // Fix em dashes
                      .replace(/—/g, '-') // Fix en dashes
                      .replace(/\u00A0/g, ' '); // Fix non-breaking spaces

                    return JSON.parse(cleaned);
                  } catch (secondError) {
                    console.warn(`Cleanup parsing failed for ${tabName}:`, secondError instanceof Error ? secondError.message : 'Unknown error');

                    // Third attempt: Extract JSON-like content with lazy regex
                    try {
                      const jsonMatch = rawResponse.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/);
                      if (jsonMatch) {
                        const extracted = jsonMatch[0]
                          .replace(/[\r\n\t]/g, ' ')
                          .replace(/[\u201C\u201D]/g, '"')
                          .replace(/[\u2018\u2019]/g, "'")
                          .replace(/–/g, '-')
                          .replace(/—/g, '-')
                          .replace(/\u00A0/g, ' ');
                        return JSON.parse(extracted);
                      }
                    } catch (thirdError) {
                      console.warn(`Regex extraction failed for ${tabName}:`, thirdError instanceof Error ? thirdError.message : 'Unknown error');
                    }

                    // Final fallback: Return tab-specific default structure
                    console.warn(`All parsing attempts failed for ${tabName}. Using fallback data.`);
                    return getTabFallbackData(tabName);
                  }
                }
              };

              // Helper function to provide fallback data for each tab
              const getTabFallbackData = (tabName: string) => {
                switch (tabName) {
                  case 'overview':
                    return {
                      athlete1: { name: "Athlete 1", country: "Unknown", rank: "N/A" },
                      athlete2: { name: "Athlete 2", country: "Unknown", rank: "N/A" },
                      overallAnalysis: "Analysis temporarily unavailable due to data parsing issues. Please try generating the comparison again."
                    };
                  case 'strengths':
                    return {
                      strengths: {
                        athlete1: [
                          {
                            title: "Analysis Pending",
                            description: "AI models encountered parsing issues while analyzing this athlete's strengths. The data was generated but couldn't be processed correctly.",
                            evidence: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        athlete2: [
                          {
                            title: "Analysis Pending", 
                            description: "AI models encountered parsing issues while analyzing this athlete's strengths. The data was generated but couldn't be processed correctly.",
                            evidence: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        summary: "Strengths analysis was generated by AI but failed to parse due to formatting issues. Try generating a new comparison."
                      }
                    };
                  case 'weaknesses':
                    return {
                      weaknesses: {
                        athlete1: [
                          {
                            title: "Analysis Pending",
                            description: "AI models encountered parsing issues while analyzing this athlete's areas for improvement. The data was generated but couldn't be processed correctly.",
                            exploitation: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        athlete2: [
                          {
                            title: "Analysis Pending",
                            description: "AI models encountered parsing issues while analyzing this athlete's areas for improvement. The data was generated but couldn't be processed correctly.", 
                            exploitation: "Please regenerate comparison for complete analysis"
                          }
                        ],
                        summary: "Weaknesses analysis was generated by AI but failed to parse due to formatting issues. Try generating a new comparison."
                      }
                    };
                  case 'competitionHistory':
                    return {
                      ranking: {
                        comparison: "Competition history analysis was generated by AI but encountered parsing issues. The comprehensive ranking and competitive comparison data couldn't be processed correctly due to formatting problems.",
                        competitiveEdge: null,
                        details: "Please try generating a new comparison to get the complete competition history analysis."
                      }
                    };
                  case 'headToHead':
                    return {
                      headToHead: {
                        prediction: null,
                        reasoning: "Head-to-head prediction analysis was generated by AI but encountered parsing issues. The detailed matchup prediction and strategic insights couldn't be processed correctly due to formatting problems.",
                        keyFactors: ["Analysis pending - please regenerate comparison for complete head-to-head insights"]
                      }
                    };
                  default:
                    return { error: "Data temporarily unavailable" };
                }
              };

              // New modular approach - parse each tab separately with robust error handling
              if (comparisonData.tabs) {
                overviewData = safeParseJSON(comparisonData.tabs.overview?.rawResponse, 'overview');
                strengthsData = safeParseJSON(comparisonData.tabs.strengths?.rawResponse, 'strengths');
                weaknessesData = safeParseJSON(comparisonData.tabs.weaknesses?.rawResponse, 'weaknesses');
                competitionHistoryData = safeParseJSON(comparisonData.tabs.competitionHistory?.rawResponse, 'competitionHistory');
                headToHeadData = safeParseJSON(comparisonData.tabs.headToHead?.rawResponse, 'headToHead');
              } else {
                // Legacy fallback for old response format
                try {
                  if (comparisonData.gptResponse?.rawResponse) {
                    let cleanedGpt = comparisonData.gptResponse.rawResponse.trim();
                    if (!cleanedGpt.endsWith('}')) {
                      const lastBrace = cleanedGpt.lastIndexOf('}');
                      if (lastBrace > 0) {
                        cleanedGpt = cleanedGpt.substring(0, lastBrace + 1);
                      }
                    }
                    const legacyData = JSON.parse(cleanedGpt);
                    overviewData = {
                      athlete1: legacyData.athlete1,
                      athlete2: legacyData.athlete2,
                      overallAnalysis: legacyData.overallAnalysis
                    };
                    strengthsData = { strengths: legacyData.strengths };
                    weaknessesData = { weaknesses: legacyData.weaknesses };
                    competitionHistoryData = { ranking: legacyData.ranking };
                    headToHeadData = { headToHead: legacyData.headToHead };
                  }
                } catch (error) {
                  console.warn('Could not parse legacy response:', error instanceof Error ? error.message : 'Unknown error');
                }
              }

              // Create unified data structure for rendering
              const parsedData = {
                athlete1: comparisonData.athlete1 || overviewData?.athlete1 || { name: "Athlete 1", country: "Unknown", rank: "N/A" },
                athlete2: comparisonData.athlete2 || overviewData?.athlete2 || { name: "Athlete 2", country: "Unknown", rank: "N/A" },
                strengths: strengthsData?.strengths,
                weaknesses: weaknessesData?.weaknesses,
                ranking: competitionHistoryData?.ranking,
                headToHead: headToHeadData?.headToHead,
                overallAnalysis: overviewData?.overallAnalysis,
                predictions: comparisonData.predictions || {}
              };

              return (
                <div dir={isComparisonArabic ? 'rtl' : 'ltr'}>
                  {/* Athlete Headers */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-athlete-gray-600 flex items-center justify-center mx-auto mb-3 overflow-hidden border-2 border-blue-500/50">
                        {parsedData.athlete1?.profileImageUrl ? (
                          <img 
                            src={parsedData.athlete1.profileImageUrl} 
                            alt={parsedData.athlete1.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                            }}
                          />
                        ) : (
                          <User className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white break-words leading-tight px-2">{parsedData.athlete1?.name || "Athlete 1"}</h3>
                      <Badge variant="outline" className="mt-2">
                        {parsedData.athlete1?.country || "Unknown"}
                      </Badge>

                      {/* Rankings Display - Same as Athlete Card */}
                      {parsedData.athlete1?.rankings?.categories && parsedData.athlete1.rankings.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {parsedData.athlete1.rankings.categories.map((rankingCategory: any, index: number) => {
                            const isOlympic = rankingCategory.category.toLowerCase().includes('olympic');
                            const isContinental = rankingCategory.category.toLowerCase().includes('continental') || 
                                                 rankingCategory.category.toLowerCase().includes('europe') ||
                                                 rankingCategory.category.toLowerCase().includes('asia') ||
                                                 rankingCategory.category.toLowerCase().includes('africa') ||
                                                 rankingCategory.category.toLowerCase().includes('americas');
                            const isNational = rankingCategory.category.toLowerCase().includes('national');

                            let bgGradient = 'from-orange-400 via-orange-500 to-orange-600';
                            let textColor = 'text-white';

                            if (isOlympic) {
                              bgGradient = 'from-yellow-400 via-yellow-500 to-amber-500';
                              textColor = 'text-gray-900';
                            } else if (isContinental) {
                              bgGradient = 'from-green-400 via-green-500 to-green-600';
                            } else if (isNational) {
                              bgGradient = 'from-blue-400 via-blue-500 to-blue-600';
                            }

                            return (
                              <div 
                                key={index}
                                className={`inline-flex items-center px-3 py-1.5 bg-gradient-to-r ${bgGradient} rounded-lg shadow-md`}
                                data-testid={`badge-rank-athlete1-${index}`}
                              >
                                <Trophy className={`w-3 h-3 ${textColor} ${isComparisonArabic ? 'ml-1.5' : 'mr-1.5'}`} />
                                <span className={`font-bold text-xs ${textColor}`}>
                                  #{rankingCategory.rank} | {rankingCategory.category}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-athlete-gray-600 flex items-center justify-center mx-auto mb-3 overflow-hidden border-2 border-purple-500/50">
                        {parsedData.athlete2?.profileImageUrl ? (
                          <img 
                            src={parsedData.athlete2.profileImageUrl} 
                            alt={parsedData.athlete2.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                            }}
                          />
                        ) : (
                          <User className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white break-words leading-tight px-2">{parsedData.athlete2?.name || "Athlete 2"}</h3>
                      <Badge variant="outline" className="mt-2">
                        {parsedData.athlete2?.country || "Unknown"}
                      </Badge>

                      {/* Rankings Display - Same as Athlete Card */}
                      {parsedData.athlete2?.rankings?.categories && parsedData.athlete2.rankings.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {parsedData.athlete2.rankings.categories.map((rankingCategory: any, index: number) => {
                            const isOlympic = rankingCategory.category.toLowerCase().includes('olympic');
                            const isContinental = rankingCategory.category.toLowerCase().includes('continental') || 
                                                 rankingCategory.category.toLowerCase().includes('europe') ||
                                                 rankingCategory.category.toLowerCase().includes('asia') ||
                                                 rankingCategory.category.toLowerCase().includes('africa') ||
                                                 rankingCategory.category.toLowerCase().includes('americas');
                            const isNational = rankingCategory.category.toLowerCase().includes('national');

                            let bgGradient = 'from-orange-400 via-orange-500 to-orange-600';
                            let textColor = 'text-white';

                            if (isOlympic) {
                              bgGradient = 'from-yellow-400 via-yellow-500 to-amber-500';
                              textColor = 'text-gray-900';
                            } else if (isContinental) {
                              bgGradient = 'from-green-400 via-green-500 to-green-600';
                            } else if (isNational) {
                              bgGradient = 'from-blue-400 via-blue-500 to-blue-600';
                            }

                            return (
                              <div 
                                key={index}
                                className={`inline-flex items-center px-3 py-1.5 bg-gradient-to-r ${bgGradient} rounded-lg shadow-md`}
                                data-testid={`badge-rank-athlete2-${index}`}
                              >
                                <Trophy className={`w-3 h-3 ${textColor} ${isComparisonArabic ? 'ml-1.5' : 'mr-1.5'}`} />
                                <span className={`font-bold text-xs ${textColor}`}>
                                  #{rankingCategory.rank} | {rankingCategory.category}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabbed Analysis */}
                  <Tabs defaultValue="overview" className="w-full mt-8">
                    <TabsList className="grid w-full grid-cols-5 bg-athlete-gray-700">
                      <TabsTrigger value="overview" data-testid="tab-overview">{t('analysis.comparison.tabOverview', 'Overview')}</TabsTrigger>
                      <TabsTrigger value="strengths" data-testid="tab-strengths">{t('analysis.comparison.tabStrengths', 'Strengths')}</TabsTrigger>
                      <TabsTrigger value="weaknesses" data-testid="tab-weaknesses">{t('analysis.comparison.tabWeaknesses', 'Weaknesses')}</TabsTrigger>
                      <TabsTrigger value="ranking" data-testid="tab-ranking">{t('analysis.comparison.tabCompetitionHistory', 'Competition History')}</TabsTrigger>
                      <TabsTrigger value="head-to-head" data-testid="tab-head-to-head">{t('analysis.comparison.tabHeadToHead', 'Head-to-Head')}</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-4">
                          <div className={`flex items-center gap-2 mb-3 ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                            <Brain className="h-5 w-5 text-blue-400" />
                            <h4 className="font-semibold text-white">{t('analysis.comparison.overallAnalysis', 'Overall Analysis')}</h4>
                          </div>
                          {parsedData.overallAnalysis?.summary ? (
                            <p className={`text-gray-300 leading-relaxed ${isComparisonArabic ? 'text-right' : ''}`}>
                              {parsedData.overallAnalysis.summary}
                            </p>
                          ) : (
                            <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                              <p className={`text-yellow-300 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.overallAnalysisNotAvailable', 'Overall analysis not available')}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Final Predicted Winner */}
                      <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-purple-600">
                        <CardContent className="p-6 text-center">
                          <Target className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                          <div className="text-sm text-gray-400 mb-2">{t('analysis.comparison.finalPredictedWinner', 'Final Predicted Winner')}</div>
                          <div className="text-2xl font-bold text-white mb-2">
                            {parsedData.headToHead?.prediction === 'athlete1' ? parsedData.athlete1?.name :
                             parsedData.headToHead?.prediction === 'athlete2' ? parsedData.athlete2?.name : t('analysis.comparison.evenMatch', 'Even Match')}
                          </div>
                          {parsedData.headToHead?.confidence && (
                            <div className="text-sm text-purple-300">
                              {parsedData.headToHead.confidence}% {t('analysis.comparison.confidence', 'confidence')}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Strengths Tab */}
                    <TabsContent value="strengths" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className={`text-lg text-white ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.athlete1?.name || "Athlete 1"} {t('analysis.comparison.strengths', 'Strengths')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.strengths?.athlete1 || []).map((strength: any, index: number) => (
                              <div key={index} className={`${isComparisonArabic ? 'border-r-4 pr-4' : 'border-l-4 pl-4'} border-green-500 py-2 bg-gray-800/50`}>
                                <div className={`flex items-start justify-between ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                                  <div className="flex-1">
                                    <div className={`font-medium text-white ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {typeof strength === 'string' ? strength : strength.title}
                                    </div>
                                    {typeof strength === 'object' && strength.description && (
                                      <div className={`text-sm text-gray-400 mt-1 ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {strength.description}
                                      </div>
                                    )}
                                    {typeof strength === 'object' && strength.evidence && (
                                      <div className={`text-xs text-green-300 mt-2 italic ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {t('analysis.comparison.evidence', 'Evidence')}: {strength.evidence}
                                      </div>
                                    )}
                                  </div>
                                  {typeof strength === 'object' && strength.rating && (
                                    <div className={`text-sm font-bold text-green-400 ${isComparisonArabic ? 'mr-2' : 'ml-2'}`}>
                                      {strength.rating}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.strengths?.athlete1 || parsedData.strengths.athlete1.length === 0) && (
                              <div className="text-gray-400 text-center py-4">{t('analysis.comparison.noStrengthsData', 'No strengths data available')}</div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className={`text-lg text-white ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.athlete2?.name || "Athlete 2"} {t('analysis.comparison.strengths', 'Strengths')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.strengths?.athlete2 || []).map((strength: any, index: number) => (
                              <div key={index} className={`${isComparisonArabic ? 'border-r-4 pr-4' : 'border-l-4 pl-4'} border-green-500 py-2 bg-gray-800/50`}>
                                <div className={`flex items-start justify-between ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                                  <div className="flex-1">
                                    <div className={`font-medium text-white ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {typeof strength === 'string' ? strength : strength.title}
                                    </div>
                                    {typeof strength === 'object' && strength.description && (
                                      <div className={`text-sm text-gray-400 mt-1 ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {strength.description}
                                      </div>
                                    )}
                                    {typeof strength === 'object' && strength.evidence && (
                                      <div className={`text-xs text-green-300 mt-2 italic ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {t('analysis.comparison.evidence', 'Evidence')}: {strength.evidence}
                                      </div>
                                    )}
                                  </div>
                                  {typeof strength === 'object' && strength.rating && (
                                    <div className={`text-sm font-bold text-green-400 ${isComparisonArabic ? 'mr-2' : 'ml-2'}`}>
                                      {strength.rating}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.strengths?.athlete2 || parsedData.strengths.athlete2.length === 0) && (
                              <div className="text-gray-400 text-center py-4">{t('analysis.comparison.noStrengthsData', 'No strengths data available')}</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Weaknesses Tab */}
                    <TabsContent value="weaknesses" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className={`text-lg text-white ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.athlete1?.name || "Athlete 1"} {t('analysis.comparison.areasToImprove', 'Areas to Improve')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.weaknesses?.athlete1 || []).map((weakness: any, index: number) => (
                              <div key={index} className={`${isComparisonArabic ? 'border-r-4 pr-4' : 'border-l-4 pl-4'} border-orange-500 py-2 bg-gray-800/50`}>
                                <div className={`flex items-start justify-between ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                                  <div className="flex-1">
                                    <div className={`font-medium text-white ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {typeof weakness === 'string' ? weakness : weakness.title}
                                    </div>
                                    {typeof weakness === 'object' && weakness.description && (
                                      <div className={`text-sm text-gray-400 mt-1 ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {weakness.description}
                                      </div>
                                    )}
                                    {typeof weakness === 'object' && weakness.exploitation && (
                                      <div className={`text-xs text-orange-300 mt-2 italic ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {t('analysis.comparison.exploitation', 'Exploitation')}: {weakness.exploitation}
                                      </div>
                                    )}
                                  </div>
                                  {typeof weakness === 'object' && weakness.impact && (
                                    <div className={`text-sm font-bold text-orange-400 ${isComparisonArabic ? 'mr-2' : 'ml-2'}`}>
                                      {weakness.impact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.weaknesses?.athlete1 || parsedData.weaknesses.athlete1.length === 0) && (
                              <div className="text-gray-400 text-center py-4">{t('analysis.comparison.noWeaknessesData', 'No weaknesses data available')}</div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="bg-athlete-gray-900 border-gray-600">
                          <CardHeader>
                            <CardTitle className={`text-lg text-white ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.athlete2?.name || "Athlete 2"} {t('analysis.comparison.areasToImprove', 'Areas to Improve')}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(parsedData.weaknesses?.athlete2 || []).map((weakness: any, index: number) => (
                              <div key={index} className={`${isComparisonArabic ? 'border-r-4 pr-4' : 'border-l-4 pl-4'} border-orange-500 py-2 bg-gray-800/50`}>
                                <div className={`flex items-start justify-between ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                                  <div className="flex-1">
                                    <div className={`font-medium text-white ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {typeof weakness === 'string' ? weakness : weakness.title}
                                    </div>
                                    {typeof weakness === 'object' && weakness.description && (
                                      <div className={`text-sm text-gray-400 mt-1 ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {weakness.description}
                                      </div>
                                    )}
                                    {typeof weakness === 'object' && weakness.exploitation && (
                                      <div className={`text-xs text-orange-300 mt-2 italic ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {t('analysis.comparison.exploitation', 'Exploitation')}: {weakness.exploitation}
                                      </div>
                                    )}
                                  </div>
                                  {typeof weakness === 'object' && weakness.impact && (
                                    <div className={`text-sm font-bold text-orange-400 ${isComparisonArabic ? 'mr-2' : 'ml-2'}`}>
                                      {weakness.impact}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(!parsedData.weaknesses?.athlete2 || parsedData.weaknesses.athlete2.length === 0) && (
                              <div className="text-gray-400 text-center py-4">{t('analysis.comparison.noWeaknessesData', 'No weaknesses data available')}</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Competition History Tab */}
                    <TabsContent value="ranking" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-6">
                          <div className={`flex items-center gap-2 mb-4 ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                            <Trophy className="h-5 w-5 text-yellow-400" />
                            <h4 className="font-semibold text-white">{t('analysis.comparison.competitionHistoryAnalysis', 'Competition History Analysis')}</h4>
                          </div>
                          {parsedData.ranking ? (
                            <div className="space-y-4">
                              {parsedData.ranking.comparison && (
                                <div>
                                  <h5 className={`font-medium text-blue-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.currentRankingComparison', 'Current Ranking Comparison')}</h5>
                                  <p className={`text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg ${isComparisonArabic ? 'text-right' : ''}`}>
                                    {parsedData.ranking.comparison}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {parsedData.ranking.athlete1Trajectory && (
                                  <div>
                                    <h5 className={`font-medium text-green-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.athlete1?.name} {t('analysis.comparison.trajectory', 'Trajectory')}</h5>
                                    <p className={`text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {parsedData.ranking.athlete1Trajectory}
                                    </p>
                                  </div>
                                )}

                                {parsedData.ranking.athlete2Trajectory && (
                                  <div>
                                    <h5 className={`font-medium text-green-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.athlete2?.name} {t('analysis.comparison.trajectory', 'Trajectory')}</h5>
                                    <p className={`text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {parsedData.ranking.athlete2Trajectory}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Competitive Edge Summary */}
                              {parsedData.ranking.competitiveEdge && (
                                <div className="mt-4">
                                  <h5 className={`font-medium text-purple-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.competitiveEdge', 'Competitive Edge')}</h5>
                                  <div className="text-center p-4 bg-purple-900/30 border border-purple-600/50 rounded-lg">
                                    <div className="text-lg font-bold text-purple-300">
                                      {parsedData.ranking.competitiveEdge === 'athlete1' ? parsedData.athlete1?.name :
                                       parsedData.ranking.competitiveEdge === 'athlete2' ? parsedData.athlete2?.name : t('analysis.comparison.evenCompetition', 'Even Competition')}
                                    </div>
                                    <div className="text-purple-400 text-sm mt-1">
                                      {parsedData.ranking.competitiveEdge === 'even' ? t('analysis.comparison.bothAthletesEvenlyMatched', 'Both athletes are evenly matched') : t('analysis.comparison.hasCompetitiveAdvantage', 'Has the competitive advantage')}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                              <p className={`text-yellow-300 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.competitionHistoryNotAvailable', 'Competition history analysis not available')}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Head-to-Head Tab */}
                    <TabsContent value="head-to-head" className="space-y-4">
                      <Card className="bg-athlete-gray-900 border-gray-600">
                        <CardContent className="p-6">
                          <div className="space-y-6">
                            {/* Prediction Section */}
                            <div className="text-center">
                              <h3 className="text-xl font-bold text-white mb-2">{t('analysis.comparison.headToHeadPrediction', 'Head-to-Head Prediction')}</h3>
                              {parsedData.headToHead?.prediction && parsedData.headToHead.prediction !== 'even' ? (
                                <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-4 mb-4">
                                  <div className="text-2xl font-bold text-purple-300 mb-2">
                                    {t('analysis.comparison.predictedWinner', 'Predicted Winner')}: {parsedData.headToHead.prediction === 'athlete1' ? 
                                      parsedData.athlete1?.name : parsedData.athlete2?.name}
                                  </div>
                                  {parsedData.headToHead?.confidence && (
                                    <div className="text-lg text-purple-400">
                                      {t('analysis.comparison.confidence', 'Confidence')}: {parsedData.headToHead.confidence}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 mb-4">
                                  <div className="text-xl font-bold text-gray-300 mb-2">{t('analysis.comparison.evenMatch', 'Even Match')}</div>
                                  <div className="text-gray-400">{t('analysis.comparison.tooCloseToCall', 'Too close to call')}</div>
                                </div>
                              )}
                            </div>

                            {/* Reasoning */}
                            {parsedData.headToHead?.reasoning && (
                              <div>
                                <h4 className={`font-semibold text-blue-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.analysis', 'Analysis')}</h4>
                                <p className={`text-gray-300 leading-relaxed ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.headToHead.reasoning}</p>
                              </div>
                            )}

                            {/* Key Factors */}
                            {parsedData.headToHead?.keyFactors && parsedData.headToHead.keyFactors.length > 0 && (
                              <div>
                                <h4 className={`font-semibold text-green-400 mb-3 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.keyFactors', 'Key Factors')}</h4>
                                <div className="space-y-2">
                                  {parsedData.headToHead.keyFactors.map((factor: string, index: number) => (
                                    <div key={index} className={`flex items-start gap-2 ${isComparisonArabic ? 'flex-row-reverse' : ''}`}>
                                      <Star className="h-4 w-4 text-green-400 mt-1" />
                                      <span className={`text-gray-300 ${isComparisonArabic ? 'text-right' : ''}`}>{factor}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Scenario */}
                            {parsedData.headToHead?.scenario && (
                              <div>
                                <h4 className={`font-semibold text-purple-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.matchScenario', 'Match Scenario')}</h4>
                                <p className={`text-gray-300 leading-relaxed ${isComparisonArabic ? 'text-right' : ''}`}>{parsedData.headToHead.scenario}</p>
                              </div>
                            )}

                            {/* Tactical Advice */}
                            {parsedData.headToHead?.tacticalAdvice && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {parsedData.headToHead.tacticalAdvice.forAthlete1 && (
                                  <Card className="bg-athlete-gray-800 border-gray-600">
                                    <CardHeader>
                                      <CardTitle className={`text-sm text-blue-400 ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {isComparisonArabic ? (
                                          <>{parsedData.athlete1?.name} {t('analysis.comparison.adviceFor', 'Advice for')}</>
                                        ) : (
                                          <>{t('analysis.comparison.adviceFor', 'Advice for')} {parsedData.athlete1?.name}</>
                                        )}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className={`text-sm text-gray-300 ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {parsedData.headToHead.tacticalAdvice.forAthlete1}
                                    </CardContent>
                                  </Card>
                                )}
                                {parsedData.headToHead.tacticalAdvice.forAthlete2 && (
                                  <Card className="bg-athlete-gray-800 border-gray-600">
                                    <CardHeader>
                                      <CardTitle className={`text-sm text-blue-400 ${isComparisonArabic ? 'text-right' : ''}`}>
                                        {isComparisonArabic ? (
                                          <>{parsedData.athlete2?.name} {t('analysis.comparison.adviceFor', 'Advice for')}</>
                                        ) : (
                                          <>{t('analysis.comparison.adviceFor', 'Advice for')} {parsedData.athlete2?.name}</>
                                        )}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className={`text-sm text-gray-300 ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {parsedData.headToHead.tacticalAdvice.forAthlete2}
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            )}

                            {/* Historical Context & Expert Predictions */}
                            {(parsedData.headToHead?.historicalContext || parsedData.headToHead?.expertPredictions) && (
                              <div className="space-y-4">
                                {parsedData.headToHead.historicalContext && (
                                  <div>
                                    <h5 className={`font-medium text-yellow-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.historicalContext', 'Historical Context')}</h5>
                                    <p className={`text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {parsedData.headToHead.historicalContext}
                                    </p>
                                  </div>
                                )}

                                {parsedData.headToHead.expertPredictions && 
                                 !parsedData.headToHead.expertPredictions.includes("No predictions found") && (
                                  <div>
                                    <h5 className={`font-medium text-green-400 mb-2 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.expertPredictions', 'Expert Predictions')}</h5>
                                    <p className={`text-gray-300 text-sm bg-athlete-gray-800 p-3 rounded-lg ${isComparisonArabic ? 'text-right' : ''}`}>
                                      {parsedData.headToHead.expertPredictions}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {!parsedData.headToHead && (
                              <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                                <p className={`text-yellow-300 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.headToHeadAnalysisNotAvailable', 'Head-to-head analysis not available')}</p>
                              </div>
                            )}

                            {/* Strategic Analysis */}
                            {(parsedData.headToHead?.reasoning || parsedData.overallAnalysis?.recommendation) && (
                              <div className="p-4 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-600/50 rounded-lg">
                                <h4 className={`font-medium text-indigo-300 mb-3 ${isComparisonArabic ? 'text-right' : ''}`}>{t('analysis.comparison.strategicMatchupAnalysis', 'Strategic Matchup Analysis')}</h4>
                                <p className={`text-gray-300 text-sm leading-relaxed ${isComparisonArabic ? 'text-right' : ''}`}>
                                  {parsedData.overallAnalysis?.recommendation || parsedData.headToHead?.reasoning || t('analysis.comparison.strategicAnalysisDescription', 'Strategic analysis considers technical skill matchups, recent form, and competitive experience to determine the most likely outcome.')}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Preview Modal */}
    {previewModal.serviceType && selectedPreviewAnalysis && (
      <AnalysisPopup
        open={previewModal.open && !previewLoading && !!selectedPreviewAnalysis}
        onOpenChange={(open) => setPreviewModal({ open, serviceType: open ? previewModal.serviceType : null })}
        type={previewModal.serviceType}
        data={selectedPreviewAnalysis?.resultData}
        athleteName={t('common.sampleAthlete', 'Sample Athlete')}
        createdAt={selectedPreviewAnalysis.createdAt}
      />
    )}
    </>
  );
}