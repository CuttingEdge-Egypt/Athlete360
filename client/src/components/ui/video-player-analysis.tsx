import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Volume2, Trophy, Brain, Target, MessageSquare } from "lucide-react";
import { Flag } from "@/components/ui/flag";

interface VideoPlayerAnalysisProps {
  videoFile: File;
  analysisData: any;
  language?: string;
  sport?: string;
}

interface ScoreEvent {
  timestamp: number;
  blueScore: number;
  redScore: number;
  increment: number;
  player: 'blue' | 'red';
  scoreString?: string; // Tennis score string like "15-30" or "40-Ad"
}

interface YellowCardEvent {
  timestamp: number;
  blueCards: number;
  redCards: number;
  player: 'blue' | 'red';
}

export function VideoPlayerAnalysis({ videoFile, analysisData, language = 'english', sport = 'taekwondo' }: VideoPlayerAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoUrl, setVideoUrl] = useState<string>("");

  // Sport-specific display configurations
  const SPORT_DISPLAY_CONFIGS = {
    'taekwondo': { 
      action: 'TOTAL KICKS', 
      violation: 'WARNINGS',
      actionArabic: 'إجمالي الركلات',
      violationArabic: 'إنذارات'
    },
    'boxing': { 
      action: 'TOTAL PUNCHES', 
      violation: 'WARNINGS',
      actionArabic: 'إجمالي اللكمات',
      violationArabic: 'إنذارات'
    },
    'soccer': { 
      action: 'TOTAL SHOTS', 
      violation: 'CARDS',
      actionArabic: 'إجمالي التسديدات',
      violationArabic: 'البطاقات'
    },
    'basketball': { 
      action: 'TOTAL SHOTS', 
      violation: 'FOULS',
      actionArabic: 'إجمالي التسديدات', 
      violationArabic: 'الأخطاء'
    },
    'tennis': { 
      action: 'TOTAL SHOTS', 
      violation: 'VIOLATIONS',
      actionArabic: 'إجمالي الضربات',
      violationArabic: 'المخالفات'
    },
    'martial_arts': { 
      action: 'TOTAL STRIKES', 
      violation: 'PENALTIES',
      actionArabic: 'إجمالي الضربات',
      violationArabic: 'العقوبات'
    }
  } as const;

  // Get sport-specific config
  const sportConfig = SPORT_DISPLAY_CONFIGS[sport as keyof typeof SPORT_DISPLAY_CONFIGS] || SPORT_DISPLAY_CONFIGS.taekwondo;

  // Shared parsing function for analysis data (handles markdown, JSON, and wrapper formats)
  const parseAnalysisData = (jsonString: string) => {
    try {
      // If it's already parsed, return as-is
      if (typeof jsonString !== 'string') {
        return jsonString;
      }
      
      // Check if it's a markdown-wrapped JSON string
      if (jsonString.includes('```json') || jsonString.includes('```')) {
        // Extract JSON from markdown code blocks - handle all cases
        let content = jsonString.trim();
        
        // Remove opening markers
        if (content.startsWith('```json')) {
          content = content.replace(/^```json\s*/, '');
        } else if (content.startsWith('```')) {
          content = content.replace(/^```\s*/, '');
        }
        
        // Remove closing markers
        if (content.endsWith('```')) {
          content = content.replace(/\s*```$/, '');
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
            let content = contentWrapper.content.trim();
            
            // Remove opening markers
            if (content.startsWith('```json')) {
              content = content.replace(/^```json\s*/, '');
            } else if (content.startsWith('```')) {
              content = content.replace(/^```\s*/, '');
            }
            
            // Remove closing markers
            if (content.endsWith('```')) {
              content = content.replace(/\s*```$/, '');
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

  // Translation function for all UI titles  
  const getTitle = (key: string): string => {
    if (language === 'arabic') {
      const arabicTitles: Record<string, string> = {
        // Data box titles
        'BLUE SCORE': 'النقاط الزرقاء',
        'RED SCORE': 'النقاط الحمراء', 
        [sportConfig.action]: sportConfig.actionArabic,
        [sportConfig.violation]: sportConfig.violationArabic,
        // Section titles
        'Complete Match Analysis': 'تحليل المباراة الكامل',
        'Advice for Each Player': 'نصائح لكل لاعب',
        'General Observations': 'ملاحظات عامة',
        'TACTICAL': 'تكتيكي'
      };
      return arabicTitles[key] || key;
    }
    return key;
  };

  // Parse analysis data and extract scoring/card events with cumulative tracking
  const parseAnalysisEvents = () => {
    const scoreAnalysis = analysisData.score_analysis ? parseAnalysisData(analysisData.score_analysis) : null;
    
    // Smart analysis field detection - let AI response structure determine the field names
    const findAnalysisFields = () => {
      const fields: { 
        violationField: string | null, 
        actionField: string | null, 
        violationAnalysis: any | null, 
        actionAnalysis: any | null 
      } = { violationField: null, actionField: null, violationAnalysis: null, actionAnalysis: null };
      
      // Look for violation-related fields (cards, warnings, fouls, penalties, violations)
      const violationPatterns = ['yellow_card_analysis', 'card_analysis', 'warning_analysis', 'foul_analysis', 'penalty_analysis', 'violation_analysis'];
      for (const pattern of violationPatterns) {
        if (analysisData[pattern]) {
          fields.violationField = pattern;
          fields.violationAnalysis = parseAnalysisData(analysisData[pattern]);
          break;
        }
      }
      
      // Look for action-related fields (kicks, punches, shots, strikes)
      const actionPatterns = ['kick_count_analysis', 'punch_count_analysis', 'shot_count_analysis', 'strike_count_analysis'];
      for (const pattern of actionPatterns) {
        if (analysisData[pattern]) {
          fields.actionField = pattern;
          fields.actionAnalysis = parseAnalysisData(analysisData[pattern]);
          break;
        }
      }
      
      return fields;
    };
    
    const { violationField, actionField, violationAnalysis, actionAnalysis } = findAnalysisFields();

    // Debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      console.log("=== VIDEO ANALYSIS DEBUG ===");
      console.log("Score Analysis Before Parsing:", analysisData.score_analysis);
      console.log("Score Analysis After Parsing:", scoreAnalysis);
      console.log(`${sportConfig.violation} Analysis:`, violationAnalysis);
      console.log(`${sportConfig.action.split(' ')[1]} Analysis:`, actionAnalysis);
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
        let separateScores = null;
        let scoreType = null;
        
        // Check if this is the new separate scores format
        if (scoreAnalysis.separate_scores && Array.isArray(scoreAnalysis.separate_scores)) {
          separateScores = scoreAnalysis.separate_scores;
          scoreType = scoreAnalysis.score_type; // 'team' or 'individual'
        }
        
        // Handle separate scores format (new dual-generation approach)
        if (separateScores && separateScores.length >= 2) {
          const entity1 = separateScores[0];
          const entity2 = separateScores[1];
          
          // Process all events from both entities
          const allEvents: Array<{timestamp: number, score: string, player: 'blue' | 'red'}> = [];
          
          // Process entity 1 events (assign based on "side" field if available, else blue)
          if (entity1.events && Array.isArray(entity1.events)) {
            const entity1Side = entity1.side === 'red' ? 'red' : 'blue';
            entity1.events.forEach((event: any) => {
              if (event.timestamp && event.current_score) {
                allEvents.push({
                  timestamp: parseTimestamp(event.timestamp),
                  score: event.current_score,
                  player: entity1Side
                });
              }
            });
          }
          
          // Process entity 2 events (assign based on "side" field if available, else red)
          if (entity2.events && Array.isArray(entity2.events)) {
            const entity2Side = entity2.side === 'red' ? 'red' : 'blue';
            entity2.events.forEach((event: any) => {
              if (event.timestamp && event.current_score) {
                allEvents.push({
                  timestamp: parseTimestamp(event.timestamp),
                  score: event.current_score,
                  player: entity2Side
                });
              }
            });
          }
          
          // Sort events by timestamp
          allEvents.sort((a, b) => a.timestamp - b.timestamp);
          
          // Determine score format from first event (check for tennis notation)
          const tennisScores = ['15', '30', '40', 'Adv', 'Deuce', 'Game'];
          const firstScore = allEvents.length > 0 ? allEvents[0].score : '';
          const isTennisFormat = tennisScores.includes(String(firstScore));
          
          // Process sorted events with proper cumulative score tracking
          allEvents.forEach(event => {
            if (isTennisFormat) {
              // Tennis string scores - store in scoreString field
              scoreEvents.push({
                timestamp: event.timestamp,
                blueScore: 0, // Not used for tennis display
                redScore: 0,  // Not used for tennis display
                increment: 1, // Always 1 for tennis points
                player: event.player,
                scoreString: event.score // Store the actual tennis score string
              });
            } else {
              // Numeric scores (fencing, basketball, soccer, etc.) - calculate cumulative scores
              const currentScore = parseInt(event.score);
              
              if (event.player === 'blue') {
                const increment = currentScore - blueScore;
                blueScore = currentScore;
                scoreEvents.push({
                  timestamp: event.timestamp,
                  blueScore,
                  redScore,
                  increment: increment > 0 ? increment : 1,
                  player: 'blue'
                });
              } else {
                const increment = currentScore - redScore;
                redScore = currentScore;
                scoreEvents.push({
                  timestamp: event.timestamp,
                  blueScore,
                  redScore,
                  increment: increment > 0 ? increment : 1,
                  player: 'red'
                });
              }
            }
          });
          
        } else {
          // Fallback to old format handling
          // Handle array-wrapped response format
          if (Array.isArray(scoreAnalysis) && scoreAnalysis[0]?.players) {
            playersArray = scoreAnalysis[0].players;
          } else if (scoreAnalysis.players) {
            playersArray = scoreAnalysis.players;
          }
        
          if (Array.isArray(playersArray)) {
            // Determine format: Old Taekwondo (color/kicks) or New generic (name/events)
          const isOldFormat = playersArray.some(p => p.color && p.kicks);
          const isNewFormat = playersArray.some(p => p.name && p.events);
          
          if (isNewFormat) {
            // NEW FORMAT: Generic score with player.name and player.events[].current_score
            // Check if this is team sport data (has team field)
            const hasTeamData = playersArray.some((p: any) => p.team !== undefined);
            
            // Collect all scoring events from all players
            const allEvents: Array<{timestamp: number, score: string, player: 'blue' | 'red'}> = [];
            
            if (hasTeamData) {
              // Group players by team for team sports
              const teamGroups = new Map<string, any[]>();
              playersArray.forEach((player: any) => {
                const teamName = player.team || 'Unknown';
                if (!teamGroups.has(teamName)) {
                  teamGroups.set(teamName, []);
                }
                teamGroups.get(teamName)?.push(player);
              });
              
              // Assign teams to colors (first team = blue, second = red)
              const teams = Array.from(teamGroups.keys());
              const blueTeam = teams[0];
              const redTeam = teams[1] || teams[0];
              
              // Process all players from all teams
              playersArray.forEach((player: any) => {
                const playerTeam = player.team || 'Unknown';
                const playerColor = playerTeam === blueTeam ? 'blue' : 'red';
                
                if (player.events && Array.isArray(player.events)) {
                  player.events.forEach((event: any) => {
                    if (event.timestamp && event.current_score) {
                      allEvents.push({
                        timestamp: parseTimestamp(event.timestamp),
                        score: event.current_score,
                        player: playerColor as 'blue' | 'red'
                      });
                    }
                  });
                }
              });
            } else {
              // Individual sports - use "side" field if available, otherwise use index
              playersArray.forEach((player: any, index: number) => {
                // Determine player color from "side" field or fallback to index
                const playerColor = player.side === 'blue' || player.side === 'red' 
                  ? player.side 
                  : (index === 0 ? 'blue' : 'red');
                
                if (player.events && Array.isArray(player.events)) {
                  player.events.forEach((event: any) => {
                    if (event.timestamp && event.current_score) {
                      allEvents.push({
                        timestamp: parseTimestamp(event.timestamp),
                        score: event.current_score,
                        player: playerColor as 'blue' | 'red'
                      });
                    }
                  });
                }
              });
            }
            
            // Sort by timestamp
            allEvents.sort((a, b) => a.timestamp - b.timestamp);
            
            // Determine score format from first event (check for tennis notation)
            const tennisScores = ['15', '30', '40', 'Adv', 'Deuce', 'Game'];
            const firstScore = allEvents.length > 0 ? allEvents[0].score : '';
            const isTennisFormat = tennisScores.includes(String(firstScore));
            
            // Process events - current_score now contains ONLY that entity's score
            allEvents.forEach((event) => {
              if (isTennisFormat) {
                // Tennis string scores - store in scoreString field
                if (event.player === 'blue') {
                  scoreEvents.push({
                    timestamp: event.timestamp,
                    blueScore: 0,
                    redScore: 0,
                    increment: 1,
                    player: 'blue',
                    scoreString: event.score
                  });
                } else {
                  scoreEvents.push({
                    timestamp: event.timestamp,
                    blueScore: 0,
                    redScore: 0,
                    increment: 1,
                    player: 'red',
                    scoreString: event.score
                  });
                }
              } else {
                // Numeric scores (basketball, soccer, etc.) - parse as numbers
                const currentScore = parseInt(event.score);
                
                if (event.player === 'blue') {
                  const increment = currentScore - blueScore;
                  blueScore = currentScore;
                  scoreEvents.push({
                    timestamp: event.timestamp,
                    blueScore,
                    redScore,
                    increment: increment > 0 ? increment : 1,
                    player: 'blue'
                  });
                } else {
                  const increment = currentScore - redScore;
                  redScore = currentScore;
                  scoreEvents.push({
                    timestamp: event.timestamp,
                    blueScore,
                    redScore,
                    increment: increment > 0 ? increment : 1,
                    player: 'red'
                  });
                }
              }
            });
            
          } else if (isOldFormat) {
            // OLD FORMAT: Taekwondo with player.color and player.kicks[].score
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
        } // Close the if (Array.isArray(playersArray))
        } // Close the else for the separate scores fallback
      }
    }

    // Parse violation events (cards/warnings/fouls) with cumulative tracking
    if (violationAnalysis) {
      let blueCards = 0;
      let redCards = 0;

      // Handle both old format (string content) and new JSON format with color field
      if (typeof violationAnalysis === 'string') {
        // Old format - parse text content
        const lines = violationAnalysis.split('\n');
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
      } else if (violationAnalysis && Array.isArray(violationAnalysis.players)) {
        // New JSON format - use players array with color field
        // First, collect all violation events from both players and sort by timestamp
        const allCards: Array<{timestamp: number, color: string}> = [];
        
        violationAnalysis.players.forEach((player: any) => {
          if (player.color && Array.isArray(player.yellow_cards)) {
            const playerColor = player.color.toLowerCase();
            
            player.yellow_cards.forEach((card: any) => {
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
    if (actionAnalysis) {
      // First try new JSON format with players array
      if (Array.isArray(actionAnalysis.players)) {
        actionAnalysis.players.forEach((player: any) => {
          // Handle the actual kick count JSON structure
          if (player.kicks && Array.isArray(player.kicks) && player.kicks[0]?.total_kicks_number !== undefined) {
            const playerName = player.name?.toLowerCase() || '';
            const totalKicks = player.kicks[0].total_kicks_number;
            
            // Determine player color based on name - use same logic as other components
            const isBlue = player.name === 'Player 1' || player.name?.includes('YANG');
            if (isBlue) {
              blueKicks = totalKicks;
            } else {
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
        const content = typeof actionAnalysis === 'string' ? actionAnalysis : JSON.stringify(actionAnalysis);
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
  
  // Unified player/team data extraction for all sports
  const getScoreboardData = () => {
    let entity1Name = 'Player 1';
    let entity2Name = 'Player 2';
    let entity1Country = null;
    let entity2Country = null;
    let isTeamSport = false;
    let scoreFormat: 'numeric' | 'string' = 'numeric';
    
    // Try to extract from separate_scores first (individual sports & team sports)
    if (analysisData.score_analysis) {
      try {
        const scoreData = typeof analysisData.score_analysis === 'string' 
          ? JSON.parse(analysisData.score_analysis) 
          : analysisData.score_analysis;
        
        if (scoreData?.separate_scores && Array.isArray(scoreData.separate_scores) && scoreData.separate_scores.length >= 2) {
          const entity1 = scoreData.separate_scores[0];
          const entity2 = scoreData.separate_scores[1];
          
          entity1Name = entity1.entity_name || entity1Name;
          entity2Name = entity2.entity_name || entity2Name;
          entity1Country = entity1.country || null;
          entity2Country = entity2.country || null;
          isTeamSport = entity1.entity_type === 'team' || entity2.entity_type === 'team';
          
          // Check if scores are tennis notation strings or numbers
          if (entity1.events && entity1.events.length > 0) {
            const firstScore = entity1.events[0].current_score;
            // Tennis scores: "15", "30", "40", "Adv", "Deuce", "Game"
            const tennisScores = ['15', '30', '40', 'Adv', 'Deuce', 'Game'];
            scoreFormat = tennisScores.includes(String(firstScore)) ? 'string' : 'numeric';
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log("=== SCOREBOARD DATA (separate_scores) ===");
            console.log("Entity 1:", entity1Name, entity1Country);
            console.log("Entity 2:", entity2Name, entity2Country);
            console.log("Is Team Sport:", isTeamSport);
            console.log("Score Format:", scoreFormat);
          }
          
          return { entity1Name, entity2Name, entity1Country, entity2Country, isTeamSport, scoreFormat, isTaekwondo: false };
        }
      } catch (error) {
        console.error('Error parsing separate_scores:', error);
      }
    }
    
    // Fallback to Taekwondo format (score_analysis with players array)
    if (analysisData.score_analysis) {
      try {
        const scoreData = parseAnalysisData(analysisData.score_analysis);
        
        let playersArray = [];
        if (Array.isArray(scoreData) && scoreData[0]?.players) {
          playersArray = scoreData[0].players;
        } else if (scoreData.players) {
          playersArray = scoreData.players;
        }
        
        if (Array.isArray(playersArray) && playersArray.length >= 2) {
          playersArray.forEach((player: any) => {
            if (player.color && player.name) {
              const color = player.color.toLowerCase();
              if (color.includes('blue')) {
                entity1Name = player.name;
                entity1Country = player.country || null;
              } else if (color.includes('red')) {
                entity2Name = player.name;
                entity2Country = player.country || null;
              }
            }
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log("=== SCOREBOARD DATA (Taekwondo format) ===");
            console.log("Blue:", entity1Name, entity1Country);
            console.log("Red:", entity2Name, entity2Country);
          }
          
          return { entity1Name, entity2Name, entity1Country, entity2Country, isTeamSport, scoreFormat, isTaekwondo: true };
        }
      } catch (error) {
        console.error('Error parsing Taekwondo format:', error);
      }
    }
    
    // Fallback defaults
    return { entity1Name, entity2Name, entity1Country, entity2Country, isTeamSport, scoreFormat, isTaekwondo: false };
  };

  const { entity1Name, entity2Name, entity1Country, entity2Country, isTeamSport, scoreFormat, isTaekwondo } = getScoreboardData();
  
  // Parse dynamic metrics for non-taekwondo sports with standardized format
  const parseDynamicMetrics = () => {
    if (!analysisData.dynamic_metrics || !Array.isArray(analysisData.dynamic_metrics)) {
      return [];
    }
    
    return analysisData.dynamic_metrics.map((metric: any) => {
      const metricData = metric.data;
      const title = metric.title || 'Unknown Metric';
      const isScoreMetric = title.toLowerCase().includes('scor');
      
      const parseTimestamp = (timeStr: string): number => {
        const cleanTime = timeStr.toLowerCase().replace(/[^\d:]/g, '');
        if (cleanTime.includes(':')) {
          const [min, sec] = cleanTime.split(':').map(Number);
          return min * 60 + sec;
        } else {
          return parseInt(cleanTime) || 0;
        }
      };
      
      // Parse standardized format: { players: [{ name, team?, country?, events: [{ timestamp, description, current_score? }] }] }
      const players: Array<{
        name: string,
        team?: string, // Team name for team sports
        country?: string,
        total: number | string, // Can be number for counts or string for scores like "6-1"
        events: Array<{ timestamp: number, description: string, value: number, currentScore?: string }>
      }> = [];
      
      if (metricData && Array.isArray(metricData.players)) {
        metricData.players.forEach((player: any) => {
          const playerName = player.name || 'Unknown Player';
          const playerTeam = player.team || undefined;
          const playerCountry = player.country || undefined;
          const total = player.total || 0;
          const events = (player.events || []).map((event: any) => ({
            timestamp: parseTimestamp(event.timestamp || '0:00'),
            description: event.description || '',
            value: event.value || event.current_score || 0,
            currentScore: event.current_score || event.value?.toString() || '0'
          }));
          
          players.push({
            name: playerName,
            team: playerTeam,
            country: playerCountry,
            total,
            events
          });
        });
      }
      
      return {
        title,
        isScoreMetric,
        players
      };
    });
  };
  
  const dynamicMetrics = parseDynamicMetrics();
  
  // Get consistent player names from the first metric (or score events)
  // IMPORTANT: Blue player (side="blue") always comes first, Red player (side="red") always comes second
  const getConsistentPlayerOrder = () => {
    // First try to get from separate_scores if available
    if (analysisData.score_analysis) {
      try {
        const scoreData = typeof analysisData.score_analysis === 'string' 
          ? JSON.parse(analysisData.score_analysis) 
          : analysisData.score_analysis;
        
        if (scoreData?.separate_scores && Array.isArray(scoreData.separate_scores)) {
          // Sort by side: blue first, red second
          const sortedEntities = [...scoreData.separate_scores].sort((a, b) => {
            const sideA = a.side?.toLowerCase() || '';
            const sideB = b.side?.toLowerCase() || '';
            if (sideA === 'blue') return -1;
            if (sideB === 'blue') return 1;
            return 0;
          });
          return sortedEntities.map((entity: any) => entity.entity_name);
        }
      } catch (error) {
        // Continue to fallback
      }
    }
    
    // Fallback to first metric with players
    const firstMetric = dynamicMetrics.find((m: any) => m.players && m.players.length >= 2);
    if (firstMetric) {
      return firstMetric.players.map((p: any) => p.name);
    }
    
    return [];
  };
  
  const playerOrder = getConsistentPlayerOrder();
  
  // Normalize player order in all metrics to match the consistent order
  const normalizedDynamicMetrics = dynamicMetrics.map((metric: any) => {
    if (!metric.players || playerOrder.length < 2) return metric;
    
    // Sort players based on the consistent order
    const sortedPlayers = [...metric.players].sort((a, b) => {
      const indexA = playerOrder.indexOf(a.name);
      const indexB = playerOrder.indexOf(b.name);
      
      // If both found in order, sort by that
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one found, it goes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Otherwise maintain original order
      return 0;
    });
    
    return {
      ...metric,
      players: sortedPlayers
    };
  });
  
  // Check if dynamic metrics contain team data
  const hasTeamMetrics = normalizedDynamicMetrics.some((metric: any) => 
    metric.players.some((player: any) => player.team !== undefined)
  );
  
  // Function to aggregate metrics by team
  const getTeamMetrics = (metric: any) => {
    if (!hasTeamMetrics || !metric.players) {
      return { teams: [], isTeamSport: false };
    }
    
    // Group players by team
    const teamGroups = new Map<string, any[]>();
    metric.players.forEach((player: any) => {
      const teamName = player.team || 'Unknown';
      if (!teamGroups.has(teamName)) {
        teamGroups.set(teamName, []);
      }
      teamGroups.get(teamName)?.push(player);
    });
    
    // Calculate team totals
    const teams = Array.from(teamGroups.entries()).map(([teamName, players]) => {
      const totalValue = players.reduce((sum, player) => {
        // Parse numeric value from total (could be number or string like "24 points")
        let playerTotal = 0;
        if (typeof player.total === 'number') {
          playerTotal = player.total;
        } else if (typeof player.total === 'string') {
          const numericMatch = player.total.match(/\d+/);
          playerTotal = numericMatch ? parseInt(numericMatch[0]) : 0;
        }
        return sum + playerTotal;
      }, 0);
      
      // Combine all events from all players on the team
      const allEvents = players.flatMap(player => 
        player.events.map((event: any) => ({
          ...event,
          playerName: player.name
        }))
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      return {
        name: teamName,
        totalValue,
        players,
        events: allEvents
      };
    });
    
    return { teams, isTeamSport: true };
  };
  
  // Debug logging for dynamic metrics
  if (process.env.NODE_ENV === 'development' && analysisData.dynamic_metrics) {
    console.log("=== DYNAMIC METRICS DEBUG ===");
    console.log("Raw dynamic_metrics from API:", JSON.stringify(analysisData.dynamic_metrics, null, 2));
    console.log("Parsed dynamicMetrics:", dynamicMetrics);
    console.log("Player order:", playerOrder);
    console.log("Normalized dynamicMetrics:", normalizedDynamicMetrics);
    console.log("Is Team Sport:", isTeamSport);
  }

  // Get current scores/cards based on video time
  const getCurrentStats = () => {
    const eventsUpToNow = scoreEvents.filter(event => event.timestamp <= currentTime);
    
    // For string scores (tennis), track the last score for each player separately
    const lastBlueScoreEvent = eventsUpToNow.filter(e => e.player === 'blue').pop();
    const lastRedScoreEvent = eventsUpToNow.filter(e => e.player === 'red').pop();
    
    // For numeric scores, use the last overall event
    const currentScoreEvent = eventsUpToNow.pop();
    
    const currentCardEvent = yellowCardEvents
      .filter(event => event.timestamp <= currentTime)
      .pop();

    return {
      blueScore: currentScoreEvent?.blueScore || 0,
      redScore: currentScoreEvent?.redScore || 0,
      blueScoreString: lastBlueScoreEvent?.scoreString, // Tennis: blue player's score (e.g., "15", "40")
      redScoreString: lastRedScoreEvent?.scoreString,   // Tennis: red player's score (e.g., "30", "Adv")
      blueCards: currentCardEvent?.blueCards || 0,
      redCards: currentCardEvent?.redCards || 0
    };
  };

  const currentStats = getCurrentStats();

  // Get current dynamic metric values for each player based on video time
  const getCurrentDynamicMetricValues = (metric: any) => {
    if (!metric.players || metric.players.length === 0) {
      return [];
    }
    
    return metric.players.map((player: any) => {
      // Calculate current value based on events up to current time
      let currentValue: number | string = 0;
      const eventsUpToNow = player.events.filter((e: any) => e.timestamp <= currentTime);
      
      if (metric.isScoreMetric) {
        // For Score metric with currentScore field, use the latest score value
        const latestEvent = eventsUpToNow[eventsUpToNow.length - 1];
        if (latestEvent?.currentScore !== undefined) {
          currentValue = latestEvent.currentScore;
        } else {
          // Fallback: sum up all scoring events for old format
          currentValue = eventsUpToNow.reduce((sum: number, e: any) => sum + (e.value || 1), 0);
        }
      } else {
        // For count metrics, sum up events up to current time
        currentValue = eventsUpToNow.reduce((sum: number, e: any) => sum + (e.value || 1), 0);
      }
      
      return {
        name: player.name,
        value: currentValue,
        total: player.total
      };
    });
  };

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

          {/* Dynamic Metrics or Traditional Kicks/Warnings */}
          {isTaekwondo ? (
            <>
              {/* Blue Kicks */}
              <Card className="bg-blue-900/20 border-blue-500/30" data-testid="blue-kicks-card">
                <CardContent className="p-4 text-center">
                  <div className="text-blue-400 font-semibold text-sm mb-2">{getTitle(sportConfig.action)}</div>
                  <div className="text-2xl font-bold text-blue-300" data-testid="blue-kicks">{blueKicks}</div>
                </CardContent>
              </Card>

              {/* Blue Yellow Cards */}
              <Card className="bg-blue-900/20 border-blue-500/30" data-testid="blue-cards-card">
                <CardContent className="p-4 text-center">
                  <div className="text-blue-400 font-semibold text-sm mb-2">{getTitle(sportConfig.violation)}</div>
                  <div className="text-2xl font-bold text-yellow-400" data-testid="blue-cards">{currentStats.blueCards}</div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Dynamic Metrics for Non-Taekwondo Sports */}
              {normalizedDynamicMetrics.map((metric: any, index: number) => {
                if (isTeamSport) {
                  // For team sports, show team totals
                  const teamData = getTeamMetrics(metric);
                  const team1 = teamData.teams[0]; // First team (e.g., Lakers)
                  
                  if (!team1) {
                    return (
                      <Card key={index} className="bg-blue-900/20 border-blue-500/30" data-testid={`metric-${index}-team-1`}>
                        <CardContent className="p-4 text-center">
                          <div className="text-blue-400 font-semibold text-xs mb-1">{metric.title}</div>
                          <div className="text-xs text-blue-300 mb-1">No data</div>
                          <div className="text-2xl font-bold text-blue-300">0</div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Get current value based on video time
                  const currentEvents = team1.events.filter((e: any) => e.timestamp <= currentTime);
                  const currentValue = currentEvents.length;
                  const lastEvent = currentEvents[currentEvents.length - 1];
                  
                  return (
                    <Card key={index} className="bg-blue-900/20 border-blue-500/30" data-testid={`metric-${index}-team-1`}>
                      <CardContent className="p-4 text-center">
                        <div className="text-blue-400 font-semibold text-xs mb-1">{metric.title}</div>
                        <div className="text-xs text-blue-300 mb-1 transition-all duration-300">
                          {lastEvent ? lastEvent.playerName : team1.name}
                        </div>
                        <div className="text-2xl font-bold text-blue-300">{currentValue}</div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  // For individual sports, show player stats
                  const playerValues = getCurrentDynamicMetricValues(metric);
                  const player1 = playerValues[0] || { name: 'Player 1', value: 0 };
                  
                  return (
                    <Card key={index} className="bg-blue-900/20 border-blue-500/30" data-testid={`metric-${index}-player-1`}>
                      <CardContent className="p-4 text-center">
                        <div className="text-blue-400 font-semibold text-xs mb-1">{metric.title}</div>
                        <div className="text-xs text-blue-300 mb-1">{player1.name}</div>
                        <div className="text-2xl font-bold text-blue-300" data-testid={`metric-value-${index}-player-1`}>{player1.value}</div>
                      </CardContent>
                    </Card>
                  );
                }
              })}
            </>
          )}
        </div>

        {/* Video Player - Center */}
        <div className="col-span-8">
          <Card className="bg-athlete-gray-800 border-gray-700">
            <CardContent className="p-0">
              {/* Unified Score Display Above Video - Works for all sports */}
              {(() => {
                // Determine current scores based on format
                let entity1Score = '0';
                let entity2Score = '0';
                
                if (isTaekwondo) {
                  // Taekwondo: Use numeric scores from currentStats
                  entity1Score = currentStats.blueScore.toString();
                  entity2Score = currentStats.redScore.toString();
                } else if (scoreFormat === 'string' && (currentStats.blueScoreString || currentStats.redScoreString)) {
                  // Individual sports with string scores (tennis)
                  entity1Score = currentStats.blueScoreString || '0';
                  entity2Score = currentStats.redScoreString || '0';
                } else {
                  // Individual/Team sports with numeric scores
                  entity1Score = currentStats.blueScore.toString();
                  entity2Score = currentStats.redScore.toString();
                }
                
                return (
                  <div className="bg-gradient-to-r from-blue-900/40 via-athlete-gray-800 to-red-900/40 border-b border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                      {/* Entity 1 (Blue/Team 1) */}
                      <div className="flex items-center gap-3 flex-1">
                        {entity1Country && (
                          <Flag 
                            country={entity1Country} 
                            className="w-8 h-6 rounded shadow-sm" 
                          />
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-lg font-bold text-blue-300">{entity1Name}</div>
                          {entity1Country && (
                            <div className="text-xs text-gray-400">{entity1Country}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Score Display */}
                      <div className="flex items-center gap-4 px-6">
                        <div className="text-4xl font-bold text-blue-400" data-testid="entity1-score">
                          {entity1Score}
                        </div>
                        <div className="text-2xl font-bold text-gray-500">-</div>
                        <div className="text-4xl font-bold text-red-400" data-testid="entity2-score">
                          {entity2Score}
                        </div>
                      </div>
                      
                      {/* Entity 2 (Red/Team 2) */}
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <div className="flex-1 text-right">
                          <div className="text-lg font-bold text-red-300">{entity2Name}</div>
                          {entity2Country && (
                            <div className="text-xs text-gray-400">{entity2Country}</div>
                          )}
                        </div>
                        {entity2Country && (
                          <Flag 
                            country={entity2Country} 
                            className="w-8 h-6 rounded shadow-sm" 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
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
                      
                      {/* Dynamic Metric Markers */}
                      {!isTaekwondo && duration > 0 && normalizedDynamicMetrics.flatMap((metric: any, metricIndex: number) => 
                        metric.players?.flatMap((player: any, playerIndex: number) => 
                          player.events?.map((event: any, eventIndex: number) => (
                            <div
                              key={`metric-${metricIndex}-player-${playerIndex}-event-${eventIndex}`}
                              className={`absolute top-0 w-0.5 h-3 -mt-1 cursor-pointer z-10 ${
                                playerIndex === 0 ? 'bg-blue-400 hover:bg-blue-300' : 'bg-red-400 hover:bg-red-300'
                              }`}
                              style={{ left: `${(event.timestamp / duration) * 100}%` }}
                              title={`${player.name} - ${metric.title} - Click to jump`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeek(event.timestamp);
                              }}
                              data-testid={`metric-marker-${metricIndex}-${playerIndex}-${eventIndex}`}
                            />
                          )) || []
                        ) || []
                      )}
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

          {/* Dynamic Metrics or Traditional Kicks/Warnings */}
          {isTaekwondo ? (
            <>
              {/* Red Kicks */}
              <Card className="bg-red-900/20 border-red-500/30" data-testid="red-kicks-card">
                <CardContent className="p-4 text-center">
                  <div className="text-red-400 font-semibold text-sm mb-2">{getTitle(sportConfig.action)}</div>
                  <div className="text-2xl font-bold text-red-300" data-testid="red-kicks">{redKicks}</div>
                </CardContent>
              </Card>

              {/* Red Yellow Cards */}
              <Card className="bg-red-900/20 border-red-500/30" data-testid="red-cards-card">
                <CardContent className="p-4 text-center">
                  <div className="text-red-400 font-semibold text-sm mb-2">{getTitle(sportConfig.violation)}</div>
                  <div className="text-2xl font-bold text-yellow-400" data-testid="red-cards">{currentStats.redCards}</div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Dynamic Metrics for Non-Taekwondo Sports */}
              {normalizedDynamicMetrics.map((metric: any, index: number) => {
                if (isTeamSport) {
                  // For team sports, show team totals
                  const teamData = getTeamMetrics(metric);
                  const team2 = teamData.teams[1]; // Second team (e.g., Warriors)
                  
                  if (!team2) {
                    return (
                      <Card key={index} className="bg-red-900/20 border-red-500/30" data-testid={`metric-${index}-team-2`}>
                        <CardContent className="p-4 text-center">
                          <div className="text-red-400 font-semibold text-xs mb-1">{metric.title}</div>
                          <div className="text-xs text-red-300 mb-1">No data</div>
                          <div className="text-2xl font-bold text-red-300">0</div>
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Get current value based on video time
                  const currentEvents = team2.events.filter((e: any) => e.timestamp <= currentTime);
                  const currentValue = currentEvents.length;
                  const lastEvent = currentEvents[currentEvents.length - 1];
                  
                  return (
                    <Card key={index} className="bg-red-900/20 border-red-500/30" data-testid={`metric-${index}-team-2`}>
                      <CardContent className="p-4 text-center">
                        <div className="text-red-400 font-semibold text-xs mb-1">{metric.title}</div>
                        <div className="text-xs text-red-300 mb-1 transition-all duration-300">
                          {lastEvent ? lastEvent.playerName : team2.name}
                        </div>
                        <div className="text-2xl font-bold text-red-300">{currentValue}</div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  // For individual sports, show player stats
                  const playerValues = getCurrentDynamicMetricValues(metric);
                  const player2 = playerValues[1] || { name: 'Player 2', value: 0 };
                  
                  return (
                    <Card key={index} className="bg-red-900/20 border-red-500/30" data-testid={`metric-${index}-player-2`}>
                      <CardContent className="p-4 text-center">
                        <div className="text-red-400 font-semibold text-xs mb-1">{metric.title}</div>
                        <div className="text-xs text-red-300 mb-1">{player2.name}</div>
                        <div className="text-2xl font-bold text-red-300" data-testid={`metric-value-${index}-player-2`}>{player2.value}</div>
                      </CardContent>
                    </Card>
                  );
                }
              })}
            </>
          )}
        </div>
      </div>

      {/* Match Analysis - Bottom */}
      <Card className="bg-athlete-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Trophy className="mr-2 text-yellow-400" size={20} />
            {getTitle('Complete Match Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300 leading-relaxed" data-testid="match-analysis">
            {(() => {
              if (!matchAnalysis) {
                return <p className="text-gray-400">No match analysis available</p>;
              }
              
              const rawText = typeof matchAnalysis === 'string' 
                ? matchAnalysis 
                : typeof matchAnalysis?.content === 'string'
                ? matchAnalysis.content
                : JSON.stringify(matchAnalysis, null, 2);
              
              return prettifyMatchAnalysis(rawText);
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Player Advice Section - After Match Analysis */}
      <PlayerAdviceSection 
        adviceData={analysisData.advice_analysis}
        language={language}
      />
    </div>
  );
}

// Player Advice Section Component
interface PlayerAdviceSectionProps {
  adviceData: string | null;
  language?: string;
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

export function PlayerAdviceSection({ adviceData, language = 'english' }: PlayerAdviceSectionProps) {
  const [parsedAdviceData, setParsedAdviceData] = useState<AdviceData | null>(null);
  const [hasParsingError, setHasParsingError] = useState(false);

  // Translation function for titles within PlayerAdviceSection
  const getTitle = (key: string): string => {
    if (language === 'arabic') {
      const arabicTitles: Record<string, string> = {
        'Advice for Each Player': 'نصائح لكل لاعب',
        'General Observations': 'ملاحظات عامة',
        'TACTICAL': 'تكتيكي',
        'TECHNICAL': 'تقني',
        'MENTAL': 'عقلي',
        'Issues:': 'المشاكل:',
        'Improvements:': 'التحسينات:'
      };
      return arabicTitles[key] || key;
    }
    return key;
  };

  useEffect(() => {
    if (adviceData) {
      try {
        // Use the same robust parsing logic as other components
        let parsed: any = adviceData;
        
        if (typeof adviceData === 'string') {
          // Check if it's a markdown-wrapped JSON string
          if (adviceData.includes('```json') || adviceData.includes('```')) {
            // Extract JSON from markdown code blocks
            let content = adviceData;
            if (content.startsWith('```json') && content.endsWith('```')) {
              content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (content.startsWith('```') && content.endsWith('```')) {
              content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            // Try to parse the extracted content as JSON
            parsed = JSON.parse(content.trim());
          } else {
            // Try to parse as direct JSON
            try {
              parsed = JSON.parse(adviceData);
            } catch (directParseError) {
              // If direct parse fails, check if it's wrapped in a content field object
              try {
                const contentWrapper = JSON.parse(adviceData);
                if (contentWrapper.content) {
                  // Extract JSON from markdown code blocks in content
                  let content = contentWrapper.content;
                  if (content.startsWith('```json') && content.endsWith('```')) {
                    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                  } else if (content.startsWith('```') && content.endsWith('```')) {
                    content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
                  }
                  parsed = JSON.parse(content.trim());
                } else {
                  parsed = contentWrapper;
                }
              } catch (wrapperParseError) {
                // If all parsing fails, use the original string
                throw new Error('Could not parse advice data');
              }
            }
          }
        }
        
        setParsedAdviceData(parsed);
        setHasParsingError(false);
      } catch (error) {
        console.error("Error parsing advice data:", error);
        setHasParsingError(true);
      }
    }
  }, [adviceData]);

  return (
    <Card className="bg-athlete-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Brain className="mr-2 text-purple-400" size={20} />
          {getTitle('Advice for Each Player')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!adviceData && (
          <div className="text-gray-400 text-center py-8" data-testid="advice-empty-state">
            <Brain className="mx-auto mb-4 text-purple-400" size={48} />
            <p className="text-lg mb-2">No Player Advice Available</p>
            <p className="text-sm">Advice will appear automatically after video analysis</p>
          </div>
        )}

        {hasParsingError && (
          <div className="text-gray-400 text-center py-8" data-testid="advice-error">
            <MessageSquare className="mx-auto mb-4 text-red-400" size={48} />
            <p className="text-lg mb-2">Unable to Display Advice</p>
            <p className="text-sm">There was an issue processing the player advice data</p>
          </div>
        )}

        {parsedAdviceData && !hasParsingError && (
          <div className="space-y-6" data-testid="advice-results">
            {/* General Observations */}
            {parsedAdviceData.general_observations && (
              <Card className="bg-gray-900/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center">
                    <MessageSquare className="mr-2 text-blue-400" size={18} />
                    {getTitle('General Observations')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 leading-relaxed" data-testid="general-observations">
                    {parsedAdviceData.general_observations}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Player Advice Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {parsedAdviceData.players?.map((player, index) => (
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
                      {player.name} ({player.color})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tactical Advice */}
                    <div className="space-y-2">
                      <h4 className="text-yellow-400 font-semibold text-sm flex items-center">
                        <Target className="mr-1" size={14} />
                        {getTitle('TACTICAL')}
                      </h4>
                      {player.tactical_advice?.issues?.length > 0 && (
                        <div>
                          <p className="text-red-300 text-xs font-medium">{getTitle('Issues:')}</p>
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
                          <p className="text-green-300 text-xs font-medium">{getTitle('Improvements:')}</p>
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
                        {getTitle('TECHNICAL')}
                      </h4>
                      {player.technical_advice?.issues?.length > 0 && (
                        <div>
                          <p className="text-red-300 text-xs font-medium">{getTitle('Issues:')}</p>
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
                          <p className="text-green-300 text-xs font-medium">{getTitle('Improvements:')}</p>
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
                        {getTitle('MENTAL')}
                      </h4>
                      {player.mental_advice?.issues?.length > 0 && (
                        <div>
                          <p className="text-red-300 text-xs font-medium">{getTitle('Issues:')}</p>
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
                          <p className="text-green-300 text-xs font-medium">{getTitle('Improvements:')}</p>
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