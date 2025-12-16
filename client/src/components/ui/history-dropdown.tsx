import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { History, Clock, User, Trophy, Star, AlertTriangle, Calendar, Apple, ClipboardList, Video, GitCompare, BarChart3, Coins, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { formatNumber } from "@/lib/arabicNumbers";

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

// Moved to component to access t function

interface HistoryDropdownProps {
  customTrigger?: (count: number) => React.ReactNode;
}

export function HistoryDropdown({ customTrigger }: HistoryDropdownProps = {}) {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [athleteForPopup, setAthleteForPopup] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['nav', 'home']);
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  // Create service labels with translations
  const getServiceLabel = (serviceType: string) => {
    const serviceLabels: { [key: string]: string } = {
      bio: t('services.bioAnalysis.title', { ns: 'home' }),
      rank: t('services.rankHistory.title', { ns: 'home' }),
      strengths: t('services.strengths.title', { ns: 'home' }),
      weaknesses: t('services.weaknesses.title', { ns: 'home' }),
      development: t('services.trainingPlans.title', { ns: 'home' }),
      'development-plan': t('services.developmentPlan.title', { ns: 'home' }),
      'nutrition-plan': t('services.nutritionPlan.title', { ns: 'home' }),
      nutrition: t('services.nutritionPlan.title', { ns: 'home' }),
      beat: t('services.tacticRecommendations.title', { ns: 'home' }),
      video: t('services.videoAnalysis.title', { ns: 'home' }),
      comparison: t('services.athleteComparison.title', { ns: 'home' }),
      statistics: t('services.statistics.title', { ns: 'home' }),
    };
    return serviceLabels[serviceType] || serviceType;
  };

  const { data: rawHistoryItems = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/user-history"],
    queryFn: async () => {
      const response = await fetch(`/api/user-history`);
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    }
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
        title: t('toasts.historyCleared.title', { ns: 'home' }),
        description: t('toasts.historyCleared.description', { ns: 'home' }),
      });
    },
    onError: () => {
      toast({
        title: t('toasts.error.title', { ns: 'home' }),
        description: t('toasts.clearHistoryError.description', { ns: 'home' }),
        variant: "destructive",
      });
    },
  });

  const handleHistoryItemClick = async (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    
    console.log('HistoryDropdown clicked item:', item);
    
    if (item.serviceType === 'comparison') {
      // Store comparison data in sessionStorage to avoid URL length limits
      sessionStorage.setItem('comparisonData', JSON.stringify(item.resultData));
      const url = "/?tab=comparison&data=fromStorage";
      console.log('Navigating to:', url);
      
      // Use both wouter navigation and manual URL update
      setLocation(url);
      
      // Also update the URL directly and trigger event
      setTimeout(() => {
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 100);
    } else if (item.serviceType === 'video') {
      // Navigate to video analysis page with data in sessionStorage
      sessionStorage.setItem('videoAnalysisData', JSON.stringify(item.resultData));
      
      // Dispatch custom event to trigger reload even if already on the page
      window.dispatchEvent(new CustomEvent('videoAnalysisDataUpdated'));
      
      setLocation('/video-analysis');
    } else if (item.serviceType === 'development-plan') {
      // Store development plan data in sessionStorage to avoid URL length limits
      sessionStorage.setItem('developmentPlanData', JSON.stringify(item.resultData));
      const url = "/?tab=development&data=fromStorage";
      console.log('Navigating to development plan:', url);
      
      // Use both wouter navigation and manual URL update
      setLocation(url);
      
      // Also update the URL directly and trigger event
      setTimeout(() => {
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 100);
    } else {
      // For bio, rank, strengths, weaknesses - fetch athlete data to include rankings
      if (item.athleteId) {
        try {
          const response = await fetch(`/api/athletes/${item.athleteId}`);
          if (response.ok) {
            const athleteData = await response.json();
            setAthleteForPopup(athleteData);
          }
        } catch (error) {
          console.error('Failed to fetch athlete data for history popup:', error);
        }
      }
      setShowAnalysisPopup(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {customTrigger ? customTrigger(historyItems.length) : (
            <Button 
              variant="ghost" 
              data-testid="button-history"
              className="relative flex items-center gap-2 px-3 text-foreground hover:bg-primary hover:text-white"
            >
              <History className="h-4 w-4" />
              <span className="text-sm">{t('menu.history')}</span>
              {historyItems.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-amber-500 text-white"
                >
                  {historyItems.length > 99 ? formatNumber('99+', isArabic) : formatNumber(historyItems.length, isArabic)}
                </Badge>
              )}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-96 max-h-96"
          data-testid="dropdown-history"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <History className="h-4 w-4" />
              {t('menu.history')}
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
                    {t('actions.clear', { ns: 'home' })}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader className={isArabic ? "text-right" : ""}>
                    <AlertDialogTitle className={isArabic ? "text-right" : ""}>{t('dialogs.clearHistory.title', { ns: 'home' })}</AlertDialogTitle>
                    <AlertDialogDescription className={`space-y-2 ${isArabic ? "text-right" : ""}`}>
                      <p>{t('dialogs.clearHistory.description', { ns: 'home' })}</p>
                      <ul className={`list-disc space-y-1 text-sm ${isArabic ? "list-inside text-right" : "list-inside"}`}>
                        <li>{t('dialogs.clearHistory.items.analyses', { ns: 'home' })}</li>
                        <li>{t('dialogs.clearHistory.items.transactions', { ns: 'home' })}</li>
                        <li>{t('dialogs.clearHistory.items.usage', { ns: 'home' })}</li>
                      </ul>
                      <p className={`font-medium text-destructive ${isArabic ? "text-right" : ""}`}>
                        {t('dialogs.clearHistory.warning', { ns: 'home' })}
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('actions.cancel', { ns: 'home' })}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => clearHistoryMutation.mutate()}
                      disabled={clearHistoryMutation.isPending}
                      className="bg-destructive hover:bg-destructive/90"
                      data-testid="button-confirm-clear-history"
                    >
                      {clearHistoryMutation.isPending ? t('actions.clearing', { ns: 'home' }) : t('actions.clearHistory', { ns: 'home' })}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('states.loading', { ns: 'home' })}
            </div>
          ) : historyItems.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('states.emptyHistory', { ns: 'home' })}
            </div>
          ) : (
            <ScrollArea className="h-80">
              {historyItems.map((item) => {
                const ServiceIcon = serviceIcons[item.serviceType as keyof typeof serviceIcons] || User;
                const serviceLabel = getServiceLabel(item.serviceType);
                
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    data-testid={`history-item-${item.id}`}
                    className="group flex flex-col items-start gap-2 p-3 cursor-pointer hover:bg-primary"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <ServiceIcon className={`h-4 w-4 ${serviceColors[item.serviceType as keyof typeof serviceColors] || 'text-primary'} group-hover:text-white`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-foreground group-hover:text-white">
                          {serviceLabel}
                        </div>
                        {item.serviceType === 'comparison' ? (
                          <div className="text-xs text-muted-foreground group-hover:text-white/80 truncate">
                            {item.resultData?.athlete1?.name || 'Athlete 1'} vs {item.resultData?.athlete2?.name || 'Athlete 2'}
                          </div>
                        ) : item.athleteName && (
                          <div className="text-xs text-muted-foreground group-hover:text-white/80 truncate">
                            {item.athleteName} ({item.athleteSport})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-white/80">
                        <Coins className="h-3 w-3" />
                        {item.tokensDeducted < 0 ? `+${formatNumber(Math.abs(item.tokensDeducted), isArabic)}` : formatNumber(item.tokensDeducted, isArabic)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-white/80 w-full">
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
      {selectedHistoryItem && showAnalysisPopup && (
        <AnalysisPopup
          open={showAnalysisPopup}
          onOpenChange={(open) => {
            if (!open) {
              setShowAnalysisPopup(false);
              setSelectedHistoryItem(null);
              setAthleteForPopup(null);
            }
          }}
          type={selectedHistoryItem.serviceType}
          data={selectedHistoryItem.resultData}
          athleteName={selectedHistoryItem.athleteName || t('states.unknownAthlete', { ns: 'home' })}
          athleteId={selectedHistoryItem.athleteId}
          athlete={athleteForPopup}
          createdAt={selectedHistoryItem.createdAt}
        />
      )}

    </>
  );
}