import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Target, AlertTriangle, Calendar, Users } from "lucide-react";

interface VideoAnalysisResultsProps {
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

export function VideoAnalysisResults({ analysisData }: VideoAnalysisResultsProps) {
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  // Error boundary-like behavior for parsing errors
  useEffect(() => {
    setHasError(false);
  }, [analysisData]);

  // Parse analysis data and extract scoring/card events with cumulative tracking
  const parseAnalysisEvents = () => {
    const parseAnalysisData = (jsonString: string) => {
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (error) {
        // Silently handle parse errors - data will be treated as plain text
        return { content: jsonString };
      }
    };

    // Early return with empty data if analysisData is missing
    if (!analysisData) {
      // Analysis data is missing - return empty data structure
      return { scoreEvents: [], yellowCardEvents: [] };
    }

    const scoreAnalysis = analysisData.score_analysis ? parseAnalysisData(analysisData.score_analysis) : null;
    const yellowCardAnalysis = analysisData.yellow_card_analysis ? parseAnalysisData(analysisData.yellow_card_analysis) : null;
    const kickAnalysis = analysisData.kick_count_analysis ? parseAnalysisData(analysisData.kick_count_analysis) : null;

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

    // Extract scoring events and sort by timestamp for proper incremental tracking
    const allScoringEvents: Array<{
      timestamp: number;
      scoreValue: number;
      player: 'blue' | 'red';
    }> = [];

    if (scoreAnalysis && scoreAnalysis.players) {
      scoreAnalysis.players.forEach((player: any) => {
        const isBlue = player.color === 'Blue' || player.name?.includes('YANG');
        if (player.kicks) {
          player.kicks.forEach((kick: any) => {
            if (kick.timestamp && kick.score !== undefined) {
              const timestamp = parseTimestamp(kick.timestamp);
              const scoreValue = parseInt(kick.score) || 0;
              
              if (scoreValue > 0) { // Only include actual scoring events
                allScoringEvents.push({
                  timestamp,
                  scoreValue,
                  player: isBlue ? 'blue' : 'red'
                });
              }
            }
          });
        }
      });
    }

    // Sort all scoring events by timestamp to create proper incremental timeline
    allScoringEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Create cumulative score events in chronological order
    const scoreEvents: ScoreEvent[] = [];
    let cumulativeBlueScore = 0;
    let cumulativeRedScore = 0;

    allScoringEvents.forEach((event) => {
      if (event.player === 'blue') {
        cumulativeBlueScore += event.scoreValue;
      } else {
        cumulativeRedScore += event.scoreValue;
      }

      scoreEvents.push({
        timestamp: event.timestamp,
        blueScore: cumulativeBlueScore,
        redScore: cumulativeRedScore,
        increment: event.scoreValue,
        player: event.player
      });
    });

    // Extract yellow card events and sort by timestamp for proper incremental tracking
    const allCardEvents: Array<{
      timestamp: number;
      cardValue: number;
      player: 'blue' | 'red';
    }> = [];

    if (yellowCardAnalysis && yellowCardAnalysis.players) {
      yellowCardAnalysis.players.forEach((player: any) => {
        const isBlue = player.color === 'Blue' || player.name?.includes('YANG');
        if (player.Yellow_cards || player.yellow_cards) {
          const cards = player.Yellow_cards || player.yellow_cards;
          cards.forEach((card: any) => {
            if (card.timestamp && card.Amount !== undefined) {
              const timestamp = parseTimestamp(card.timestamp);
              const cardValue = parseInt(card.Amount) || 0;
              
              if (cardValue > 0) { // Only include actual card events
                allCardEvents.push({
                  timestamp,
                  cardValue,
                  player: isBlue ? 'blue' : 'red'
                });
              }
            }
          });
        }
      });
    }

    // Sort all card events by timestamp to create proper incremental timeline
    allCardEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Create cumulative card events in chronological order
    const yellowCardEvents: YellowCardEvent[] = [];
    let cumulativeBlueCards = 0;
    let cumulativeRedCards = 0;

    allCardEvents.forEach((event) => {
      if (event.player === 'blue') {
        cumulativeBlueCards += event.cardValue;
      } else {
        cumulativeRedCards += event.cardValue;
      }

      yellowCardEvents.push({
        timestamp: event.timestamp,
        blueCards: cumulativeBlueCards,
        redCards: cumulativeRedCards,
        player: event.player
      });
    });

    // Extract kick counts
    let blueKickCount = 0;
    let redKickCount = 0;

    if (kickAnalysis && kickAnalysis.players) {
      kickAnalysis.players.forEach((player: any) => {
        const isBlue = player.name === 'Player 1' || player.name?.includes('YANG');
        if (player.kicks && player.kicks[0]?.total_kick_number) {
          const count = parseInt(player.kicks[0].total_kick_number) || 0;
          if (isBlue) {
            blueKickCount = count;
          } else {
            redKickCount = count;
          }
        }
      });
    }

    return {
      scoreEvents: scoreEvents.sort((a, b) => a.timestamp - b.timestamp),
      yellowCardEvents: yellowCardEvents.sort((a, b) => a.timestamp - b.timestamp),
      finalScores: { blue: cumulativeBlueScore, red: cumulativeRedScore },
      finalCards: { blue: cumulativeBlueCards, red: cumulativeRedCards },
      kickCounts: { blue: blueKickCount, red: redKickCount },
    };
  };

  // Safely parse events with error handling
  let events;
  try {
    events = parseAnalysisEvents();
  } catch (error) {
    // Error parsing analysis - use default empty data
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing analysis events:', error);
    }
    setHasError(true);
    events = { 
      scoreEvents: [], 
      yellowCardEvents: [], 
      finalScores: { blue: 0, red: 0 },
      finalCards: { blue: 0, red: 0 },
      kickCounts: { blue: 0, red: 0 }
    };
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show error state if parsing failed
  if (hasError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="text-red-800 dark:text-red-200 font-medium">
            Error Loading Video Analysis
          </h3>
        </div>
        <p className="text-red-700 dark:text-red-300 mt-2">
          There was an issue parsing the video analysis data. Please try refreshing or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Round Info */}
      <div className="bg-athlete-gray-800 border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Video Analysis Results</h2>
            <p className="text-gray-300">Round {analysisData.roundAnalyzed || 1} Analysis</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Analyzed on</p>
            <p className="text-white">{new Date(analysisData.processedAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Match Analysis */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-athlete-accent">
            <Users className="h-5 w-5" />
            Match Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
            {analysisData.match_analysis || 'No match analysis available'}
          </div>
        </CardContent>
      </Card>

      {/* Score Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Trophy className="h-5 w-5" />
              Final Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <span className="text-blue-400 font-semibold">Blue Player</span>
                <Badge variant="secondary" className="bg-blue-500 text-white">
                  {events?.finalScores?.blue || 0} points
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <span className="text-red-400 font-semibold">Red Player</span>
                <Badge variant="secondary" className="bg-red-500 text-white">
                  {events?.finalScores?.red || 0} points
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Yellow Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <span className="text-blue-400 font-semibold">Blue Player</span>
                <Badge variant="secondary" className="bg-yellow-500 text-black">
                  {events?.finalCards?.blue || 0} cards
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <span className="text-red-400 font-semibold">Red Player</span>
                <Badge variant="secondary" className="bg-yellow-500 text-black">
                  {events?.finalCards?.red || 0} cards
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kick Counts */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-athlete-accent">
            <Target className="h-5 w-5" />
            Total Kick Counts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <span className="text-blue-400 font-semibold">Blue Player Kicks</span>
              <Badge variant="secondary" className="bg-blue-500 text-white">
                {events?.kickCounts?.blue || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="text-red-400 font-semibold">Red Player Kicks</span>
              <Badge variant="secondary" className="bg-red-500 text-white">
                {events?.kickCounts?.red || 0}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Timeline */}
      {events.scoreEvents.length > 0 && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-athlete-accent">
              <Clock className="h-5 w-5" />
              Score Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {events.scoreEvents.map((event, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    event.player === 'blue'
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  } cursor-pointer hover:opacity-80`}
                  onClick={() => setSelectedTimestamp(event.timestamp)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {formatTime(event.timestamp)}
                    </Badge>
                    <span className={event.player === 'blue' ? 'text-blue-400' : 'text-red-400'}>
                      {event.player === 'blue' ? 'Blue' : 'Red'} +{event.increment}
                    </span>
                  </div>
                  <div className="text-white font-mono">
                    {event.blueScore} - {event.redScore}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yellow Card Timeline */}
      {events.yellowCardEvents.length > 0 && (
        <Card className="bg-athlete-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              Yellow Card Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {events.yellowCardEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedTimestamp(event.timestamp)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {formatTime(event.timestamp)}
                    </Badge>
                    <span className={event.player === 'blue' ? 'text-blue-400' : 'text-red-400'}>
                      {event.player === 'blue' ? 'Blue' : 'Red'} Card
                    </span>
                  </div>
                  <div className="text-white font-mono">
                    Cards: {event.blueCards} - {event.redCards}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}