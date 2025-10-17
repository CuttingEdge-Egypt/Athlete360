import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ProgressUpdate {
  athleteId: string;
  message: string;
  step?: string;
  isComplete: boolean;
  error?: string;
  timestamp: string;
}

interface RankingProgressDrawerProps {
  athleteId: string | null;
  athleteName: string;
  onClose: () => void;
}

export function RankingProgressDrawer({ athleteId, athleteName, onClose }: RankingProgressDrawerProps) {
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!athleteId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/ranking-progress`);

    ws.onopen = () => {
      console.log('🔌 Connected to ranking progress WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data: ProgressUpdate = JSON.parse(event.data);
        
        // Only add updates for this athlete
        if (data.athleteId === athleteId) {
          setProgress(prev => [...prev, data]);
          
          if (data.isComplete) {
            setIsComplete(true);
            if (data.error) {
              setHasError(true);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from ranking progress WebSocket');
    };

    return () => {
      ws.close();
    };
  }, [athleteId]);

  const getStepIcon = (step?: string, isComplete?: boolean, error?: string) => {
    if (error) return <XCircle className="w-4 h-4 text-red-500" />;
    if (isComplete && !error) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    
    switch (step) {
      case 'init':
      case 'browser_init':
      case 'navigation':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'ai_analysis':
      case 'typing':
      case 'clicking':
      case 'scrolling':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'extract':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'not_found':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
    }
  };

  return (
    <Sheet open={!!athleteId} onOpenChange={() => onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isComplete ? (
              hasError ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )
            ) : (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            )}
            Ranking Search Progress
          </SheetTitle>
          <SheetDescription>
            Live updates for {athleteName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {progress.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Initializing...</p>
              </div>
            ) : (
              progress.map((update, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  data-testid={`progress-update-${index}`}
                >
                  <div className="mt-0.5">
                    {getStepIcon(update.step, update.isComplete, update.error)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{update.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </p>
                    {update.error && (
                      <p className="text-xs text-red-500 mt-1">Error: {update.error}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {isComplete && (
            <div className="pt-4 border-t">
              <Button
                onClick={onClose}
                className="w-full"
                data-testid="button-close-progress"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
