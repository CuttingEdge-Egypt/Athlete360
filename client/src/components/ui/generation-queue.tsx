import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Play, Pause, RotateCcw, Check, Loader2, Eye } from 'lucide-react';

interface GenerationItem {
  id: string;
  athleteName: string;
  serviceType: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  createdAt: Date;
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
  const [queue, setQueue] = useState<GenerationItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Add new generation to queue
  const addToQueue = (athleteName: string, serviceType: string) => {
    const newItem: GenerationItem = {
      id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      athleteName,
      serviceType,
      status: 'pending',
      createdAt: new Date()
    };
    
    setQueue(prev => [...prev, newItem]);
    setIsVisible(true);
    return newItem.id;
  };

  // Update generation status
  const updateGeneration = (id: string, updates: Partial<GenerationItem>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  // Remove generation from queue
  const removeGeneration = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // Clear completed generations
  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed' && item.status !== 'error'));
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

  // Expose queue management functions globally
  useEffect(() => {
    (window as any).generationQueue = {
      add: addToQueue,
      update: updateGeneration,
      remove: removeGeneration
    };

    return () => {
      delete (window as any).generationQueue;
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-athlete-gray-800 border-gray-600 shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200">
              Generation Queue ({queue.length})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
              title="Clear completed"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
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
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
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
                        {item.status === 'error' ? item.error : item.status}
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
                        onClick={() => onSelectGeneration(item.result)}
                        className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        title="View result"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGeneration(item.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                      title="Remove"
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
      </Card>
    </div>
  );
};

export default GenerationQueue;