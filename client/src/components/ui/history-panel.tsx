import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { History, Clock, User, Trophy, Star, AlertTriangle, Calendar, Apple, ClipboardList, Video, GitCompare, BarChart3, Coins, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HistoryItem {
  id: string;
  action: string;
  serviceType: string;
  tokensDeducted: number;
  athleteId?: string;
  athleteName?: string;
  athleteSport?: string;
  resultData?: any;
  createdAt: string;
}

const serviceIcons = {
  bio: User,
  rank: Trophy,
  strengths: Star,
  weaknesses: AlertTriangle,
  development: Calendar,
  'development-plan': Calendar,
  'nutrition-plan': Apple,
  nutrition: Apple,
  beat: ClipboardList,
  video: Video,
  comparison: GitCompare,
  statistics: BarChart3,
};

const serviceColors = {
  bio: "text-blue-500",
  rank: "text-amber-500",
  strengths: "text-green-500",
  weaknesses: "text-red-500",
  development: "text-purple-500",
  'development-plan': "text-purple-500",
  'nutrition-plan': "text-green-600",
  nutrition: "text-green-600",
  beat: "text-orange-500",
  video: "text-purple-600",
  comparison: "text-blue-600",
  statistics: "text-blue-500",
};

const serviceBgColors = {
  bio: "bg-blue-100",
  rank: "bg-amber-100",
  strengths: "bg-green-100",
  weaknesses: "bg-red-100",
  development: "bg-purple-100",
  'development-plan': "bg-purple-100",
  'nutrition-plan': "bg-green-100",
  nutrition: "bg-green-100",
  beat: "bg-orange-100",
  video: "bg-purple-100",
  comparison: "bg-blue-100",
  statistics: "bg-blue-100",
};

const serviceLabels = {
  bio: "Biography",
  rank: "Ranking Analysis",
  strengths: "Strengths Analysis", 
  weaknesses: "Weaknesses Analysis",
  development: "Development Plan",

  beat: "Beat Strategies",
  video: "Video Analysis",
  comparison: "Athlete Comparison",
};

interface HistoryPanelProps {
  showHeader?: boolean;
  className?: string;
  onComparisonSelect?: (comparisonData: any) => void;
}

export function HistoryPanel({ showHeader = true, className = "", onComparisonSelect }: HistoryPanelProps) {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawHistoryItems = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/user-history"],
  });
  
  // Filter out cancelled generations and refund entries from display
  const historyItems = rawHistoryItems.filter((item: HistoryItem) => {
    // Exclude refund entries (serviceType ends with -refund)
    if (item.serviceType?.includes('-refund')) return false;
    // Exclude cancelled entries (action contains "CANCELLED" or "REFUND")
    if (item.action?.includes('CANCELLED') || item.action?.includes('REFUND')) return false;
    // Exclude items with negative tokens (refunds)
    if (item.tokensDeducted < 0) return false;
    return true;
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/user-history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-history"] });
      toast({
        title: "History Cleared",
        description: "All your analysis history has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleHistoryItemClick = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    
    console.log('HistoryPanel clicked item:', item);
    
    if (item.serviceType === 'comparison') {
      // Call the callback to navigate to comparison tab with data
      if (onComparisonSelect) {
        console.log('HistoryPanel calling onComparisonSelect with:', item.resultData);
        onComparisonSelect(item.resultData);
      } else {
        console.log('HistoryPanel: no onComparisonSelect callback provided');
      }
    } else {
      setShowAnalysisPopup(true);
    }
  };

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Analysis History</h2>
            {historyItems.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {historyItems.length} {historyItems.length === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
          {historyItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  data-testid="button-clear-all-history"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All History?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>This will permanently delete all your analysis history, including:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>All athlete analysis records</li>
                      <li>Token transaction history</li>
                      <li>Service usage logs</li>
                    </ul>
                    <p className="font-medium text-destructive">
                      This action cannot be undone.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => clearHistoryMutation.mutate()}
                    disabled={clearHistoryMutation.isPending}
                    className="bg-destructive hover:bg-destructive/90"
                    data-testid="button-confirm-clear-all-history"
                  >
                    {clearHistoryMutation.isPending ? "Clearing..." : "Clear History"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your analysis history...</p>
          </div>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium mb-2 text-foreground">No Analysis History Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start analyzing athletes to see your history appear here. Every analysis you perform will be saved for easy reference.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const ServiceIcon = serviceIcons[item.serviceType as keyof typeof serviceIcons] || User;
            const serviceLabel = serviceLabels[item.serviceType as keyof typeof serviceLabels] || item.serviceType;
            const iconColor = serviceColors[item.serviceType as keyof typeof serviceColors] || "text-blue-500";
            const bgColor = serviceBgColors[item.serviceType as keyof typeof serviceBgColors] || "bg-blue-100";
            
            return (
              <Card 
                key={item.id}
                className="bg-white/80 border hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => handleHistoryItemClick(item)}
                data-testid={`history-item-card-${item.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 ${bgColor} rounded-lg`}>
                        <ServiceIcon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {serviceLabel}
                        </h4>
                        {item.athleteName && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.athleteName}
                            {item.athleteSport && (
                              <span className="ml-2 text-muted-foreground/70">• {item.athleteSport}</span>
                            )}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            {item.tokensDeducted} tokens used
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 text-muted-foreground">
                      →
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Analysis Popup for revisiting individual analyses */}
      {selectedHistoryItem && selectedHistoryItem.athleteId && showAnalysisPopup && (
        <AnalysisPopup
          open={showAnalysisPopup}
          onOpenChange={(open) => {
            if (!open) {
              setShowAnalysisPopup(false);
              setSelectedHistoryItem(null);
            }
          }}
          type={selectedHistoryItem.serviceType}
          data={selectedHistoryItem.resultData}
          athleteName={selectedHistoryItem.athleteName || "Unknown Athlete"}
          athleteId={selectedHistoryItem.athleteId}
          createdAt={selectedHistoryItem.createdAt}
        />
      )}

    </div>
  );
}