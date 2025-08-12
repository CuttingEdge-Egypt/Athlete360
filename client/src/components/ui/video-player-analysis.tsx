import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Volume2, Trophy, Swords, Star, AlertTriangle } from "lucide-react";

interface VideoPlayerAnalysisProps {
  videoFile: File;
  analysisData: any;
}

interface TimelineEvent {
  timestamp: number;
  type: 'score' | 'kick' | 'punch' | 'yellow_card';
  content: string;
  icon: any;
  color: string;
}

export function VideoPlayerAnalysis({ videoFile, analysisData }: VideoPlayerAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoUrl, setVideoUrl] = useState<string>("");

  // Parse analysis data and extract timestamped events
  const parseTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    // Parse each analysis type for timestamps
    const parseAnalysisData = (jsonString: string) => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (error) {
        return { content: jsonString };
      }
    };

    const scoreAnalysis = analysisData.score_analysis ? parseAnalysisData(analysisData.score_analysis) : null;
    const kickAnalysis = analysisData.kick_analysis ? parseAnalysisData(analysisData.kick_analysis) : null;
    const punchAnalysis = analysisData.punch_analysis ? parseAnalysisData(analysisData.punch_analysis) : null;
    const yellowCardAnalysis = analysisData.yellow_card_analysis ? parseAnalysisData(analysisData.yellow_card_analysis) : null;

    // Extract timestamp patterns from each analysis
    const timestampRegex = /(\d{1,2}:\d{2}|\d{1,3}s|\d+\s*seconds?|\d+\s*min)/gi;
    
    // Helper function to convert timestamp to seconds
    const parseTimestamp = (timeStr: string): number => {
      const cleanTime = timeStr.toLowerCase().replace(/[^\d:]/g, '');
      if (cleanTime.includes(':')) {
        const [min, sec] = cleanTime.split(':').map(Number);
        return min * 60 + sec;
      } else {
        return parseInt(cleanTime) || 0;
      }
    };

    // Process score analysis
    if (scoreAnalysis) {
      const content = typeof scoreAnalysis === 'string' ? scoreAnalysis : JSON.stringify(scoreAnalysis);
      const matches = content.match(timestampRegex);
      if (matches) {
        matches.forEach((match, index) => {
          const timestamp = parseTimestamp(match);
          if (timestamp > 0) {
            events.push({
              timestamp,
              type: 'score',
              content: `Scoring event detected at ${match}`,
              icon: Trophy,
              color: 'text-yellow-400'
            });
          }
        });
      }
    }

    // Process kick analysis
    if (kickAnalysis) {
      const content = typeof kickAnalysis === 'string' ? kickAnalysis : JSON.stringify(kickAnalysis);
      const matches = content.match(timestampRegex);
      if (matches) {
        matches.forEach((match, index) => {
          const timestamp = parseTimestamp(match);
          if (timestamp > 0) {
            events.push({
              timestamp,
              type: 'kick',
              content: `Kick technique at ${match}`,
              icon: Swords,
              color: 'text-blue-400'
            });
          }
        });
      }
    }

    // Process punch analysis
    if (punchAnalysis) {
      const content = typeof punchAnalysis === 'string' ? punchAnalysis : JSON.stringify(punchAnalysis);
      const matches = content.match(timestampRegex);
      if (matches) {
        matches.forEach((match, index) => {
          const timestamp = parseTimestamp(match);
          if (timestamp > 0) {
            events.push({
              timestamp,
              type: 'punch',
              content: `Punch attempt at ${match}`,
              icon: Star,
              color: 'text-red-400'
            });
          }
        });
      }
    }

    // Process yellow card analysis
    if (yellowCardAnalysis) {
      const content = typeof yellowCardAnalysis === 'string' ? yellowCardAnalysis : JSON.stringify(yellowCardAnalysis);
      const matches = content.match(timestampRegex);
      if (matches) {
        matches.forEach((match, index) => {
          const timestamp = parseTimestamp(match);
          if (timestamp > 0) {
            events.push({
              timestamp,
              type: 'yellow_card',
              content: `Penalty issued at ${match}`,
              icon: AlertTriangle,
              color: 'text-yellow-400'
            });
          }
        });
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  };

  const timelineEvents = parseTimelineEvents();
  
  // Get current active events (within 3 seconds of current time)
  const activeEvents = timelineEvents.filter(
    event => Math.abs(event.timestamp - currentTime) <= 3
  );

  useEffect(() => {
    // Create video URL from file
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const parseMatchAnalysis = () => {
    try {
      return typeof analysisData.match_analysis === 'string' 
        ? JSON.parse(analysisData.match_analysis) 
        : analysisData.match_analysis;
    } catch (error) {
      return { content: analysisData.match_analysis || "No match analysis available" };
    }
  };

  const matchAnalysis = parseMatchAnalysis();

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardContent className="p-0">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-auto max-h-96"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              data-testid="video-player"
            />
            
            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="relative bg-gray-700 h-1 rounded cursor-pointer"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const clickX = e.clientX - rect.left;
                       const newTime = (clickX / rect.width) * duration;
                       handleSeek(newTime);
                     }}>
                  <div 
                    className="bg-indigo-500 h-1 rounded transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  
                  {/* Timeline Event Markers */}
                  {timelineEvents.map((event, index) => (
                    <div
                      key={index}
                      className="absolute top-0 w-0.5 h-3 -mt-1 cursor-pointer"
                      style={{ 
                        left: `${(event.timestamp / duration) * 100}%`,
                        backgroundColor: event.type === 'score' ? '#facc15' : 
                                       event.type === 'kick' ? '#3b82f6' :
                                       event.type === 'punch' ? '#ef4444' : '#f59e0b'
                      }}
                      title={event.content}
                    />
                  ))}
                </div>
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSeek(0)}
                    className="text-white hover:bg-white/20"
                    data-testid="button-restart"
                  >
                    <RotateCcw size={16} />
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Volume2 size={16} className="text-white" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 accent-indigo-500"
                      data-testid="volume-slider"
                    />
                  </div>
                </div>
                
                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Events Display */}
      {activeEvents.length > 0 && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <AlertTriangle className="mr-2 text-indigo-400" size={20} />
              Live Analysis Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeEvents.map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-athlete-gray-700 rounded-lg">
                  <event.icon className={`${event.color}`} size={20} />
                  <div>
                    <Badge variant="outline" className={`${event.color} border-current mb-1`}>
                      {event.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <p className="text-gray-300 text-sm">{event.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Overview */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Analysis Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {timelineEvents.map((event, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-athlete-gray-700 rounded cursor-pointer hover:bg-athlete-gray-600 transition-colors"
                onClick={() => handleSeek(event.timestamp)}
                data-testid={`timeline-event-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <event.icon className={`${event.color}`} size={16} />
                  <span className="text-gray-300 text-sm">{event.content}</span>
                </div>
                <span className="text-indigo-400 text-sm font-mono">
                  {formatTime(event.timestamp)}
                </span>
              </div>
            ))}
            {timelineEvents.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                No timestamped events found in analysis
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Match Analysis (Non-timestamped) */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Trophy className="mr-2 text-yellow-400" size={20} />
            Complete Match Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300 leading-relaxed whitespace-pre-line">
            {typeof matchAnalysis === 'string' 
              ? matchAnalysis 
              : typeof matchAnalysis.content === 'string'
              ? matchAnalysis.content
              : JSON.stringify(matchAnalysis, null, 2)
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}