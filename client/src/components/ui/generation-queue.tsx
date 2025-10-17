import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisPopup } from '@/components/ui/analysis-popup';
import { CancelConfirmationDialog } from '@/components/ui/cancel-confirmation-dialog';
import { X, Play, Pause, RotateCcw, Check, Loader2, Eye, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('home');
  const [queue, setQueue] = useState<GenerationItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [, setLocation] = useLocation();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<string | null>(null);

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
        setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.takingTime') });
        }, 2000); // 2 seconds
        
        setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.analyzingData') });
        }, 8000); // 8 seconds
        
        setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.gatheringInsights') });
        }, 20000); // 20 seconds
        
        setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.buildingAnalysis') });
        }, 40000); // 40 seconds
        
        setTimeout(() => {
          updateGeneration(itemId, { progressMessage: t('services.queue.almostThere') });
        }, 70000); // 70 seconds
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
          setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.takingTime') });
          }, 2000); // 2 seconds
          
          setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.analyzingData') });
          }, 8000); // 8 seconds
          
          setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.gatheringInsights') });
          }, 20000); // 20 seconds
          
          setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.buildingAnalysis') });
          }, 40000); // 40 seconds
          
          setTimeout(() => {
            updateGeneration(item.id, { progressMessage: t('services.queue.almostThere') });
          }, 70000); // 70 seconds
          
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
    setQueue(prev => prev.filter(item => item.id !== id));
    // Process queue after removal to start pending items
    setTimeout(() => processQueue(), 100);
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    if (itemToCancel) {
      const canceledItem = queue.find(item => item.id === itemToCancel);
      
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
      } else if (canceledItem && (window as any).cancelGeneration) {
        // For other services, use the old cancellation method
        (window as any).cancelGeneration(canceledItem.athleteName, canceledItem.serviceType);
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
    // Remove the failed item
    removeGeneration(item.id);
    
    // Create a new queue item
    const newId = addToQueue(item.athleteName, item.serviceType, true);
    
    // Find the athlete ID from the item result or global context
    const athleteId = item.result?.athleteId || (window as any).currentAthleteId;
    
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
      }, 100);
    } else if (item.serviceType === 'video') {
      // Navigate to video analysis page with data in sessionStorage
      sessionStorage.setItem('videoAnalysisData', JSON.stringify(item.result));
      setLocation('/video-analysis');
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
      retry: retryGeneration
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
  }, [addToQueue, updateGeneration, removeGeneration, retryGeneration]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-athlete-gray-800 border-gray-600 shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200">
              {t('services.queue.title')} ({queue.length})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
            >
              {isMinimized ? '▲' : '▼'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const hasRunning = queue.some(item => item.status === 'running' || item.status === 'pending');
                if (!hasRunning) {
                  setIsVisible(false);
                }
              }}
              disabled={queue.some(item => item.status === 'running' || item.status === 'pending')}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title={queue.some(item => item.status === 'running' || item.status === 'pending') ? "Cannot close while generation is in progress" : "Close queue"}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <div className="space-y-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-athlete-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}>
                        {item.status === 'running' && (
                          <div className="w-2 h-2 rounded-full animate-ping bg-current opacity-75"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {item.athleteName}
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-xs border-gray-500 text-gray-300"
                      >
                        {item.serviceType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {getStatusIcon(item.status)}
                      <span>
                        {item.status === 'error' ? item.error : 
                         item.status === 'running' ? (item.progressMessage || 'running') :
                         item.status}
                      </span>
                      <span>•</span>
                      <span>{item.createdAt.toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    {item.status === 'completed' && item.result && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResult(item)}
                        className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        title={t('services.queue.view')}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    {item.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryGeneration(item)}
                        className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                        title={t('services.queue.retry')}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGeneration(item.id, item.status === 'running')}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                      title={item.status === 'running' ? t('services.queue.cancel') : t('services.queue.remove')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}

        {queue.length === 0 && !isMinimized && (
          <CardContent className="p-4 text-center text-gray-400 text-sm">
            No generations in queue
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