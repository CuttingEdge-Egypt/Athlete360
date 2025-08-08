import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AnalysisPopup } from "./analysis-popup";
import { 
  User, Trophy, Star, AlertTriangle, Calendar, Apple, 
  Swords, Video, Loader2, Coins 
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
};

export function ServiceCard({ service, athlete, onInsufficientTokens }: ServiceCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth() as { user: UserType | null };
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const IconComponent = iconMap[service.icon as keyof typeof iconMap] || User;

  const analysisMutation = useMutation({
    mutationFn: async (forceUpdate?: boolean) => {
      if (isProcessing) {
        throw new Error("Analysis already in progress");
      }
      setIsProcessing(true);
      
      // For bio service refresh, use the specific bio refresh endpoint
      const url = service.id === "bio" && forceUpdate 
        ? `/api/athletes/${athlete.id}/refresh-bio`
        : forceUpdate 
        ? `/api/analysis/${athlete.id}/${service.id}?forceUpdate=true`
        : `/api/analysis/${athlete.id}/${service.id}`;
      
      const response = await apiRequest("POST", url);
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisData(data);
      setShowAnalysisPopup(true);
      setIsProcessing(false);
      
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
        onClick={() => handleServiceClick(false)}
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
              handleServiceClick(false);
            }}
          >
            {(analysisMutation.isPending || isProcessing) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              `Generate ${service.title}`
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
