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
import type { Athlete } from "@shared/schema";

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
  const { user } = useAuth();
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  
  const IconComponent = iconMap[service.icon as keyof typeof iconMap] || User;

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/analysis/${athlete.id}/${service.id}`
      );
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisData(data);
      setShowAnalysisPopup(true);
      
      toast({
        title: "Analysis Complete",
        description: `${service.title} analysis generated successfully!`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis-logs"] });
    },
    onError: (error) => {
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

      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to generate analysis",
        variant: "destructive",
      });
    },
  });

  const handleServiceClick = () => {
    // Check if user has enough tokens
    if (!user || user.tokens < service.cost) {
      onInsufficientTokens();
      return;
    }

    analysisMutation.mutate();
  };

  return (
    <Card 
      className={`service-card bg-gradient-to-br from-athlete-gray-800 to-athlete-gray-700 border-gray-700 hover:border-athlete-accent cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-athlete-accent/20 ${
        analysisMutation.isPending ? 'opacity-75' : ''
      }`}
      onClick={handleServiceClick}
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
        
        <Button 
          data-testid={`button-${service.id}`}
          className="w-full bg-athlete-accent hover:bg-blue-600 text-white transition-colors"
          disabled={analysisMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            handleServiceClick();
          }}
        >
          {analysisMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            `Generate ${service.title}`
          )}
        </Button>
      </CardContent>
      
      {showAnalysisPopup && analysisData && (
        <AnalysisPopup
          open={showAnalysisPopup}
          onOpenChange={setShowAnalysisPopup}
          type={service.id}
          data={analysisData}
          athleteName={athlete.name}
          createdAt={new Date().toISOString()}
        />
      )}
    </Card>
  );
}
