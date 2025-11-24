import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisPopup } from '@/components/ui/analysis-popup';
import { CancelConfirmationDialog } from '@/components/ui/cancel-confirmation-dialog';
import { X, Play, Pause, RotateCcw, Check, Loader2, Eye, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

// Extend Window interface for type safety
declare global {
  interface Window {
    generationQueue?: {
      add: (athleteName: string, serviceType: string, autoTrigger?: boolean) => string;
      update: (id: string, updates: Partial<GenerationItem>) => void;
      remove: (id: string) => void;
    };
    showToast?: (title: string, description: string, variant?: string) => void;
    cancelGeneration?: (athleteName: string, serviceType: string) => void;
    currentAthleteId?: string;
  }
}

interface GenerationItem {
  id: string;
  athleteName: string;
  serviceType: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  createdAt: Date;
  canRetry?: boolean;
  progressMessage?: string;
  jobId?: string; // Backend job ID for nutrition, development, and video analysis
  onCancel?: () => void; // Cancel callback for AbortController-based operations (like video analysis)
  onRetry?: () => void; // Retry callback for complex operations that need original data
  retryData?: any; // Store original request data for retry
}

interface GenerationQueueProps {
  onSelectGeneration: (result: any) => void;
  currentAthlete?: string;
  currentService?: string;
}

const GenerationQueue: React.FC<GenerationQueueProps> = ({
  onSelectGeneration,
  currentAthlete,
  currentService
}) => {
  const { t, i18n } = useTranslation('home');
  const [queue, setQueue] = useState<GenerationItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [, setLocation] = useLocation();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<string | null>(null);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout[]>>({});
  const creationTimesRef = useRef<Record<string, number>>({});

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      Object.values(timeoutsRef.current).forEach(timeouts => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      });
      timeoutsRef.current = {};
    };
  }, []);

  // Helper function to get the appropriate progress message based on elapsed time
  const getProgressMessageForElapsedTime = (elapsedMs: number) => {
    if (elapsedMs < 2000) return t('services.queue.requestSent');
    if (elapsedMs < 8000) return t('services.queue.takingTime');
    if (elapsedMs < 20000) return t('services.queue.analyzingData');
    if (elapsedMs < 40000) return t('services.queue.gatheringInsights');
    if (elapsedMs < 70000) return t('services.queue.buildingAnalysis');
    return t('services.queue.almostThere');
  };

  // Update progress messages when language changes
  useEffect(() => {
    setQueue(prev => prev.map(item => {
      if (item.status === 'running' && creationTimesRef.current[item.id]) {
        const elapsedMs = Date.now() - creationTimesRef.current[item.id];
        return {
          ...item,
          progressMessage: getProgressMessageForElapsedTime(elapsedMs)
        };
      } else if (item.status === 'pending') {
        return {
          ...item,
          progressMessage: t('services.queue.waiting')
        };
      }
      return item;
    }));
  }, [i18n.language]);

  // Helper function to clear timeouts for a specific item
  const clearItemTimeouts = (itemId: string) => {
    if (timeoutsRef.current[itemId]) {
      timeoutsRef.current[itemId].forEach(timeout => clearTimeout(timeout));
      delete timeoutsRef.current[itemId];
    }
  };

  // Create service labels with translations and error handling
  const getServiceLabel = (serviceType: string) => {
    try {
      const serviceLabels: { [key: string]: string } = {
        bio: t('services.bioAnalysis.title'),
        rank: t('services.rankHistory.title'),
        strengths: t('services.strengths.title'),
        weaknesses: t('services.weaknesses.title'),
        development: t('services.trainingPlans.title'),
        'development-plan': t('services.developmentPlan.title'),
        'nutrition-plan': t('services.nutritionPlan.title'),
        nutrition: t('services.nutritionPlan.title'),
        beat: t('services.tacticRecommendations.title'),
        video: t('services.videoAnalysis.title'),
        comparison: t('services.athleteComparison.title'),
        statistics: t('services.statistics.title'),
      };
      return serviceLabels[serviceType] || serviceType;
    } catch (error) {
      console.error('Error getting service label:', error);
      return serviceType;
    }
  };

  // Add new generation to queue and auto-trigger (max 4 concurrent)
  const addToQueue = (athleteName: string, serviceType: string, autoTrigger: boolean = true) => {
    const itemId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setQueue(prev => {
      const runningCount = prev.filter(item => item.status === 'running').length;
      const shouldStart = autoTrigger && runningCount < 4;
      
      const newItem: GenerationItem = {
        id: itemId,
        athleteName,
        serviceType,
        status: shouldStart ? 'running' : 'pending',
        createdAt: new Date(),
        progressMessage: shouldStart ? t('services.queue.requestSent') : t('services.queue.waiting')
      };
      
      // Update progress messages over time for running items with better progression
      if (shouldStart) {
        // Track creation time and timeouts for cleanup
        creationTimesRef.current[itemId] = Date.now();
        timeoutsRef.current[itemId] = [];
        
        const timeout1 = setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.takingTime') });
        }, 2000);
        timeoutsRef.current[itemId].push(timeout1);
        
        const timeout2 = setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.analyzingData') });
        }, 8000);
        timeoutsRef.current[itemId].push(timeout2);
        
        const timeout3 = setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.gatheringInsights') });
        }, 20000);
        timeoutsRef.current[itemId].push(timeout3);
        
        const timeout4 = setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.buildingAnalysis') });
        }, 40000);
        timeoutsRef.current[itemId].push(timeout4);
        
        const timeout5 = setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.almostThere') });
        }, 70000);
        timeoutsRef.current[itemId].push(timeout5);
      }
      
      setIsVisible(true);
      return [...prev, newItem];
    });
    
    return itemId;
  };

  // Process queue - start pending items if slots are available
  const processQueue = () => {
    setQueue(prev => {
      const runningCount = prev.filter(item => item.status === 'running').length;
      const availableSlots = Math.max(0, 4 - runningCount);
      
      if (availableSlots === 0) return prev;
      
      let slotsUsed = 0;
      const updated = prev.map(item => {
        if (item.status === 'pending' && slotsUsed < availableSlots) {
          slotsUsed++;
          
          // Start the pending item
          const runningItem = { 
            ...item, 
            status: 'running' as const,
            progressMessage: t('services.queue.requestSent')
          };
          
          // Update progress messages over time for newly started items with better progression
          // Track creation time and timeouts for cleanup
          creationTimesRef.current[item.id] = Date.now();
          timeoutsRef.current[item.id] = [];
          
          const timeout1 = setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.takingTime') });
          }, 2000);
          timeoutsRef.current[item.id].push(timeout1);
          
          const timeout2 = setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.analyzingData') });
          }, 8000);
          timeoutsRef.current[item.id].push(timeout2);
          
          const timeout3 = setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.gatheringInsights') });
          }, 20000);
          timeoutsRef.current[item.id].push(timeout3);
          
          const timeout4 = setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.buildingAnalysis') });
          }, 40000);
          timeoutsRef.current[item.id].push(timeout4);
          
          const timeout5 = setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.almostThere') });
          }, 70000);
          timeoutsRef.current[item.id].push(timeout5);
          
          return runningItem;
        }
        return item;
      });
      
      return updated;
    });
  };

  // Update generation status with notification and queue processing
  const updateGeneration = (id: string, updates: Partial<GenerationItem>) => {
    let shouldNavigateToVideo = false;
    let videoResult: any = null;
    
    setQueue(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          
          // Check if we should auto-navigate to video analysis page
          if (updates.status === 'completed' && item.serviceType === 'video' && updates.result) {
            shouldNavigateToVideo = true;
            videoResult = updates.result;
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Process queue after update to start pending items
      setTimeout(() => processQueue(), 100);
      
      return updated;
    });
    
    // Auto-navigate to video analysis page when video analysis completes (outside state update)
    if (shouldNavigateToVideo && videoResult) {
      sessionStorage.setItem('videoAnalysisData', JSON.stringify(videoResult));
      setTimeout(() => {
        setLocation('/video-analysis');
      }, 500); // Small delay to ensure state is updated
    }
  };

  // Remove generation from queue or cancel if running
  const removeGeneration = (id: string, showConfirm: boolean = false) => {
    if (showConfirm) {
      setItemToCancel(id);
      setShowCancelDialog(true);
      return;
    }
    // Clear any pending timeouts and creation time for this item
    clearItemTimeouts(id);
    delete creationTimesRef.current[id];
    
    setQueue(prev => prev.filter(item => item.id !== id));
    // Process queue after removal to start pending items
    setTimeout(() => processQueue(), 100);
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    if (itemToCancel) {
      const canceledItem = queue.find(item => item.id === itemToCancel);
      
      // Clear any pending timeouts for this item before removal
      clearItemTimeouts(itemToCancel);
      
      // Update UI immediately
      setQueue(prev => prev.filter(item => item.id !== itemToCancel));
      setItemToCancel(null);
      setShowCancelDialog(false);
      
      // First, try to use the onCancel callback (for AbortController-based operations like video)
      if (canceledItem?.onCancel) {
        canceledItem.onCancel();
      }
      // Otherwise, cancel backend job in the background (don't await)
      else if (canceledItem?.jobId && ['nutrition', 'development', 'video'].includes(canceledItem.serviceType)) {
        fetch(`/api/jobs/${canceledItem.jobId}`, {
          method: 'DELETE',
          credentials: 'include'
        }).catch(error => {
          console.error('Error canceling job:', error);
        });
      } else if (canceledItem && window.cancelGeneration) {
        // For other services, use the old cancellation method
        window.cancelGeneration(canceledItem.athleteName, canceledItem.serviceType);
      }
      
      // Process queue immediately to start pending items
      processQueue();
    } else {
      setShowCancelDialog(false);
    }
  };

  // Handle cancel dialog close
  const handleCancelClose = () => {
    setItemToCancel(null);
    setShowCancelDialog(false);
  };

  // Retry failed generation
  const retryGeneration = async (item: GenerationItem) => {
    // If item has a custom retry callback, use it
    if (item.onRetry) {
      removeGeneration(item.id);
      item.onRetry();
      return;
    }
    
    // Remove the failed item
    removeGeneration(item.id);
    
    // Create a new queue item
    const newId = addToQueue(item.athleteName, item.serviceType, true);
    
    // Find the athlete ID from the item result or global context
    const athleteId = item.result?.athleteId || window.currentAthleteId;
    
    if (!athleteId) {
      console.error('Cannot retry: athlete ID not available');
      updateGeneration(newId, { 
        status: 'error', 
        error: 'Cannot retry: athlete information not available' 
      });
      return;
    }
    
    try {
      // Trigger the analysis API directly
      const response = await fetch(`/api/analysis/${athleteId}/${item.serviceType}`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        updateGeneration(newId, { 
          status: 'completed', 
          result: { ...result, serviceType: item.serviceType, athleteName: item.athleteName, athleteId }
        });
      } else {
        const error = await response.json();
        updateGeneration(newId, { 
          status: 'error', 
          error: error.message || 'Failed to regenerate analysis'
        });
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      updateGeneration(newId, { 
        status: 'error', 
        error: 'Network error during retry'
      });
    }
  };

  // Clear completed generations
  const clearCompleted = () => {
    const completedCount = queue.filter(item => item.status === 'completed' || item.status === 'error').length;
    if (completedCount === 0) return; // No completed items to clear
    
    // Clear timeouts for all completed/error items before removal
    queue.forEach(item => {
      if (item.status === 'completed' || item.status === 'error') {
        clearItemTimeouts(item.id);
      }
    });
    
    setQueue(prev => prev.filter(item => item.status !== 'completed' && item.status !== 'error'));
    // Process queue after clearing completed items
    setTimeout(() => processQueue(), 100);
  };

  // Handle viewing a generation result (same as history items)
  const handleViewResult = (item: GenerationItem) => {
    if (!item.result) return;

    console.log('Queue result clicked:', item);
    
    if (item.serviceType === 'comparison') {
      // Navigate to home with comparison tab and data
      const encodedData = encodeURIComponent(JSON.stringify(item.result));
      const url = "/?tab=comparison&data=" + encodedData;
      console.log('Navigating to comparison:', url);
      
      setLocation(url);
      setTimeout(() => {
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
        
        // Remove the completed comparison from queue after navigation
        removeGeneration(item.id);
      }, 100);
    } else if (item.serviceType === 'video') {
      // Navigate to video analysis page with data in sessionStorage
      sessionStorage.setItem('videoAnalysisData', JSON.stringify(item.result));
      setLocation('/video-analysis');
      
      // Remove the completed video analysis from queue after navigation
      removeGeneration(item.id);
    } else if (item.serviceType === 'development-plan' || item.serviceType === 'development') {
      // Navigate to home with development tab and store result in sessionStorage
      sessionStorage.setItem('developmentPlanData', JSON.stringify(item.result));
      setLocation('/?tab=development&data=fromStorage');
      
      // Remove the completed development plan from queue after navigation
      setTimeout(() => {
        removeGeneration(item.id);
      }, 100);
    } else if (item.serviceType === 'nutrition-plan' || item.serviceType === 'nutrition') {
      // Navigate to home with nutrition tab and store result in sessionStorage
      sessionStorage.setItem('nutritionPlanData', JSON.stringify(item.result));
      setLocation('/?tab=nutrition&data=fromStorage');
      
      // Remove the completed nutrition plan from queue after navigation
      setTimeout(() => {
        removeGeneration(item.id);
      }, 100);
    } else if (item.serviceType === 'statistics') {
      // Show analysis popup for statistics
      setSelectedResult(item);
      setShowAnalysisPopup(true);
    } else {
      // Show analysis popup for other types
      setSelectedResult(item);
      setShowAnalysisPopup(true);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pause className="w-3 h-3" />;
      case 'running': return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'completed': return <Check className="w-3 h-3" />;
      case 'error': return <X className="w-3 h-3" />;
      default: return null;
    }
  };

  // Hide queue if empty
  useEffect(() => {
    if (queue.length === 0) {
      setIsVisible(false);
    }
  }, [queue.length]);

  // Expose queue management functions globally and setup toast integration
  useEffect(() => {
    (window as any).generationQueue = {
      add: addToQueue,
      update: updateGeneration,
      remove: removeGeneration,
      retry: retryGeneration,
      getQueue: () => queue
    };

    // Expose toast function for notifications
    (window as any).showToast = ({ title, description }: { title: string; description: string }) => {
      // This will be handled by the toast system in the main app
      const event = new CustomEvent('queue-notification', { 
        detail: { title, description } 
      });
      window.dispatchEvent(event);
    };

    return () => {
      delete (window as any).generationQueue;
      delete (window as any).showToast;
    };
  }, [addToQueue, updateGeneration, removeGeneration, retryGeneration, queue]);

  if (!isVisible) return null;

  const isArabic = i18n.language === 'ar';

  return (
    <div className={`fixed bottom-2 sm:bottom-4 z-50 w-72 sm:w-auto sm:max-w-md ${isArabic ? 'left-2 sm:left-4' : 'right-2 sm:right-4'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <Card className="bg-athlete-gray-800/95 backdrop-blur-sm border-gray-600 shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2 sm:p-3 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm font-semibold text-gray-100">
              {t('services.queue.title')} ({queue.length})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
            >
              <span className="text-xs">{isMinimized ? '▲' : '▼'}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const hasRunning = queue.some(item => item.status === 'running' || item.status === 'pending');
                if (!hasRunning) {
                  setIsVisible(false);
                }
              }}
              disabled={queue.some(item => item.status === 'running' || item.status === 'pending')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title={queue.some(item => item.status === 'running' || item.status === 'pending') ? t('services.queue.cannotClose') : t('services.queue.closeQueue')}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <CardContent className="p-0 max-h-40 sm:max-h-64 overflow-y-auto">
            <div className="divide-y divide-gray-700">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2 sm:p-3 hover:bg-athlete-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${getStatusColor(item.status)}`}>
                          {item.status === 'running' && (
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-ping bg-current opacity-75"></div>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-gray-100 truncate">
                          {item.athleteName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge 
                          variant="outline" 
                          className="text-[9px] sm:text-xs border-blue-500/50 text-blue-400 bg-blue-500/10 font-medium"
                        >
                          {getServiceLabel(item.serviceType)}
                        </Badge>
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 truncate">
                        {item.status === 'error' ? item.error : 
                         item.status === 'running' ? (item.progressMessage || t('services.queue.statusRunning')) :
                         item.status === 'pending' ? t('services.queue.statusPending') :
                         item.status === 'completed' ? t('services.queue.statusCompleted') :
                         item.status}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {item.status === 'completed' && item.result && (
                        <Button
                          variant="ghost"
                          onClick={() => handleViewResult(item)}
                          className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title={t('services.queue.view')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {item.status === 'error' && (
                        <Button
                          variant="ghost"
                          onClick={() => retryGeneration(item)}
                          className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          title={t('services.queue.retry')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => removeGeneration(item.id, item.status === 'running')}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        title={item.status === 'running' ? t('services.queue.cancel') : t('services.queue.remove')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}

        {queue.length === 0 && !isMinimized && (
          <CardContent className="p-3 sm:p-4 text-center text-gray-400 text-xs sm:text-sm">
            {t('services.queue.emptyQueue')}
          </CardContent>
        )}

        {/* Analysis Popup */}
        {showAnalysisPopup && selectedResult && (
          <AnalysisPopup
            open={showAnalysisPopup}
            onOpenChange={(open) => {
              setShowAnalysisPopup(open);
              if (!open) {
                setSelectedResult(null);
              }
            }}
            type={selectedResult.serviceType}
            data={selectedResult.result}
            athleteName={selectedResult.athleteName}
            athleteId=""
            createdAt={selectedResult.createdAt?.toISOString()}
          />
        )}

        {/* Cancel Confirmation Dialog */}
        <CancelConfirmationDialog
          isOpen={showCancelDialog}
          onConfirm={handleCancelConfirm}
          onCancel={handleCancelClose}
          title={t('services.queue.cancelDialog.title')}
          description={t('services.queue.cancelDialog.description')}
        />
      </Card>
    </div>
  );
};

export default GenerationQueue;