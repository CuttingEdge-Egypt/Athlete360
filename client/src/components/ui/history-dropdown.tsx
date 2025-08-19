import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisPopup } from "@/components/ui/analysis-popup";

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

export function HistoryDropdown() {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
    
    console.log('HistoryDropdown clicked item:', item);
    
    if (item.serviceType === 'comparison') {
      // Navigate to home with comparison tab and data
      const encodedData = encodeURIComponent(JSON.stringify(item.resultData));
      const url = "/?tab=comparison&data=" + encodedData;
      console.log('Navigating to:', url);
      
      // Use both wouter navigation and manual URL update
      setLocation(url);
      
      // Also update the URL directly and trigger event
      setTimeout(() => {
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 100);
    } else {
      setShowAnalysisPopup(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            data-testid="button-history"
            className="relative"
          >
            <History className="h-4 w-4" />
            {historyItems.length > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {historyItems.length > 99 ? '99+' : historyItems.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-96 max-h-96"
          data-testid="dropdown-history"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <History className="h-4 w-4" />
              Analysis History
            </div>
            {historyItems.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="button-clear-history"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
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
                      data-testid="button-confirm-clear-history"
                    >
                      {clearHistoryMutation.isPending ? "Clearing..." : "Clear History"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : historyItems.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No analysis history yet
            </div>
          ) : (
            <ScrollArea className="h-80">
              {historyItems.map((item) => {
                const ServiceIcon = serviceIcons[item.serviceType as keyof typeof serviceIcons] || User;
                const serviceLabel = serviceLabels[item.serviceType as keyof typeof serviceLabels] || item.serviceType;
                
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    data-testid={`history-item-${item.id}`}
                    className="flex flex-col items-start gap-2 p-3 cursor-pointer hover:bg-accent"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <ServiceIcon className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {serviceLabel}
                        </div>
                        {item.athleteName && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.athleteName} ({item.athleteSport})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="h-3 w-3" />
                        {item.tokensDeducted}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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


    </>
  );
}