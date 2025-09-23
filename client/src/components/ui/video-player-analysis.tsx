import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, Trophy, Brain, Target, MessageSquare, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VideoPlayerAnalysisProps {
  videoFile: File;
  analysisData: any;
}

interface ScoreEvent {
  timestamp: number;
  blueScore: number;
  redScore: number;
  increment: number;
  player: 'blue' | 'red';
}

interface YellowCardEvent {
  timestamp: number;
  blueCards: number;
  redCards: number;
  player: 'blue' | 'red';
}

export function VideoPlayerAnalysis({ videoFile, analysisData }: VideoPlayerAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoUrl, setVideoUrl] = useState<string>("");

  // Parse analysis data and extract scoring/card events with cumulative tracking
  const parseAnalysisEvents = () => {
    const parseAnalysisData = (jsonString: string) => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (error) {
        return { content: jsonString };
      }
    };

    const scoreAnalysis = analysisData.score_analysis ? parseAnalysisData(analysisData.score_analysis) : null;
    const yellowCardAnalysis = analysisData.yellow_card_analysis ? parseAnalysisData(analysisData.yellow_card_analysis) : null;
    const kickAnalysis = analysisData.kick_count_analysis ? parseAnalysisData(analysisData.kick_count_analysis) : null;

    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log("=== VIDEO ANALYSIS DEBUG ===");
      console.log("Score Analysis:", scoreAnalysis);
      console.log("Yellow Card Analysis:", yellowCardAnalysis);
      console.log("Kick Analysis:", kickAnalysis);
      console.log("Raw analysisData:", analysisData);
    }

    const timestampRegex = /(\d{1,2}:\d{2}|\d{1,3}s|\d+\s*seconds?|\d+\s*min)/gi;
    
    const parseTimestamp = (timeStr: string): number => {
      const cleanTime = timeStr.toLowerCase().replace(/[^\d:]/g, '');
      if (cleanTime.includes(':')) {
        const [min, sec] = cleanTime.split(':').map(Number);
        return min * 60 + sec;
      } else {
        return parseInt(cleanTime) || 0;
      }
    };

    const scoreEvents: ScoreEvent[] = [];
    const yellowCardEvents: YellowCardEvent[] = [];

    // Parse scoring events with cumulative tracking
    if (scoreAnalysis) {
      let blueScore = 0;
      let redScore = 0;

      // Handle both old format (string content) and new JSON format with color field
      if (typeof scoreAnalysis === 'string') {
        // Old format - parse text content
        const lines = scoreAnalysis.split('\n');
        lines.forEach(line => {
          const timestamps = line.match(timestampRegex);
          if (timestamps) {
            timestamps.forEach(match => {
              const timestamp = parseTimestamp(match);
              if (timestamp > 0) {
                const isBlueScore = line.toLowerCase().includes('blue') || line.toLowerCase().includes('player 1');
                const isRedScore = line.toLowerCase().includes('red') || line.toLowerCase().includes('player 2');
                const pointMatch = line.match(/(\d+)\s*point/i);
                const points = pointMatch ? parseInt(pointMatch[1]) : 1;

                if (isBlueScore) {
                  blueScore += points;
                  scoreEvents.push({
                    timestamp,
                    blueScore,
                    redScore,
                    increment: points,
                    player: 'blue'
                  });
                } else if (isRedScore) {
                  redScore += points;
                  scoreEvents.push({
                    timestamp,
                    blueScore,
                    redScore,
                    increment: points,
                    player: 'red'
                  });
                }
              }
            });
          }
        });
      } else if (scoreAnalysis) {
        // New JSON format - handle both array-wrapped and direct object format
        let playersArray = [];
        
        // Handle array-wrapped response format
        if (Array.isArray(scoreAnalysis) && scoreAnalysis[0]?.players) {
          playersArray = scoreAnalysis[0].players;
        } else if (scoreAnalysis.players) {
          playersArray = scoreAnalysis.players;
        }
        
        if (Array.isArray(playersArray)) {
          // First, collect all kicks from both players and sort by timestamp
          const allKicks: Array<{timestamp: number, score: number, color: string}> = [];
          
          playersArray.forEach((player: any) => {
            if (player.color && Array.isArray(player.kicks)) {
              const playerColor = player.color.toLowerCase();
            
              player.kicks.forEach((kick: any) => {
                if (kick.timestamp && kick.score) {
                  const timestamp = parseTimestamp(kick.timestamp);
                  const points = kick.score;
                  allKicks.push({
                    timestamp,
                    score: points,
                    color: playerColor
                  });
                }
              });
            }
          });

          // Sort kicks by timestamp to ensure proper cumulative scoring
          allKicks.sort((a, b) => a.timestamp - b.timestamp);

          // Now process kicks in chronological order
          allKicks.forEach((kick) => {
            if (kick.color === 'blue') {
              blueScore += kick.score;
              scoreEvents.push({
                timestamp: kick.timestamp,
                blueScore,
                redScore,
                increment: kick.score,
                player: 'blue'
              });
            } else if (kick.color === 'red') {
              redScore += kick.score;
              scoreEvents.push({
                timestamp: kick.timestamp,
                blueScore,
                redScore,
                increment: kick.score,
                player: 'red'
              });
            }
          });
        }
      }
    }

    // Parse yellow card events with cumulative tracking
    if (yellowCardAnalysis) {
      let blueCards = 0;
      let redCards = 0;

      // Handle both old format (string content) and new JSON format with color field
      if (typeof yellowCardAnalysis === 'string') {
        // Old format - parse text content
        const lines = yellowCardAnalysis.split('\n');
        lines.forEach(line => {
          const timestamps = line.match(timestampRegex);
          if (timestamps) {
            timestamps.forEach(match => {
              const timestamp = parseTimestamp(match);
              if (timestamp > 0) {
                const isBlueCard = line.toLowerCase().includes('blue') || line.toLowerCase().includes('player 1');
                const isRedCard = line.toLowerCase().includes('red') || line.toLowerCase().includes('player 2');

                if (isBlueCard) {
                  blueCards++;
                  yellowCardEvents.push({
                    timestamp,
                    blueCards,
                    redCards,
                    player: 'blue'
                  });
                } else if (isRedCard) {
                  redCards++;
                  yellowCardEvents.push({
                    timestamp,
                    blueCards,
                    redCards,
                    player: 'red'
                  });
                }
              }
            });
          }
        });
      } else if (yellowCardAnalysis && Array.isArray(yellowCardAnalysis.players)) {
        // New JSON format - use players array with color field
        // First, collect all yellow cards from both players and sort by timestamp
        const allCards: Array<{timestamp: number, color: string}> = [];
        
        yellowCardAnalysis.players.forEach((player: any) => {
          if (player.color && Array.isArray(player.Yellow_cards)) {
            const playerColor = player.color.toLowerCase();
            
            player.Yellow_cards.forEach((card: any) => {
              if (card.timestamp) {
                const timestamp = parseTimestamp(card.timestamp);
                allCards.push({
                  timestamp,
                  color: playerColor
                });
              }
            });
          }
        });

        // Sort cards by timestamp to ensure proper cumulative counting
        allCards.sort((a, b) => a.timestamp - b.timestamp);

        // Now process cards in chronological order
        allCards.forEach((card) => {
          if (card.color === 'blue') {
            blueCards++;
            yellowCardEvents.push({
              timestamp: card.timestamp,
              blueCards,
              redCards,
              player: 'blue'
            });
          } else if (card.color === 'red') {
            redCards++;
            yellowCardEvents.push({
              timestamp: card.timestamp,
              blueCards,
              redCards,
              player: 'red'
            });
          }
        });
      }
    }

    // Extract total kick counts
    let blueKicks = 0;
    let redKicks = 0;
    if (kickAnalysis) {
      // First try new JSON format with players array
      if (Array.isArray(kickAnalysis.players)) {
        kickAnalysis.players.forEach((player: any) => {
          // Handle the actual kick count JSON structure
          if (player.kicks && Array.isArray(player.kicks) && player.kicks[0]?.total_kick_number !== undefined) {
            const playerName = player.name?.toLowerCase() || '';
            const totalKicks = player.kicks[0].total_kick_number;
            
            // Determine player color based on name or other identifiers
            if (playerName.includes('blue') || playerName.includes('player 1')) {
              blueKicks = totalKicks;
            } else if (playerName.includes('red') || playerName.includes('player 2')) {
              redKicks = totalKicks;
            }
          }
          // Fallback to direct total_kicks property if available
          else if (player.color && player.total_kicks) {
            const playerColor = player.color.toLowerCase();
            if (playerColor === 'blue') {
              blueKicks = player.total_kicks;
            } else if (playerColor === 'red') {
              redKicks = player.total_kicks;
            }
          }
        });
      } else {
        // Fallback to old text parsing method
        const content = typeof kickAnalysis === 'string' ? kickAnalysis : JSON.stringify(kickAnalysis);
        const blueKickMatch = content.match(/player\s*1.*?(\d+).*?kick/i) || content.match(/blue.*?(\d+).*?kick/i);
        const redKickMatch = content.match(/player\s*2.*?(\d+).*?kick/i) || content.match(/red.*?(\d+).*?kick/i);
        
        if (blueKickMatch) blueKicks = parseInt(blueKickMatch[1]) || 0;
        if (redKickMatch) redKicks = parseInt(redKickMatch[1]) || 0;
      }
    }

    // Additional debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log("=== PARSED EVENTS ===");
      console.log("Score Events:", scoreEvents);
      console.log("Yellow Card Events:", yellowCardEvents);
      console.log("Blue Kicks:", blueKicks, "Red Kicks:", redKicks);
    }

    return { scoreEvents, yellowCardEvents, blueKicks, redKicks };
  };

  const { scoreEvents, yellowCardEvents, blueKicks, redKicks } = parseAnalysisEvents();

  // Get current scores/cards based on video time
  const getCurrentStats = () => {
    const currentScoreEvent = scoreEvents
      .filter(event => event.timestamp <= currentTime)
      .pop();
    
    const currentCardEvent = yellowCardEvents
      .filter(event => event.timestamp <= currentTime)
      .pop();

    return {
      blueScore: currentScoreEvent?.blueScore || 0,
      redScore: currentScoreEvent?.redScore || 0,
      blueCards: currentCardEvent?.blueCards || 0,
      redCards: currentCardEvent?.redCards || 0
    };
  };

  const currentStats = getCurrentStats();

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

  const prettifyMatchAnalysis = (rawText: string): JSX.Element[] => {
    // Remove common introductory phrases
    let cleanText = rawText
      .replace(/^(Of course[!]?\s*Here's a detailed analysis of the taekwondo match\.?\s*)/i, '')
      .replace(/^(Sure[!]?\s*Here's a detailed breakdown of the taekwondo match\.?\s*)/i, '')
      .replace(/^(Certainly[!]?\s*Here's a comprehensive analysis\.?\s*)/i, '')
      .trim();

    // Split into paragraphs and process each
    const paragraphs = cleanText.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Convert **text** to bold formatting
      const formattedText = paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return <strong key={partIndex} className="font-bold text-white">{boldText}</strong>;
        }
        return part;
      });

      return (
        <div key={index} className="mb-4">
          {formattedText}
        </div>
      );
    });
  };

  const matchAnalysis = parseMatchAnalysis();

  return (
    <div className="space-y-6">
      {/* Main Video Layout with Side Stats */}
      <div className="grid grid-cols-12 gap-6">
        {/* Blue Player Stats - Left Side */}
        <div className="col-span-2 space-y-4">
          {/* Blue Score */}
          <Card className="bg-blue-900/20 border-blue-500/30" data-testid="blue-score-card">
            <CardContent className="p-4 text-center">
              <div className="text-blue-400 font-semibold text-sm mb-2">BLUE SCORE</div>
              <div className="text-4xl font-bold text-blue-300" data-testid="blue-score">{currentStats.blueScore}</div>
            </CardContent>
          </Card>

          {/* Blue Kicks */}
          <Card className="bg-blue-900/20 border-blue-500/30" data-testid="blue-kicks-card">
            <CardContent className="p-4 text-center">
              <div className="text-blue-400 font-semibold text-sm mb-2">TOTAL KICKS</div>
              <div className="text-2xl font-bold text-blue-300" data-testid="blue-kicks">{blueKicks}</div>
            </CardContent>
          </Card>

          {/* Blue Yellow Cards */}
          <Card className="bg-blue-900/20 border-blue-500/30" data-testid="blue-cards-card">
            <CardContent className="p-4 text-center">
              <div className="text-blue-400 font-semibold text-sm mb-2">WARNINGS</div>
              <div className="text-2xl font-bold text-yellow-400" data-testid="blue-cards">{currentStats.blueCards}</div>
            </CardContent>
          </Card>
        </div>

        {/* Video Player - Center */}
        <div className="col-span-8">
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
                      
                      {/* Score Event Markers */}
                      {scoreEvents.map((event, index) => (
                        <div
                          key={`score-${index}`}
                          className="absolute top-0 w-0.5 h-3 -mt-1 cursor-pointer bg-yellow-400 hover:bg-yellow-300 z-10"
                          style={{ left: `${(event.timestamp / duration) * 100}%` }}
                          title={`${event.player.toUpperCase()} scores ${event.increment} points - Click to jump`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeek(event.timestamp);
                          }}
                          data-testid={`score-marker-${index}`}
                        />
                      ))}
                      
                      {/* Yellow Card Markers */}
                      {yellowCardEvents.map((event, index) => (
                        <div
                          key={`card-${index}`}
                          className="absolute top-0 w-0.5 h-3 -mt-1 cursor-pointer bg-yellow-600 hover:bg-yellow-500 z-10"
                          style={{ left: `${(event.timestamp / duration) * 100}%` }}
                          title={`${event.player.toUpperCase()} receives yellow card - Click to jump`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeek(event.timestamp);
                          }}
                          data-testid={`card-marker-${index}`}
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
        </div>

        {/* Red Player Stats - Right Side */}
        <div className="col-span-2 space-y-4">
          {/* Red Score */}
          <Card className="bg-red-900/20 border-red-500/30" data-testid="red-score-card">
            <CardContent className="p-4 text-center">
              <div className="text-red-400 font-semibold text-sm mb-2">RED SCORE</div>
              <div className="text-4xl font-bold text-red-300" data-testid="red-score">{currentStats.redScore}</div>
            </CardContent>
          </Card>

          {/* Red Kicks */}
          <Card className="bg-red-900/20 border-red-500/30" data-testid="red-kicks-card">
            <CardContent className="p-4 text-center">
              <div className="text-red-400 font-semibold text-sm mb-2">TOTAL KICKS</div>
              <div className="text-2xl font-bold text-red-300" data-testid="red-kicks">{redKicks}</div>
            </CardContent>
          </Card>

          {/* Red Yellow Cards */}
          <Card className="bg-red-900/20 border-red-500/30" data-testid="red-cards-card">
            <CardContent className="p-4 text-center">
              <div className="text-red-400 font-semibold text-sm mb-2">WARNINGS</div>
              <div className="text-2xl font-bold text-yellow-400" data-testid="red-cards">{currentStats.redCards}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Match Analysis - Bottom */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Trophy className="mr-2 text-yellow-400" size={20} />
            Complete Match Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300 leading-relaxed" data-testid="match-analysis">
            {(() => {
              const rawText = typeof matchAnalysis === 'string' 
                ? matchAnalysis 
                : typeof matchAnalysis.content === 'string'
                ? matchAnalysis.content
                : JSON.stringify(matchAnalysis, null, 2);
              
              return prettifyMatchAnalysis(rawText);
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Player Advice Section - After Match Analysis */}
      <PlayerAdviceSection 
        videoFile={videoFile}
        roundToAnalyze={analysisData.roundAnalyzed || 1}
      />
    </div>
  );
}

// Player Advice Section Component
interface PlayerAdviceSectionProps {
  videoFile: File;
  roundToAnalyze: number;
}

interface PlayerAdvice {
  name: string;
  color: string;
  tactical_advice: {
    issues: string[];
    improvements: string[];
  };
  technical_advice: {
    issues: string[];
    improvements: string[];
  };
  mental_advice: {
    issues: string[];
    improvements: string[];
  };
}

interface AdviceData {
  players: PlayerAdvice[];
  general_observations: string;
}

function PlayerAdviceSection({ videoFile, roundToAnalyze }: PlayerAdviceSectionProps) {
  const [adviceData, setAdviceData] = useState<AdviceData | null>(null);
  const { toast } = useToast();

  const generateAdviceMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('round', roundToAnalyze.toString());

      const response = await fetch('/api/analysis/video/advice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate advice');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Advice generation completed:", data);
      
      try {
        const parsedAdvice = typeof data.advice_analysis === 'string' 
          ? JSON.parse(data.advice_analysis) 
          : data.advice_analysis;
        
        setAdviceData(parsedAdvice);
        toast({
          title: "Advice Generated",
          description: "Player improvement advice has been generated successfully!"
        });
      } catch (error) {
        console.error("Error parsing advice data:", error);
        toast({
          title: "Parsing Error",
          description: "Generated advice could not be parsed properly."
        });
      }
    },
    onError: (error: any) => {
      console.error("Error generating advice:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate player advice. Please try again."
      });
    }
  });

  const handleGenerateAdvice = () => {
    generateAdviceMutation.mutate();
  };

  return (
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Brain className="mr-2 text-purple-400" size={20} />
            Advice for Each Player
          </CardTitle>
          {!adviceData && (
            <Button
              onClick={handleGenerateAdvice}
              disabled={generateAdviceMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="generate-advice-button"
            >
              {generateAdviceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Player Advice
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!adviceData && !generateAdviceMutation.isPending && (
          <div className="text-gray-400 text-center py-8" data-testid="advice-empty-state">
            <Brain className="mx-auto mb-4 text-purple-400" size={48} />
            <p className="text-lg mb-2">Generate AI-Powered Improvement Advice</p>
            <p className="text-sm">Get tactical, technical, and mental improvement suggestions for each player</p>
          </div>
        )}

        {generateAdviceMutation.isPending && (
          <div className="text-center py-8" data-testid="advice-loading">
            <Loader2 className="mx-auto mb-4 text-purple-400 animate-spin" size={48} />
            <p className="text-gray-300 text-lg mb-2">Analyzing player performance...</p>
            <p className="text-gray-400 text-sm">This may take a few moments</p>
          </div>
        )}

        {adviceData && (
          <div className="space-y-6" data-testid="advice-results">
            {/* General Observations */}
            {adviceData.general_observations && (
              <Card className="bg-gray-900/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <MessageSquare className="mr-2 text-blue-400" size={18} />
                    General Observations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 leading-relaxed" data-testid="general-observations">
                    {adviceData.general_observations}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Player Advice Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {adviceData.players?.map((player, index) => (
                <Card 
                  key={index}
                  className={`border-2 ${
                    player.color?.toLowerCase() === 'blue' 
                      ? 'bg-blue-900/20 border-blue-500/50' 
                      : player.color?.toLowerCase() === 'red'
                      ? 'bg-red-900/20 border-red-500/50'
                      : 'bg-gray-900/50 border-gray-600'
                  }`}
                  data-testid={`player-advice-${index}`}
                >
                  <CardHeader>
                    <CardTitle 
                      className={`text-lg flex items-center ${
                        player.color?.toLowerCase() === 'blue' 
                          ? 'text-blue-300' 
                          : player.color?.toLowerCase() === 'red'
                          ? 'text-red-300'
                          : 'text-white'
                      }`}
                    >
                      <Target className="mr-2" size={18} />
                      {player.name} ({player.color})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tactical Advice */}
                    <div className="space-y-2">
                      <h4 className="text-yellow-400 font-semibold text-sm flex items-center">
                        <Target className="mr-1" size={14} />
                        TACTICAL
                      </h4>
                      {player.tactical_advice?.issues?.length > 0 && (
                        <div>
                          <p className="text-red-300 text-xs font-medium">Issues:</p>
                          <ul className="text-gray-300 text-sm space-y-1 ml-4">
                            {player.tactical_advice.issues.map((issue, i) => (
                              <li key={i} className="list-disc" data-testid={`tactical-issue-${index}-${i}`}>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {player.tactical_advice?.improvements?.length > 0 && (
                        <div>
                          <p className="text-green-300 text-xs font-medium">Improvements:</p>
                          <ul className="text-gray-300 text-sm space-y-1 ml-4">
                            {player.tactical_advice.improvements.map((improvement, i) => (
                              <li key={i} className="list-disc" data-testid={`tactical-improvement-${index}-${i}`}>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Technical Advice */}
                    <div className="space-y-2">
                      <h4 className="text-blue-400 font-semibold text-sm flex items-center">
                        <Brain className="mr-1" size={14} />
                        TECHNICAL
                      </h4>
                      {player.technical_advice?.issues?.length > 0 && (
                        <div>
                          <p className="text-red-300 text-xs font-medium">Issues:</p>
                          <ul className="text-gray-300 text-sm space-y-1 ml-4">
                            {player.technical_advice.issues.map((issue, i) => (
                              <li key={i} className="list-disc" data-testid={`technical-issue-${index}-${i}`}>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {player.technical_advice?.improvements?.length > 0 && (
                        <div>
                          <p className="text-green-300 text-xs font-medium">Improvements:</p>
                          <ul className="text-gray-300 text-sm space-y-1 ml-4">
                            {player.technical_advice.improvements.map((improvement, i) => (
                              <li key={i} className="list-disc" data-testid={`technical-improvement-${index}-${i}`}>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Mental Advice */}
                    <div className="space-y-2">
                      <h4 className="text-purple-400 font-semibold text-sm flex items-center">
                        <MessageSquare className="mr-1" size={14} />
                        MENTAL
                      </h4>
                      {player.mental_advice?.issues?.length > 0 && (
                        <div>
                          <p className="text-red-300 text-xs font-medium">Issues:</p>
                          <ul className="text-gray-300 text-sm space-y-1 ml-4">
                            {player.mental_advice.issues.map((issue, i) => (
                              <li key={i} className="list-disc" data-testid={`mental-issue-${index}-${i}`}>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {player.mental_advice?.improvements?.length > 0 && (
                        <div>
                          <p className="text-green-300 text-xs font-medium">Improvements:</p>
                          <ul className="text-gray-300 text-sm space-y-1 ml-4">
                            {player.mental_advice.improvements.map((improvement, i) => (
                              <li key={i} className="list-disc" data-testid={`mental-improvement-${index}-${i}`}>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}