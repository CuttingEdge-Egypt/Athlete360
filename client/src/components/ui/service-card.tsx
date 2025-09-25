import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLanguage } from "@/lib/LanguageProvider";
import { AnalysisPopup } from "./analysis-popup";
import { 
  User, Trophy, Star, AlertTriangle, Calendar, Apple, 
  Swords, Video, Loader2, Coins, BarChart3 
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
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQueueId, setCurrentQueueId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [progressPhase, setProgressPhase] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(0);
  
  const IconComponent = iconMap[service.icon as keyof typeof iconMap] || User;

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
            title: "Generation Cancelled",
            description: `${service.title} analysis was cancelled`,
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
      setProgressPhase("Preparing analysis...");
      setProgressPercent(10);
      
      // Create abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);
      
      // Add to generation queue with auto-trigger
      const queueId = (window as any).generationQueue?.add?.(athlete.name, service.id, true);
      setCurrentQueueId(queueId);
      
      // Update progress phases
      setProgressPhase("Deducting tokens...");
      setProgressPercent(20);
      
      try {
        // Use standard analysis endpoints for all services
        const url = forceUpdate 
          ? `/api/analysis/${athlete.id}/${service.id}?forceUpdate=true`
          : `/api/analysis/${athlete.id}/${service.id}`;
        
        setProgressPhase("Fetching athlete data...");
        setProgressPercent(40);
        
        // Add a small delay to show the progress phase
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setProgressPhase("AI processing...");
        setProgressPercent(60);
        
        const response = await apiRequest("POST", url, { language }, { signal: controller.signal });
        
        setProgressPhase("Finalizing results...");
        setProgressPercent(90);
        
        const result = await response.json();
        
        setProgressPhase("Complete!");
        setProgressPercent(100);
        
        // Update queue with success
        if (queueId) {
          (window as any).generationQueue?.update?.(queueId, { 
            status: 'completed', 
            result: { ...result, serviceType: service.id, athleteName: athlete.name }
          });
        }
        
        return result;
      } catch (error) {
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
      setShowAnalysisPopup(true);
      setIsProcessing(false);
      setCurrentQueueId(null);
      setAbortController(null);
      setProgressPhase("");
      setProgressPercent(0);
      
      toast({
        title: "Analysis Complete",
        description: `${service.title} analysis generated successfully!`,
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
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
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
        title: "Analysis Failed",
        description: error.message || "Failed to generate analysis",
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

  return (
    <>
      <Card 
        className={`service-card bg-gradient-to-br from-athlete-gray-800 to-athlete-gray-700 border-gray-700 hover:border-athlete-accent cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-athlete-accent/20 ${
          (analysisMutation.isPending || isProcessing) ? 'opacity-75 pointer-events-none' : ''
        }`}
        onClick={() => {
          // Force fresh AI analysis for bio, strengths, and weaknesses
          const shouldForceUpdate = ['bio', 'strengths', 'weaknesses'].includes(service.id);
          handleServiceClick(shouldForceUpdate);
        }}
      >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <IconComponent className={`text-2xl ${service.color}`} size={32} />
          <span className="bg-athlete-warning text-black text-xs px-2 py-1 rounded-full font-semibold">
            {service.cost} tokens
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-white">{service.title}</h3>
        <p className="text-gray-400 text-sm mb-4">{service.description}</p>
        
        <div className="space-y-2">
          <Button 
            data-testid={`button-${service.id}`}
            className="w-full bg-athlete-accent hover:bg-blue-600 text-white transition-colors"
            disabled={analysisMutation.isPending || isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              // Force fresh AI analysis for bio, strengths, and weaknesses
              const shouldForceUpdate = ['bio', 'strengths', 'weaknesses'].includes(service.id);
              handleServiceClick(shouldForceUpdate);
            }}
          >
            {(analysisMutation.isPending || isProcessing) ? (
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {progressPhase || "Analyzing..."}
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
              "Generate"
            )}
          </Button>
          
          <Button 
            data-testid={`button-${service.id}-refresh`}
            variant="outline"
            size="sm"
            className="w-full text-xs border-athlete-accent text-athlete-accent hover:bg-athlete-accent hover:text-white transition-colors"
            disabled={analysisMutation.isPending || isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              handleServiceClick(true);
            }}
          >
            🔄 Refresh with AI
          </Button>
          

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
            }
          }}
          type={service.id}
          data={analysisData}
          athleteName={athlete.name}
          athleteId={athlete.id || ""}
          athlete={athlete}
          onRefresh={() => {
            // Refresh the athlete data
            queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
          }}
          createdAt={new Date().toISOString()}
        />
      )}
    </>
  );
}
