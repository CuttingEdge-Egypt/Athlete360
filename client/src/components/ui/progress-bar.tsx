import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProgressPhase = {
  message: string;
  progress: number;
};

type ProgressBarProps = {
  isActive: boolean;
  currentPhase?: ProgressPhase;
  onCancel?: () => void;
  className?: string;
};

export function ProgressBar({ isActive, currentPhase, onCancel, className = "" }: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    if (!isActive) {
      setDisplayProgress(0);
      return;
    }

    const targetProgress = currentPhase?.progress || 0;
    
    // Animate to target progress
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev < targetProgress) {
          const increment = Math.max(1, (targetProgress - prev) / 10);
          return Math.min(prev + increment, targetProgress);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, currentPhase?.progress]);

  if (!isActive) return null;

  return (
    <div className={`bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30 p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header with cancel button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
            <h3 className="text-lg font-semibold text-white">
              Generating Comparison
            </h3>
          </div>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              data-testid="button-cancel-comparison"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="relative">
            <Progress 
              value={displayProgress} 
              className="h-3 bg-gray-700 border border-gray-600"
              data-testid="progress-bar"
            />
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-200 font-medium">
              {currentPhase?.message || "Initializing..."}
            </p>
            <p className="text-purple-300 font-bold text-base">
              {Math.round(displayProgress)}%
            </p>
          </div>
        </div>

        {/* Helpful info */}
        <p className="text-xs text-gray-500">
          This may take up to 3 mins. We're analyzing both athletes using AI.
        </p>
      </div>
    </div>
  );
}
