import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AthleteComparison } from "@/components/ui/athlete-comparison";
import { History, Clock, User, TrendingUp, Target, Utensils, Zap, Video, GitCompare, Coins } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  nutrition: Utensils,
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
  nutrition: "Nutrition Plan",
  beat: "Beat Strategies",
  video: "Video Analysis",
  comparison: "Athlete Comparison",
};

export function HistoryDropdown() {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [showComparisonPopup, setShowComparisonPopup] = useState(false);

  const { data: historyItems = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/user-history"],
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
          <DropdownMenuLabel className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Analysis History
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
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
          createdAt={selectedHistoryItem.createdAt}
        />
      )}

      {/* Comparison Popup for revisiting comparisons */}
      {selectedHistoryItem && selectedHistoryItem.serviceType === 'comparison' && showComparisonPopup && (
        <AthleteComparison
          open={showComparisonPopup}
          onOpenChange={(open) => {
            if (!open) {
              setShowComparisonPopup(false);
              setSelectedHistoryItem(null);
            }
          }}
          athlete1={selectedHistoryItem.resultData?.athlete1}
          athlete2={selectedHistoryItem.resultData?.athlete2}
          comparisonData={selectedHistoryItem.resultData}
        />
      )}
    </>
  );
}