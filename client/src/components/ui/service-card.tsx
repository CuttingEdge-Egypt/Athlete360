import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { AnalysisPopup } from "./analysis-popup";
import { 
  User, Trophy, Star, AlertTriangle, Calendar, Apple, 
  Swords, Video, Loader2, Coins, BarChart3, HelpCircle, Eye 
} from "lucide-react";
import type { Athlete, User as UserType } from "@shared/schema";

interface ServiceCardProps {
  service: {
    id: string;
    title: string;
    description: string;
    cost: number;
    icon: string;
    color: string;
  };
  athlete: Athlete;
  onInsufficientTokens: () => void;
}

const iconMap = {
  "user-alt": User,
  "trophy": Trophy,
  "muscle": Star,
  "exclamation-triangle": AlertTriangle,
  "calendar-alt": Calendar,
  "apple-alt": Apple,
  "chess": Swords,
  "video": Video,
  "bar-chart": BarChart3,
};

export function ServiceCard({ service, athlete, onInsufficientTokens }: ServiceCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth() as { user: UserType | null };
  const { language } = useLanguage();
  const { t } = useTranslation(['home', 'common']);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [progressPhase, setProgressPhase] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  
  const IconComponent = iconMap[service.icon as keyof typeof iconMap] || User;

  // Check if user has history for this service type (regardless of athlete)
  const { data: historyCheck } = useQuery({
    queryKey: ['/api/user-history/latest', service.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/user-history/latest?serviceType=${service.id}`,
        { credentials: 'include' }
      );
      if (!response.ok) return { hasHistory: false, data: null };
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Listen for cancellation events from the queue
  useEffect(() => {
    const handleCancellation = (event: CustomEvent) => {
      try {
        const { athleteName, serviceType } = event.detail;
        if (athleteName === athlete.name && serviceType === service.id && isProcessing) {
          // Abort the ongoing request
          if (abortController) {
            abortController.abort();
          }
          
          // Stop the current processing
          setIsProcessing(false);
          setCurrentQueueId(null);
          setAbortController(null);
          setProgressPhase("");
          setProgressPercent(0);
          
          toast({
            title: t('messages.generationCancelled', { ns: 'common' }),
            description: `${service.title} ${t('messages.generationCancelledDesc', { ns: 'common' })}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        // Silently handle any errors from the cancellation process
        console.warn('Error in cancellation handler:', error);
      }
    };

    window.addEventListener('cancel-generation', handleCancellation as EventListener);
    return () => {
      window.removeEventListener('cancel-generation', handleCancellation as EventListener);
    };
  }, [athlete.name, service.id, service.title, isProcessing, abortController, toast]);

  const analysisMutation = useMutation({
    mutationFn: async (forceUpdate?: boolean) => {
      if (isProcessing) {
        throw new Error("Analysis already in progress");
      }
      setIsProcessing(true);
      setProgressPhase(t('services.queue.requestSent'));
      setProgressPercent(5);
      
      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);
      
      // Add to generation queue with auto-trigger
      const queueId = (window as any).generationQueue?.add?.(athlete.name, service.id, true);
      setCurrentQueueId(queueId);
      
      // Schedule progress updates with better timing
      let progressTimer1: NodeJS.Timeout;
      let progressTimer2: NodeJS.Timeout;
      let progressTimer3: NodeJS.Timeout;
      let progressTimer4: NodeJS.Timeout;
      let progressTimer5: NodeJS.Timeout;
      
      progressTimer1 = setTimeout(() => {
        setProgressPhase(t('services.queue.takingTime'));
        setProgressPercent(15);
      }, 2000); // 2 seconds
      
      progressTimer2 = setTimeout(() => {
        setProgressPhase(t('services.queue.analyzingData'));
        setProgressPercent(30);
      }, 8000); // 8 seconds
      
      progressTimer3 = setTimeout(() => {
        setProgressPhase(t('services.queue.gatheringInsights'));
        setProgressPercent(50);
      }, 20000); // 20 seconds
      
      progressTimer4 = setTimeout(() => {
        setProgressPhase(t('services.queue.buildingAnalysis'));
        setProgressPercent(70);
      }, 40000); // 40 seconds
      
      progressTimer5 = setTimeout(() => {
        setProgressPhase(t('services.queue.almostThere'));
        setProgressPercent(90);
      }, 70000); // 70 seconds
      
      try {
        // Use standard analysis endpoints for all services
        const url = forceUpdate 
          ? `/api/analysis/${athlete.id}/${service.id}?forceUpdate=true`
          : `/api/analysis/${athlete.id}/${service.id}`;
        
        const response = await apiRequest("POST", url, { language }, { signal: controller.signal });
        const result = await response.json();
        
        // Clear all scheduled progress timers
        clearTimeout(progressTimer1);
        clearTimeout(progressTimer2);
        clearTimeout(progressTimer3);
        clearTimeout(progressTimer4);
        clearTimeout(progressTimer5);
        
        // Set final progress
        setProgressPhase(t('services.almostDone'));
        setProgressPercent(100);
        
        // Update queue with success
        if (queueId) {
          (window as any).generationQueue?.update?.(queueId, { 
            status: 'completed', 
            result: { ...result, serviceType: service.id, athleteName: athlete.name, athleteId: athlete.id }
          });
        }
        
        return result;
      } catch (error) {
        // Clear all scheduled progress timers on error
        clearTimeout(progressTimer1);
        clearTimeout(progressTimer2);
        clearTimeout(progressTimer3);
        clearTimeout(progressTimer4);
        clearTimeout(progressTimer5);
        
        // For aborted requests, refund tokens and remove from queue
        if (error instanceof Error && error.name === 'AbortError') {
          if (queueId) {
            (window as any).generationQueue?.remove?.(queueId);
          }
          
          // Call backend to refund tokens for cancelled request
          try {
            await apiRequest("POST", `/api/refund-cancelled-analysis`, {
              athleteId: athlete.id,
              serviceType: service.id,
              reason: "User cancelled generation"
            });
          } catch (refundError) {
            console.warn('Failed to refund tokens for cancelled analysis:', refundError);
          }
          
          // Return a special cancelled result instead of throwing
          return { __cancelled: true };
        }
        
        // Update queue with error for other types of errors
        if (queueId) {
          (window as any).generationQueue?.update?.(queueId, { 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error',
            canRetry: true
          });
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      // Don't show success popup if this was a cancelled request
      if (data && data.__cancelled) {
        setIsProcessing(false);
        setCurrentQueueId(null);
        setAbortController(null);
        setProgressPhase("");
        setProgressPercent(0);
        return;
      }
      
      setAnalysisData(data);
      setIsPreviewMode(false);
      setShowAnalysisPopup(true);
      setIsProcessing(false);
      setCurrentQueueId(null);
      setAbortController(null);
      setProgressPhase("");
      setProgressPercent(0);
      
      toast({
        title: t('messages.analysisComplete', { ns: 'common' }),
        description: `${service.title} ${t('messages.analysisSuccess', { ns: 'common' })}`,
      });
      
      // Invalidate queries to refresh data immediately
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-history"] });
      
      // For bio service, also invalidate and force refetch athlete data to show updated bio
      if (service.id === "bio") {
        queryClient.invalidateQueries({ queryKey: ["/api/athletes", athlete.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
        // Force immediate refetch of the specific athlete
        queryClient.refetchQueries({ queryKey: ["/api/athletes", athlete.id] });
      }
      
      // Force refetch user data immediately
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      setIsProcessing(false);
      setCurrentQueueId(null);
      setAbortController(null);
      setProgressPhase("");
      setProgressPercent(0);
      
      // Don't show error for cancelled requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: t('messages.unauthorized', { ns: 'common' }),
          description: t('messages.unauthorizedDesc', { ns: 'common' }),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      if (error.message.includes("402") || error.message.includes("Insufficient")) {
        onInsufficientTokens();
        return;
      }

      if (error.message.includes("Analysis already in progress")) {
        return; // Silent fail for duplicate requests
      }

      toast({
        title: t('messages.analysisFailed', { ns: 'common' }),
        description: error.message || t('messages.analysisFailedDesc', { ns: 'common' }),
        variant: "destructive",
      });
    },
  });

  const handleServiceClick = (forceUpdate = false) => {
    // Prevent duplicate clicks while processing
    if (isProcessing || analysisMutation.isPending) {
      return;
    }
    
    // Check if user has enough tokens
    if (!user || (user.tokens || 0) < service.cost) {
      onInsufficientTokens();
      return;
    }

    analysisMutation.mutate(forceUpdate);
  };

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/preview/latest/${service.id}?language=${language}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setAnalysisData(data.data);
        setIsPreviewMode(true);
        setShowAnalysisPopup(true);
      } else {
        toast({
          title: t('preview.notAvailable'),
          description: t('preview.noData'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('preview.error'),
        description: t('preview.fetchError'),
        variant: "destructive",
      });
    }
  };

  const handleHistoryPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (historyCheck?.data?.resultData) {
      setAnalysisData(historyCheck.data.resultData);
      setIsPreviewMode(false);
      setIsHistoryMode(true);
      setShowAnalysisPopup(true);
    }
  };

  return (
    <>
      <Card 
        className={`service-card h-full bg-gradient-to-br from-white to-gray-50 border hover:border-athlete-accent transition-all duration-300 hover:shadow-lg hover:shadow-athlete-accent/20 ${
          (analysisMutation.isPending || isProcessing) ? 'opacity-75' : ''
        } relative overflow-hidden`}
      >
      {service.id === 'statistics' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Coming Soon</h3>
            </div>
          </div>
        </div>
      )}
      <CardContent className="p-6 h-full flex flex-col">
        <div className="flex flex-col gap-1 mb-4">
          {/* Top row: ? button only, right-aligned */}
          <div className="flex justify-end">
            <Button
              data-testid={`button-sample-${service.id}`}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 gap-1"
              onClick={handlePreview}
              disabled={service.id === 'statistics'}
            >
              <HelpCircle size={16} />
              <span className="text-xs">{t('buttons.preview', { ns: 'common' })}</span>
            </Button>
          </div>
          {/* Bottom row: icon and token badge horizontally aligned */}
          <div className="flex justify-between items-center">
            <IconComponent className={`text-2xl ${service.color}`} size={32} />
            <span className="bg-amber-400 text-black text-xs px-2 py-1 rounded-full font-semibold">
              {service.cost} {t('units.tokens', { ns: 'common' })}
            </span>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-foreground">{service.title}</h3>
        <p className="text-muted-foreground text-sm mb-4 flex-grow">{service.description}</p>
        
        <div className="mt-auto space-y-2">
          <Button 
            data-testid={`button-${service.id}`}
            className="w-full bg-primary hover:bg-teal-600 text-white transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={analysisMutation.isPending || isProcessing || service.id === 'statistics'}
            onClick={(e) => {
              e.stopPropagation();
              // Don't allow clicking for statistics service
              if (service.id === 'statistics') return;
              // Force fresh AI analysis for bio, strengths, and weaknesses
              const shouldForceUpdate = ['bio', 'strengths', 'weaknesses'].includes(service.id);
              handleServiceClick(shouldForceUpdate);
            }}
          >
            {service.id === 'statistics' ? (
              'Coming Soon'
            ) : (analysisMutation.isPending || isProcessing) ? (
              <div className="space-y-2 py-1 w-full">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  <span className="text-xs leading-tight text-center truncate max-w-[200px]">
                    {progressPhase || t('services.aiProcessing')}
                  </span>
                </div>
                {progressPercent > 0 && (
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ) : (
              t('services.generate')
            )}
          </Button>
          
          {historyCheck?.hasHistory && (
            <Button
              data-testid={`button-preview-history-${service.id}`}
              variant="outline"
              className="w-full border text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px]"
              onClick={handleHistoryPreview}
            >
              <Eye className="mr-2" size={16} />
              {t('buttons.viewHistory', { ns: 'common' })}
            </Button>
          )}
        </div>
      </CardContent>
      </Card>
      
      {showAnalysisPopup && analysisData && (
        <AnalysisPopup
          open={showAnalysisPopup}
          onOpenChange={(open) => {
            setShowAnalysisPopup(open);
            if (!open) {
              setAnalysisData(null);
              setIsPreviewMode(false);
              setIsHistoryMode(false);
            }
          }}
          type={service.id}
          data={analysisData}
          athleteName={
            isHistoryMode 
              ? (historyCheck?.data?.athleteName || athlete.name)
              : ((analysisData as any)?.name || athlete.name)
          }
          athleteId={isPreviewMode ? undefined : (athlete.id || "")}
          athlete={athlete}
          onRefresh={() => {
            // Refresh the athlete data
            queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
            // Also refresh history data after generating new analysis
            queryClient.invalidateQueries({ queryKey: ['/api/user-history/latest'] });
          }}
          createdAt={historyCheck?.data?.createdAt || new Date().toISOString()}
        />
      )}
    </>
  );
}
