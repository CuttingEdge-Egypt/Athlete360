import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Target, AlertTriangle, Calendar, Users, Brain, MessageSquare, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

// Import the PlayerAdviceSection from VideoPlayerAnalysis
import { PlayerAdviceSection } from "@/components/ui/video-player-analysis";

interface VideoAnalysisResultsProps {
  analysisData: any;
  sport?: string;
}

// Sport configuration mapping for results display
const SPORT_DISPLAY_CONFIGS = {
  'taekwondo': { 
    action: 'Kicks', 
    violation: 'Yellow Cards', 
    primaryAction: 'kicks',
    secondaryAction: 'punches'
  },
  'boxing': { 
    action: 'Punches', 
    violation: 'Warnings', 
    primaryAction: 'punches',
    secondaryAction: 'combinations'
  },
  'soccer': { 
    action: 'Shots', 
    violation: 'Cards', 
    primaryAction: 'shots',
    secondaryAction: 'passes'
  },
  'basketball': { 
    action: 'Shots', 
    violation: 'Fouls', 
    primaryAction: 'shots',
    secondaryAction: 'rebounds'
  },
  'tennis': { 
    action: 'Shots', 
    violation: 'Violations', 
    primaryAction: 'shots',
    secondaryAction: 'serves'
  },
  'martial_arts': { 
    action: 'Strikes', 
    violation: 'Penalties', 
    primaryAction: 'strikes',
    secondaryAction: 'blocks'
  }
} as const;

interface ScoreEvent {
  timestamp: number;
  blueScore: number;
  redScore: number;
  increment: number;
  player: 'blue' | 'red';
  playerName?: string;
  description?: string;
  teamName?: string;
}

interface YellowCardEvent {
  timestamp: number;
  blueCards: number;
  redCards: number;
  player: 'blue' | 'red';
}

export function VideoAnalysisResults({ analysisData, sport = 'taekwondo' }: VideoAnalysisResultsProps) {
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const { t, i18n } = useTranslation('common');
  const { direction, isRTL } = useLanguage();
  const isArabic = i18n.language === 'ar';
  
  // Check if this is a clip analysis
  if (analysisData?.analysisType === 'clip') {
    // Format the analysis text for better readability with proper markdown rendering
    const formatAnalysisText = (text: string) => {
      const lines = text.split('\n');
      const elements: JSX.Element[] = [];
      let currentParagraph: string[] = [];
      let listItems: string[] = [];
      let inList = false;
      
      const flushParagraph = (index: number) => {
        if (currentParagraph.length > 0) {
          const paragraphText = currentParagraph.join(' ');
          elements.push(
            <p key={`p-${index}`} className="text-foreground mb-4 leading-relaxed">
              {renderInlineFormatting(paragraphText)}
            </p>
          );
          currentParagraph = [];
        }
      };
      
      const flushList = (index: number) => {
        if (listItems.length > 0) {
          elements.push(
            <ul key={`ul-${index}`} className="list-disc list-inside mb-4 space-y-2 text-foreground">
              {listItems.map((item, i) => (
                <li key={i} className="ml-4">{renderInlineFormatting(item)}</li>
              ))}
            </ul>
          );
          listItems = [];
          inList = false;
        }
      };
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) {
          flushParagraph(index);
          flushList(index);
          return;
        }
        
        // Handle markdown headers (### or ##)
        if (trimmedLine.startsWith('###')) {
          flushParagraph(index);
          flushList(index);
          elements.push(
            <h3 key={`h3-${index}`} className="text-white font-bold text-xl mb-3 mt-6">
              {trimmedLine.replace(/^###\s*/, '').replace(/\*\*/g, '')}
            </h3>
          );
          return;
        }
        
        if (trimmedLine.startsWith('##')) {
          flushParagraph(index);
          flushList(index);
          elements.push(
            <h2 key={`h2-${index}`} className="text-white font-bold text-2xl mb-4 mt-8">
              {trimmedLine.replace(/^##\s*/, '').replace(/\*\*/g, '')}
            </h2>
          );
          return;
        }
        
        // Handle bullet points
        if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
          flushParagraph(index);
          inList = true;
          listItems.push(trimmedLine.replace(/^[*-]\s*/, ''));
          return;
        }
        
        // Handle numbered lists
        if (/^\d+\.\s/.test(trimmedLine)) {
          flushParagraph(index);
          if (!inList) {
            flushList(index);
            inList = true;
          }
          listItems.push(trimmedLine.replace(/^\d+\.\s*/, ''));
          return;
        }
        
        // Handle horizontal rules
        if (trimmedLine === '---') {
          flushParagraph(index);
          flushList(index);
          elements.push(<hr key={`hr-${index}`} className="my-6 border-slate-200" />);
          return;
        }
        
        // Regular text - accumulate into paragraph
        if (!inList) {
          currentParagraph.push(trimmedLine);
        }
      });
      
      // Flush any remaining content
      flushParagraph(lines.length);
      flushList(lines.length);
      
      return elements;
    };
    
    // Render inline formatting (bold text)
    const renderInlineFormatting = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="text-white font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };
    
    // Render clip analysis view
    return (
      <div className="space-y-6">
        {/* User Request Card */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="text-indigo-400" size={20} />
              Your Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-100 p-4 rounded-lg">
              <p className="text-foreground italic">"{analysisData.userRequest}"</p>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy size={14} />
                  {analysisData.sport}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  {analysisData.language === 'arabic' ? 'العربية' : 'English'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="text-indigo-400" size={20} />
              AI Analysis & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <div className={`space-y-2 ${analysisData.language === 'arabic' ? 'text-right' : ''}`}>
                {formatAnalysisText(analysisData.analysis)}
              </div>
            </div>
            
            {/* Analysis Metadata */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span>{t('analysis.videoAnalysis.analyzedOn', 'Analyzed on')} {new Date(analysisData.processedAt).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get sport-specific display configuration for match analysis
  const sportConfig = SPORT_DISPLAY_CONFIGS[sport as keyof typeof SPORT_DISPLAY_CONFIGS] || SPORT_DISPLAY_CONFIGS.taekwondo;
  
  // Check if this is a Taekwondo match (to show kicks/yellow cards)
  const isTaekwondo = sport?.toLowerCase() === 'taekwondo';

  // Function to render markdown-style formatted text
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={index} className="text-white font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </>
    );
  };
  const [hasError, setHasError] = useState(false);

  // Error boundary-like behavior for parsing errors
  useEffect(() => {
    setHasError(false);
  }, [analysisData]);

  // Parse tennis score timeline for individual sports
  const getTennisScoreTimeline = () => {
    if (isTaekwondo || !analysisData.score_analysis) return null;
    
    try {
      const scoreData = typeof analysisData.score_analysis === 'string' 
        ? JSON.parse(analysisData.score_analysis) 
        : analysisData.score_analysis;
      
      // ONLY for individual sports (entity_type: "player"), NOT team sports (entity_type: "team")
      if (scoreData?.separate_scores && Array.isArray(scoreData.separate_scores)) {
        // Check if this is a team sport by looking at entity_type
        const isTeamSport = scoreData.separate_scores.some((entity: any) => entity.entity_type === 'team');
        if (isTeamSport) {
          return null; // Don't use tennis timeline for team sports
        }
        
        const allEvents: any[] = [];
        
        scoreData.separate_scores.forEach((player: any) => {
          if (player.events && Array.isArray(player.events)) {
            player.events.forEach((event: any) => {
              if (event.timestamp && event.current_score) {
                const [min, sec] = event.timestamp.split(':').map(Number);
                const timestamp = min * 60 + sec;
                
                allEvents.push({
                  timestamp,
                  playerName: player.entity_name,
                  description: event.description,
                  score: event.current_score
                });
              }
            });
          }
        });
        
        allEvents.sort((a, b) => a.timestamp - b.timestamp);
        
        if (allEvents.length > 0) {
          const playerNames = Array.from(new Set(scoreData.separate_scores.map((p: any) => p.entity_name)));
          return { events: allEvents, playerNames };
        }
      }
    } catch (error) {
      console.error('Error parsing tennis score analysis:', error);
    }
    return null;
  };
  
  const tennisScoreData = getTennisScoreTimeline();

  // Parse analysis data and extract scoring/card events with cumulative tracking
  const parseAnalysisEvents = () => {
    const parseAnalysisData = (jsonString: string) => {
      try {
        // If it's already parsed, return as-is
        if (typeof jsonString !== 'string') {
          return jsonString;
        }
        
        // Check if it's a markdown-wrapped JSON string
        if (jsonString.includes('```json') || jsonString.includes('```')) {
          // Extract JSON from markdown code blocks
          let content = jsonString;
          if (content.startsWith('```json') && content.endsWith('```')) {
            content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (content.startsWith('```') && content.endsWith('```')) {
            content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          // Try to parse the extracted content as JSON
          return JSON.parse(content.trim());
        }
        
        // First try to parse as direct JSON
        try {
          return JSON.parse(jsonString);
        } catch (directParseError) {
          // If direct parse fails, check if it's wrapped in a content field object
          try {
            const contentWrapper = JSON.parse(jsonString);
            if (contentWrapper.content) {
              // Extract JSON from markdown code blocks in content
              let content = contentWrapper.content;
              if (content.startsWith('```json') && content.endsWith('```')) {
                content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
              } else if (content.startsWith('```') && content.endsWith('```')) {
                content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
              }
              return JSON.parse(content.trim());
            }
            return contentWrapper;
          } catch (wrapperParseError) {
            // If all parsing fails, return the original string wrapped in content
            return { content: jsonString };
          }
        }
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
      playerName?: string;
      description?: string;
      teamName?: string;
    }> = [];

    // TEAM SPORTS: Handle separate_scores format (entity_type: "team")
    if (scoreAnalysis && scoreAnalysis.separate_scores && Array.isArray(scoreAnalysis.separate_scores)) {
      console.log('🏆 Processing separate_scores:', scoreAnalysis.separate_scores);
      scoreAnalysis.separate_scores.forEach((entity: any, entityIndex: number) => {
        // First entity = blue, second entity = red
        const isBlue = entityIndex === 0;
        const teamName = entity.entity_name || undefined;
        console.log(`🏆 Team ${entityIndex} (${teamName}):`, entity.events?.length || 0, 'events');
        
        if (entity.events && Array.isArray(entity.events)) {
          let previousScore = 0;
          entity.events.forEach((event: any) => {
            console.log('🏆 Event:', event);
            if (event.timestamp && event.current_score !== undefined) {
              const timestamp = parseTimestamp(event.timestamp);
              const currentScore = parseInt(event.current_score) || 0;
              const scoreValue = currentScore - previousScore;
              
              if (scoreValue > 0) {
                const scoringEvent = {
                  timestamp,
                  scoreValue,
                  player: (isBlue ? 'blue' : 'red') as 'blue' | 'red',
                  playerName: event.player_name || undefined,
                  description: event.description || undefined,
                  teamName: teamName
                };
                console.log('🏆 Adding scoring event:', scoringEvent);
                allScoringEvents.push(scoringEvent);
              }
              previousScore = currentScore;
            }
          });
        }
      });
      console.log('🏆 All scoring events:', allScoringEvents);
    }
    // INDIVIDUAL SPORTS: Handle players format (entity_type: "player" or old format)
    else if (scoreAnalysis && scoreAnalysis.players) {
      scoreAnalysis.players.forEach((player: any) => {
        // Determine player side from color, side, or name
        const isBlue = player.color === 'Blue' || 
                       player.side === 'blue' || 
                       player.name?.toLowerCase().includes('blue') || 
                       player.name?.includes('YANG');
        
        // NEW FORMAT: player.events[] with current_score
        if (player.events && Array.isArray(player.events)) {
          let previousScore = 0;
          player.events.forEach((event: any) => {
            if (event.timestamp && event.current_score !== undefined) {
              const timestamp = parseTimestamp(event.timestamp);
              const currentScore = parseInt(event.current_score) || 0;
              const scoreValue = currentScore - previousScore;
              
              if (scoreValue > 0) { // Only include actual scoring events
                allScoringEvents.push({
                  timestamp,
                  scoreValue,
                  player: isBlue ? 'blue' : 'red'
                });
              }
              previousScore = currentScore;
            }
          });
        }
        // OLD FORMAT: player.kicks[] with score (for backward compatibility)
        else if (player.kicks) {
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

      const scoreEvent = {
        timestamp: event.timestamp,
        blueScore: cumulativeBlueScore,
        redScore: cumulativeRedScore,
        increment: event.scoreValue,
        player: event.player,
        playerName: event.playerName,
        description: event.description,
        teamName: event.teamName
      };
      console.log('📊 Creating scoreEvent:', scoreEvent);
      scoreEvents.push(scoreEvent);
    });
    console.log('📊 Final scoreEvents array:', scoreEvents);
    
    // For new format with current_score, also extract final scores directly from last events
    if (scoreAnalysis && scoreAnalysis.separate_scores && Array.isArray(scoreAnalysis.separate_scores)) {
      // TEAM SPORTS: Extract final scores from separate_scores
      scoreAnalysis.separate_scores.forEach((entity: any, entityIndex: number) => {
        if (entity.events && Array.isArray(entity.events) && entity.events.length > 0) {
          const isBlue = entityIndex === 0;
          const lastEvent = entity.events[entity.events.length - 1];
          if (lastEvent && lastEvent.current_score !== undefined) {
            const finalScore = parseInt(lastEvent.current_score) || 0;
            if (isBlue) {
              cumulativeBlueScore = Math.max(cumulativeBlueScore, finalScore);
            } else {
              cumulativeRedScore = Math.max(cumulativeRedScore, finalScore);
            }
          }
        }
      });
    } else if (scoreAnalysis && scoreAnalysis.players) {
      // INDIVIDUAL SPORTS: Extract final scores from players
      scoreAnalysis.players.forEach((player: any) => {
        if (player.events && Array.isArray(player.events) && player.events.length > 0) {
          const isBlue = player.color === 'Blue' || 
                         player.side === 'blue' || 
                         player.name?.toLowerCase().includes('blue') || 
                         player.name?.includes('YANG');
          
          // Get the final score from the last event
          const lastEvent = player.events[player.events.length - 1];
          if (lastEvent && lastEvent.current_score !== undefined) {
            const finalScore = parseInt(lastEvent.current_score) || 0;
            if (isBlue) {
              cumulativeBlueScore = Math.max(cumulativeBlueScore, finalScore);
            } else {
              cumulativeRedScore = Math.max(cumulativeRedScore, finalScore);
            }
          }
        }
      });
    }

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
        // Determine player side from name
        const isBlue = player.name === 'Player 1' || 
                       player.name?.toLowerCase().includes('blue') || 
                       player.name?.includes('YANG');
        
        if (player.kicks && player.kicks[0]) {
          // Try new format first (total_kicks_number with 's')
          const count = parseInt(player.kicks[0].total_kicks_number || player.kicks[0].total_kick_number) || 0;
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
      <div className="bg-slate-50 border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('analysis.videoAnalysis.videoAnalysisResults', 'Video Analysis Results')}</h2>
            <p className="text-gray-600">{t('analysis.videoAnalysis.round', 'Round')} {analysisData.roundAnalyzed || 1} {t('analysis.videoAnalysis.analysis', 'Analysis')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('analysis.videoAnalysis.analyzedOn', 'Analyzed on')}</p>
            <p className="text-white">{new Date(analysisData.processedAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Match Analysis */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-athlete-accent">
            <Users className="h-5 w-5" />
            {t('analysis.videoAnalysis.matchAnalysis', 'Match Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">
            {renderFormattedText(analysisData.match_analysis) || 'No match analysis available'}
          </div>
        </CardContent>
      </Card>

      {/* Score Summary - Only show for Taekwondo */}
      {isTaekwondo && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-50 border-slate-200">
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

          <Card className="bg-slate-50 border-slate-200">
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
      )}

      {/* Kick Counts - Only show for Taekwondo */}
      {isTaekwondo && (
        <Card className="bg-slate-50 border-slate-200">
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
      )}
      
      {/* Tennis Score Timeline - Show tennis scores when available */}
      {tennisScoreData && (
        <Card className="bg-slate-50 border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-athlete-accent">
              <Trophy className="h-5 w-5" />
              {t('analysis.videoAnalysis.scoreTimeline', 'Score Timeline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {tennisScoreData.events.map((event, index) => {
                const playerIndex = tennisScoreData.playerNames.indexOf(event.playerName);
                const isFirstPlayer = playerIndex === 0;
                
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isFirstPlayer
                        ? 'bg-blue-500/10 border-blue-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    } cursor-pointer hover:opacity-80`}
                    onClick={() => setSelectedTimestamp(event.timestamp)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs text-center">
                        {formatTime(event.timestamp)}
                      </Badge>
                      <span className={`font-medium ${isFirstPlayer ? 'text-blue-400' : 'text-red-400'}`}>
                        {event.playerName}
                      </span>
                      {event.description && (
                        <span className="text-muted-foreground text-sm">{event.description}</span>
                      )}
                    </div>
                    <div className="text-white font-mono text-lg">
                      {event.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dynamic Metrics - Show for non-Taekwondo sports */}
      {!isTaekwondo && analysisData.dynamic_metrics && analysisData.dynamic_metrics.length > 0 && (
        <div className="space-y-6">
          {(() => {
            // Get unique player names from the first metric to ensure consistent coloring
            const firstMetric = analysisData.dynamic_metrics[0];
            const playerNames = firstMetric?.data?.players?.map((p: any) => p.name) || [];
            
            return analysisData.dynamic_metrics.map((metric: any, index: number) => {
              // Check if this is a Score metric
              const isScore = metric.title.toLowerCase().includes('scor');
              
              // Parse standardized format: { players: [{ name, total, events }] }
              const players = metric.data?.players || [];
              
              if (players.length === 0) {
                return null;
              }
              
              return (
                <Card key={index} className="bg-slate-50 border-slate-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-athlete-accent">
                      {isScore ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                      {metric.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {players.map((player: any) => {
                        const total = player.total || 0;
                        const playerName = player.name || 'Player';
                        
                        // Determine styling based on consistent player name mapping
                        const playerIndex = playerNames.indexOf(playerName);
                        const isFirstPlayer = playerIndex === 0 || (playerIndex === -1 && players.indexOf(player) === 0);
                        
                        return (
                          <div 
                            key={playerName}
                            className={`flex flex-col gap-2 p-3 rounded-lg border ${
                              isFirstPlayer
                                ? 'bg-blue-500/10 border-blue-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                            }`}
                          >
                            <span className={`font-semibold ${isFirstPlayer ? 'text-blue-400' : 'text-red-400'}`}>
                              {playerName}
                            </span>
                            <Badge variant="secondary" className={`w-fit ${isFirstPlayer ? 'bg-blue-500' : 'bg-red-500'} text-white`}>
                              {total}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  
                  {/* Show events timeline if available */}
                  {players.some((p: any) => p.events && p.events.length > 0) && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                        {isScore ? 'Scoring Timeline' : 'Event Timeline'}
                      </h4>
                      {players.map((player: any) => 
                        player.events?.map((event: any, eventIndex: number) => {
                          const playerName = player.name || 'Player';
                          // Use consistent player color mapping
                          const playerColorIndex = playerNames.indexOf(playerName);
                          const isFirstPlayer = playerColorIndex === 0 || (playerColorIndex === -1 && players.indexOf(player) === 0);
                          
                          return (
                            <div
                              key={`${playerName}-${eventIndex}`}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:opacity-80 ${
                                isFirstPlayer
                                  ? 'bg-blue-500/10 border-blue-500/20'
                                  : 'bg-red-500/10 border-red-500/20'
                              }`}
                              onClick={() => {
                                // Parse timestamp to seconds for video jumping
                                if (event.timestamp) {
                                  const [min, sec] = event.timestamp.split(':').map(Number);
                                  setSelectedTimestamp(min * 60 + sec);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-center">
                                  {event.timestamp}
                                </Badge>
                                <span className={`text-sm ${isFirstPlayer ? 'text-blue-400' : 'text-red-400'}`}>
                                  {playerName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {event.value && (
                                  <Badge variant="secondary" className="text-xs bg-green-600 text-center">
                                    +{event.value}
                                  </Badge>
                                )}
                                {event.description && (
                                  <span className="text-muted-foreground text-sm">{event.description}</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ).flat()}
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            });
          })()}
        </div>
      )}

      {/* Score Timeline - Only show for non-tennis sports (tennis has its own timeline above) */}
      {events.scoreEvents.length > 0 && !tennisScoreData && (() => {
        console.log('⭐ RENDERING SCORE TIMELINE - Total events:', events.scoreEvents.length);
        console.log('⭐ First event full object:', JSON.stringify(events.scoreEvents[0], null, 2));
        return (
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-athlete-accent">
              <Clock className="h-5 w-5" />
              {t('analysis.videoAnalysis.scoreTimeline', 'Score Timeline')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {events.scoreEvents.map((event, index) => {
                console.log('🎯 Rendering score event #' + index + ':', event);
                // Build display text: Team - Player or just Player/Blue/Red
                let displayText = '';
                if (event.teamName && event.playerName) {
                  displayText = `${event.teamName} - ${event.playerName}`;
                  console.log('🎯 Display text (team + player):', displayText);
                } else if (event.teamName) {
                  displayText = event.teamName;
                  console.log('🎯 Display text (team only):', displayText);
                } else if (event.playerName) {
                  displayText = event.playerName;
                  console.log('🎯 Display text (player only):', displayText);
                } else {
                  displayText = event.player === 'blue' ? 'Blue' : 'Red';
                  console.log('🎯 Display text (fallback):', displayText);
                }
                
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      event.player === 'blue'
                        ? 'bg-blue-500/10 border-blue-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    } cursor-pointer hover:opacity-80`}
                    onClick={() => setSelectedTimestamp(event.timestamp)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="text-xs text-center shrink-0">
                        {formatTime(event.timestamp)}
                      </Badge>
                      <div className="flex items-center gap-2 flex-1">
                        <span className={`font-medium ${event.player === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                          {displayText}
                        </span>
                        {event.description && (
                          <span className="text-xs text-muted-foreground">· {event.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-white font-mono shrink-0">
                      {event.blueScore} - {event.redScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        );
      })()}

      {/* Yellow Card Timeline */}
      {events.yellowCardEvents.length > 0 && (
        <Card className="bg-slate-50 border-slate-200">
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
                    <Badge variant="outline" className="text-xs text-center">
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

      {/* Player Advice Section */}
      <PlayerAdviceSection 
        adviceData={analysisData.advice_analysis}
        language={analysisData.language === 'ar' ? 'arabic' : 'english'} 
      />
    </div>
  );
}