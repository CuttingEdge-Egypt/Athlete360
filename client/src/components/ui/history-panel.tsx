import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AthleteComparison } from "@/components/ui/athlete-comparison";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { History, Clock, User, TrendingUp, Target, Utensils, Zap, Video, GitCompare, Coins, Trash2 } from "lucide-react";
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
  rank: TrendingUp,
  strengths: Target,
  weaknesses: Target,
  development: Zap,

  beat: Zap,
  video: Video,
  comparison: GitCompare,
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
}

export function HistoryPanel({ showHeader = true, className = "" }: HistoryPanelProps) {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: historyItems = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/user-history"],
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
    
    if (item.serviceType === 'comparison') {
      setShowComparisonPopup(true);
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
            <p className="text-gray-400">Loading your analysis history...</p>
          </div>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium mb-2">No Analysis History Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Start analyzing athletes to see your history appear here. Every analysis you perform will be saved for easy reference.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const ServiceIcon = serviceIcons[item.serviceType as keyof typeof serviceIcons] || User;
            const serviceLabel = serviceLabels[item.serviceType as keyof typeof serviceLabels] || item.serviceType;
            
            return (
              <Card 
                key={item.id}
                className="bg-gray-800/50 border-gray-700 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => handleHistoryItemClick(item)}
                data-testid={`history-item-card-${item.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <ServiceIcon className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">
                          {serviceLabel}
                        </h4>
                        {item.athleteName && (
                          <p className="text-sm text-gray-400 truncate">
                            {item.athleteName}
                            {item.athleteSport && (
                              <span className="ml-2 text-gray-500">• {item.athleteSport}</span>
                            )}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                    <div className="ml-3 text-gray-400">
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

      {/* Comparison Popup for revisiting comparisons */}
      <Dialog open={showComparisonPopup} onOpenChange={setShowComparisonPopup}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto bg-athlete-primary text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Athlete Comparison</DialogTitle>
          </DialogHeader>
          {selectedHistoryItem && selectedHistoryItem.serviceType === 'comparison' && (
            <div className="mt-4 p-6 bg-athlete-gray-900 rounded-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Comparison Results</h3>
                <p className="text-gray-400">View previously generated comparison analysis</p>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-black p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(selectedHistoryItem.resultData, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}