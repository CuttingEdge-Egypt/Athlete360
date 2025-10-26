import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
}

const genai = new GoogleGenerativeAI(GEMINI_API_KEY!);

const generationConfig = {
  temperature: 0,
  maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
};

const model = genai.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig,
});

// Sport-specific configurations
interface SportConfig {
  name: string;
  scoringEvents: string[];
  violationsEvents: string[];
  hasRounds: boolean;
  timeFormat: string;
  analysisTerms: {
    action: string; // kicks, shots, strikes, etc.
    violation: string; // yellow cards, fouls, penalties, etc.
    scoring: string; // points, goals, scores, etc.
  };
}

const SPORT_CONFIGS: Record<string, SportConfig> = {
  'taekwondo': {
    name: 'Taekwondo',
    scoringEvents: ['1-point kick', '2-point kick', '3-point kick', '5-point head kick'],
    violationsEvents: ['yellow card', 'warning', 'gam-jeom'],
    hasRounds: true,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'kicks',
      violation: 'yellow cards',
      scoring: 'points'
    }
  },
  'boxing': {
    name: 'Boxing',
    scoringEvents: ['clean punch', 'power punch', 'combination'],
    violationsEvents: ['warning', 'point deduction', 'low blow', 'holding'],
    hasRounds: true,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'punches',
      violation: 'warnings',
      scoring: 'scoring punches'
    }
  },
  'soccer': {
    name: 'Soccer/Football',
    scoringEvents: ['goals', 'assists', 'key passes'],
    violationsEvents: ['yellow card', 'red card', 'foul'],
    hasRounds: false,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'shots',
      violation: 'cards',
      scoring: 'goals'
    }
  },
  'football': {
    name: 'Football',
    scoringEvents: ['goals', 'assists', 'key passes'],
    violationsEvents: ['yellow card', 'red card', 'foul'],
    hasRounds: false,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'shots',
      violation: 'cards',
      scoring: 'goals'
    }
  },
  'basketball': {
    name: 'Basketball',
    scoringEvents: ['2-point shot', '3-point shot', 'free throw'],
    violationsEvents: ['personal foul', 'technical foul', 'flagrant foul'],
    hasRounds: false,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'shots',
      violation: 'fouls',
      scoring: 'points'
    }
  },
  'tennis': {
    name: 'Tennis',
    scoringEvents: ['aces', 'winners', 'service winners'],
    violationsEvents: ['time violation', 'code violation', 'unsportsmanlike conduct'],
    hasRounds: false,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'shots',
      violation: 'violations',
      scoring: 'points'
    }
  },
  'martial_arts': {
    name: 'Martial Arts',
    scoringEvents: ['clean strike', 'power strike', 'combination'],
    violationsEvents: ['warning', 'penalty', 'disqualification'],
    hasRounds: true,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'strikes',
      violation: 'penalties',
      scoring: 'points'
    }
  }
};

// Get sport configuration or create a generic one
export function getSportConfig(sport: string): SportConfig {
  // Normalize the sport name - trim and lowercase
  const normalizedSport = sport.toLowerCase().trim();
  
  // Try direct match first
  if (SPORT_CONFIGS[normalizedSport]) {
    console.log(`[SPORT_CONFIG] Found direct match for: ${normalizedSport}`);
    return SPORT_CONFIGS[normalizedSport];
  }
  
  // Try removing special characters and spaces
  const cleanedSport = normalizedSport.replace(/[^a-z]/g, '');
  if (SPORT_CONFIGS[cleanedSport]) {
    console.log(`[SPORT_CONFIG] Found cleaned match for: ${cleanedSport}`);
    return SPORT_CONFIGS[cleanedSport];
  }
  
  // Try partial match
  for (const key of Object.keys(SPORT_CONFIGS)) {
    if (normalizedSport.includes(key) || key.includes(normalizedSport)) {
      console.log(`[SPORT_CONFIG] Found partial match: ${key} for ${normalizedSport}`);
      return SPORT_CONFIGS[key];
    }
  }
  
  // Create a generic sport config using the actual sport name
  console.log(`[SPORT_CONFIG] No match found for: ${sport}, creating generic config`);
  return {
    name: sport, // Use the actual sport name, not "Taekwondo"
    scoringEvents: ['score', 'point', 'goal'],
    violationsEvents: ['foul', 'penalty', 'violation'],
    hasRounds: false,
    timeFormat: 'MM:SS',
    analysisTerms: {
      action: 'actions',
      violation: 'violations',
      scoring: 'points'
    }
  };
}

// Generate sport-specific prompts
function generateSportSpecificPrompts(sport: string, roundToAnalyze: number | 'no-rounds', language: string) {
  const sportConfig = getSportConfig(sport);
  const languageInstruction = language === 'arabic' 
    ? `Write your response in Arabic (العربية). Use proper Arabic terminology for ${sportConfig.name.toLowerCase()} techniques and match analysis.`
    : `Write your response in English.`;

  const roundText = roundToAnalyze === 'no-rounds' 
    ? 'the entire match/game' 
    : `round ${roundToAnalyze}`;

  const analysisTitle = roundToAnalyze === 'no-rounds'
    ? `**Match Analysis: Full Game**`
    : `**Match Analysis: Round ${roundToAnalyze}**`;

  const promptMatch = `Write me a match analysis of what happened in ${roundText} in technical terms. Include the story of the ${roundToAnalyze === 'no-rounds' ? 'match' : 'round'}.

${languageInstruction}

IMPORTANT: Start directly with "${analysisTitle}" - DO NOT include any prefacing phrases like "Of course", "Here is", "Sure", or similar AI response patterns.

Listen to any insights the commentator might have. Here is a template:

Match Score:
Give me the final score of the ${roundToAnalyze === 'no-rounds' ? 'match' : 'round'}.

${sportConfig.analysisTerms.action.charAt(0).toUpperCase() + sportConfig.analysisTerms.action.slice(1)} Count & Types:
This analysis is limited by the fast action and occasional obscured views, but here are some highlights. Precise numbers are hard to determine but I will use as many markers as possible.

Player 1 (Blue): Describe their technique style.
Estimate their key actions and techniques based on observation

Player 2 (Red): Describe their technique style.  
Estimate their key actions and techniques based on observation

${sportConfig.analysisTerms.action === 'kicks' ? 'Punch Count:' : 'Other Actions:'}
${sportConfig.analysisTerms.action === 'kicks' ? 'Mention if there were any punches in the match' : 'Mention any secondary actions observed'}

Match Brief & Technical Analysis:
Provide detailed technical analysis of both players' approaches and strategies.

Strategic Adaptation: How each player adapted during the ${roundToAnalyze === 'no-rounds' ? 'match' : 'round'}.

Key Moments/Commentator Notes:
Include any key insights from commentators.

Summary:
Explain who performed better and why.

Take your time in processing to make sure the results are accurate.
Make sure you're not scanning ${sportConfig.violationsEvents[0]} as an actual score.`;

  // Determine if this is a team sport
  const teamSports = ['basketball', 'soccer', 'football', 'volleyball', 'hockey', 'rugby', 'baseball', 'cricket'];
  const isTeamSport = teamSports.includes(sport.toLowerCase());
  
  // Calculate time range for round-based sports
  let timeRangeInstruction = '';
  // Time restrictions removed - analyze full video regardless of round selection
  // if (roundToAnalyze !== 'no-rounds' && sportConfig.hasRounds) {
  //   const roundNum = Number(roundToAnalyze);
  //   const roundDuration = 2; // Standard round duration in minutes for combat sports
  //   const startTime = (roundNum - 1) * roundDuration;
  //   const endTime = roundNum * roundDuration;
  //   timeRangeInstruction = `\n\n🚨 CRITICAL TIME RESTRICTION 🚨
  // ONLY analyze timestamps from ${String(startTime).padStart(2, '0')}:00 to ${String(endTime).padStart(2, '0')}:00.
  // DO NOT include any events outside this time range.
  // STOP watching immediately when the timer reaches ${String(endTime).padStart(2, '0')}:00.`;
  // }

  const promptScore = isTeamSport ? 
    `Watch ${roundText} only. Track EVERY scoring event in this ${sportConfig.name} match. Focus on the scoreboard for accuracy.${timeRangeInstruction}

🎯 HIGHLIGHTS VIDEO INSTRUCTION:
Only count every point you saw, you can reference how many points it was by the scoreboard and the rules of the sport. But in general this might be a highlights video so some points are not seen in the video, so again; INSTRUCTION: Only count points that were seen in the video.

CRITICAL: All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.

🚨🚨🚨 ABSOLUTELY MANDATORY - NO EXCEPTIONS 🚨🚨🚨
STEP 1: IDENTIFY TEAMS FIRST
- Look at jerseys, scoreboard, or announcer commentary
- Identify Team 1 name (e.g., "Lakers", "Warriors", "Bulls", "Celtics")
- Identify Team 2 name (e.g., "Lakers", "Warriors", "Bulls", "Celtics")

STEP 2: FOR EVERY SINGLE PLAYER IN THE JSON:
- ✅ REQUIRED: "name" field (player's name)
- ✅ REQUIRED: "team" field (MUST be Team 1 or Team 2 name - NEVER omit this)
- ✅ REQUIRED: "country" field (null is okay)
- ✅ REQUIRED: "events" array

STEP 3: FOR EVERY SINGLE EVENT:
- ✅ REQUIRED: "timestamp" in MM:SS format
- ✅ REQUIRED: "description" (e.g., "3-point shot", "2-point layup")
- ✅ REQUIRED: "current_score" - ONLY that team's score (NOT the full game score)
  - Example: If Lakers score and now have 15 points → "current_score": "15"
  - Example: If Warriors score and now have 12 points → "current_score": "12"
  - WRONG: "Lakers 15-12 Warriors" or "15-12" (these show both teams)
  - RIGHT: Just the number/value for THAT team only

VALIDATION CHECKLIST - YOUR RESPONSE MUST PASS ALL:
□ Does EVERY player object have a "team" field? (NOT OPTIONAL!)
□ Is current_score ONLY that team's score (NOT both teams)? (NOT full game score!)
□ Are timestamps in MM:SS format? (NOT HH:MM:SS!)

EXACT JSON FORMAT - COPY THIS STRUCTURE:
{
  "players": [
    {
      "name": "Austin Reaves",
      "team": "Lakers",
      "country": null,
      "events": [
        {
          "timestamp": "00:15",
          "description": "3-point shot",
          "current_score": "15"
        }
      ]
    },
    {
      "name": "Stephen Curry",
      "team": "Warriors",
      "country": null,
      "events": [
        {
          "timestamp": "00:45",
          "description": "2-point layup",
          "current_score": "14"
        }
      ]
    }
  ]
}

BEFORE RETURNING: Double-check that EVERY player has a "team" field and EVERY event's "current_score" shows ONLY that team's score (NOT both teams).` :
    `${sport.toLowerCase() === 'taekwondo' ? `Watch ${roundText} only. Identify when a player scored using the scoreboard.
Focus on the scoreboard change for better accuracy. Listen to commentators they will help you reference which player scored how many points. Include final match score (from scoreboard) in the summary.
Be conservative in your predictions and calculations only include scores you're a 100% sure of.${timeRangeInstruction}

🎯 PLAYER NAMES - IMPORTANT:
- TRY to get actual player names from scoreboard, announcer commentary, or on-screen graphics
- If you CANNOT determine actual names, use "Blue" for the blue corner player and "Red" for the red corner player
- ALWAYS identify the correct "side" field (blue or red) for each player based on their corner

CRITICAL: All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.
CRITICAL: "current_score" shows ONLY that specific player's score (NOT both players' scores).

Return JSON format:` : `Watch ${roundText} only. Identify when a player scored using the scoreboard. Focus on the scoreboard change for better accuracy.

CRITICAL: All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.${timeRangeInstruction}

CRITICAL: "current_score" shows ONLY that specific player's score (NOT both players' scores):
- For tennis: If Player 1 scores → "current_score": "15" (NOT "15-0" or "15-30")
- For tennis: If Player 2 scores → "current_score": "30" (NOT "0-30" or "15-30")
- For other sports: If Player 1 has 2 points → "current_score": "2" (NOT "2-1")
- Use string format for special values like "Adv" (advantage) or "Deuce"

Return JSON format:`}
{
  "players": [
    {
      "name": "John Smith",
      "side": "blue",
      "country": null,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Score description",
          "current_score": "15"
        }
      ]
    },
    {
      "name": "Red",
      "side": "red",
      "country": null,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Score description", 
          "current_score": "30"
        }
      ]
    }
  ]
}

NOTE: Use actual player names if visible/audible (e.g., "John Smith"), otherwise use "Blue" or "Red" based on their corner.`;

  const promptActions = `Watch ${roundText} only. Watch this ${sportConfig.name.toLowerCase()} match and tell me when a player performed a ${sportConfig.analysisTerms.action === 'kicks' ? 'punch' : 'secondary action'}, ${sportConfig.analysisTerms.action === 'kicks' ? 'a punch is when a player clenches their fist and tries to hit another player' : 'an action that complements their primary technique'}. If there are no ${sportConfig.analysisTerms.action === 'kicks' ? 'punches' : 'secondary actions'} found let the JSON be NONE.${timeRangeInstruction}

CRITICAL: All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "${sportConfig.analysisTerms.action === 'kicks' ? 'Punch' : 'secondary_action'}": [
        {
          "timestamp": "${sportConfig.timeFormat}",
          "score": 0
        }
      ],
      "total_${sportConfig.analysisTerms.action === 'kicks' ? 'punches' : 'secondary_actions'}": 0
    },
    {
      "name": "Player 2",
      "${sportConfig.analysisTerms.action === 'kicks' ? 'Punch' : 'secondary_action'}": [
        {
          "timestamp": "${sportConfig.timeFormat}", 
          "score": 0
        }
      ],
      "total_${sportConfig.analysisTerms.action === 'kicks' ? 'punches' : 'secondary_actions'}": 0
    }
  ]
}

Return Time in ${sportConfig.timeFormat === 'MM:SS' ? 'Minutes and Seconds: MM:SS' : sportConfig.timeFormat};`;

  const promptActionCount = `Watch ${roundText} only. Watch the ${sportConfig.name.toLowerCase()} match and count the total number of ${sportConfig.analysisTerms.action} both players executed. Even if ${sportConfig.analysisTerms.action} doesn't hit the opponent or if they blocked it; count every time there is an attempt.${timeRangeInstruction}

IMPORTANT: This total_${sportConfig.analysisTerms.action}_number should match the total_${sportConfig.analysisTerms.action} count from the scoring analysis.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "${sportConfig.analysisTerms.action}": [
        {
          "total_${sportConfig.analysisTerms.action}_number": 0
        }
      ]
    },
    {
      "name": "Player 2",
      "${sportConfig.analysisTerms.action}": [
        {
          "total_${sportConfig.analysisTerms.action}_number": 0
        }
      ]
    }
  ]
}`;

  const promptViolations = `Watch ${roundText} only. This is a ${sportConfig.name.toLowerCase()} match, following ${sportConfig.name.toLowerCase()} rules. By looking at the scoreboard and watching when the referee gives a ${sportConfig.violationsEvents[0]} to a player, list all ${sportConfig.analysisTerms.violation} with their exact timestamps.${timeRangeInstruction}
${sport.toLowerCase() === 'taekwondo' ? `
🥋 TAEKWONDO WARNING/YELLOW CARD DETECTION:
- A warning happens when the referee POINTS at the player AND RAISES their arm
- Do NOT confuse the referee getting in between players with warnings
- The referee has to actually POINT at the player for it to be considered a warning
- Watch for the specific gesture: pointing + raised arm = warning
- The scoreboard may also show the warning/gam-jeom penalty
` : ''}
IMPORTANT: Calculate total_${sportConfig.analysisTerms.violation.replace(' ', '_')} by adding up all individual ${sportConfig.violationsEvents[0]} amounts. For example: if ${sportConfig.violationsEvents[0]}s are [1, 1, 1], then total_${sportConfig.analysisTerms.violation.replace(' ', '_')} = 1+1+1 = 3.

CRITICAL: All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "color": "Red/Blue",
      "${sportConfig.analysisTerms.violation.replace(' ', '_')}": [
        {
          "timestamp": "${sportConfig.timeFormat}",
          "Amount": 1
        }
      ],
      "total_${sportConfig.analysisTerms.violation.replace(' ', '_')}": 0
    },
    {
      "name": "Player 2 (Red)",
      "${sportConfig.analysisTerms.violation.replace(' ', '_')}": [
        {
          "timestamp": "${sportConfig.timeFormat}",
          "Amount": 1
        }
      ],
      "total_${sportConfig.analysisTerms.violation.replace(' ', '_')}": 0
    }
  ]
}
Return Time in ${sportConfig.timeFormat === 'MM:SS' ? 'Minutes and Seconds: MM:SS' : sportConfig.timeFormat};`;

  return {
    promptMatch,
    promptScore,
    promptActions,
    promptActionCount,
    promptViolations
  };
}

// Function to clean markdown formatting from match analysis text
function cleanMarkdownFormatting(text: string): string {
  if (!text) return '';
  
  let cleanedText = text.trim();
  
  // Remove markdown headers (###, ##, #)
  cleanedText = cleanedText.replace(/^#{1,6}\s*/gm, '');
  
  // Remove excessive line breaks
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
  
  return cleanedText;
}

// Function to clean and fix common JSON formatting issues in AI responses
function cleanJsonResponse(responseText: string): string {
  if (!responseText || responseText.trim() === '') {
    console.error('[CLEAN_JSON] ⚠️ EMPTY RESPONSE RECEIVED - Gemini returned no data');
    console.error('[CLEAN_JSON] This indicates Gemini failed to generate the metric or hit a safety filter');
    console.error('[CLEAN_JSON] Returning fallback structure with empty players array');
    return '{"players": []}';
  }
  
  let cleanedText = responseText.trim();
  
  // Remove code block markers if present
  cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  
  // Try to parse and reformat to catch basic JSON errors
  try {
    const parsed = JSON.parse(cleanedText);
    return JSON.stringify(parsed);
  } catch (error) {
    console.log(`[CLEAN_JSON] Initial parse failed, attempting cleanup: ${error}`);
    
    // Multiple cleanup attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let attemptText = cleanedText;
        
        // Attempt 1: Fix common comma issues
        if (attempt === 1) {
          attemptText = attemptText.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          attemptText = attemptText.replace(/([}\]])(\s*)([{"\[])/g, '$1,$2$3'); // Add missing commas between objects
        }
        
        // Attempt 2: Fix quote issues and escape sequences
        if (attempt === 2) {
          attemptText = attemptText.replace(/'/g, '"'); // Replace single quotes with double quotes
          attemptText = attemptText.replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
          attemptText = attemptText.replace(/:\s*([^",{[\]}\s]+)(?=\s*[,}])/g, ': "$1"'); // Quote unquoted string values
        }
        
        // Attempt 3: More aggressive cleanup
        if (attempt === 3) {
          attemptText = attemptText.replace(/\n/g, ' '); // Remove newlines
          attemptText = attemptText.replace(/\s+/g, ' '); // Normalize whitespace
          // Try to find JSON-like content and extract it
          const jsonMatch = attemptText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            attemptText = jsonMatch[0];
          }
        }
        
        const parsed = JSON.parse(attemptText);
        console.log(`[CLEAN_JSON] Cleanup successful on attempt ${attempt}`);
        return JSON.stringify(parsed);
        
      } catch (cleanupError) {
        console.log(`[CLEAN_JSON] Attempt ${attempt} failed: ${cleanupError}`);
        if (attempt === 3) {
          // Final fallback - return empty structure in standardized format
          console.log(`[CLEAN_JSON] All cleanup attempts failed, returning fallback structure`);
          // Check if it's a natural language response and extract data if possible
          if (responseText.toLowerCase().includes('no score') || 
              responseText.toLowerCase().includes('0-0') ||
              responseText.toLowerCase().includes('no points')) {
            return '{"players": [{"name": "Player 1", "total": 0, "events": []}, {"name": "Player 2", "total": 0, "events": []}]}';
          }
          return '{"players": []}';
        }
      }
    }
  }
  
  // Should never reach here, but just in case
  return '{"players": []}';
}

// Upload video file to Gemini using Files API to avoid memory issues
async function uploadFileToGemini(videoFilePath: string) {
  console.log(`[UPLOAD_TO_GEMINI] Starting file upload: ${videoFilePath}`);
  
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
    }
    const fileManager = new GoogleAIFileManager(apiKey);
    
    // Upload the file
    const uploadResponse = await fileManager.uploadFile(videoFilePath, {
      mimeType: 'video/mp4',
      displayName: `video_analysis_${Date.now()}`,
    });
    
    console.log(`[UPLOAD_TO_GEMINI] File uploaded successfully: ${uploadResponse.file.uri}`);
    
    // Wait for processing to complete
    let file = await fileManager.getFile(uploadResponse.file.name);
    while (file.state === 'PROCESSING') {
      console.log(`[UPLOAD_TO_GEMINI] File still processing, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      file = await fileManager.getFile(uploadResponse.file.name);
    }
    
    if (file.state === 'FAILED') {
      throw new Error(`File processing failed: ${file.error?.message || 'Unknown error'}`);
    }
    
    console.log(`[UPLOAD_TO_GEMINI] File ready for analysis: ${file.uri}`);
    return file;
    
  } catch (error) {
    console.error(`[UPLOAD_TO_GEMINI] Upload failed:`, error);
    throw error;
  }
}

// Ask Gemini what metrics it can count for a specific sport
async function askGeminiWhatToCount(uploadedFile: any, sport: string, roundText: string, language: string = 'english') {
  console.log(`[ASK_WHAT_TO_COUNT] Asking Gemini what to count for ${sport} in ${language}`);
  
  const videoFile = {
    fileData: {
      mimeType: uploadedFile.mimeType,
      fileUri: uploadedFile.uri
    }
  };
  
  const sportConfig = getSportConfig(sport);
  
  // Define sport-specific scoring instructions
  const sportScoreInstructions: { [key: string]: string } = {
    'tennis': 'Tennis uses point-by-point scoring (0/15/30/40/Game) within games, and games are counted for the set score. Track BOTH: (1) the actual game score/set score shown on scoreboard (e.g., "6-1" for games won in a set), AND (2) individual point scores within each game (15-0, 30-15, 40-30, etc.) when visible. Prioritize showing the point-level scoring progression when the scoreboard or audio cues indicate point changes.',
    'soccer': 'Soccer/Football uses goal scoring. Track each goal scored with the running score (e.g., 2-1 means 2 goals to 1).',
    'basketball': 'Basketball uses continuous point scoring. Track the total points shown on the scoreboard after each basket.',
    'boxing': 'Boxing uses round scoring by judges. Track round winners, knockdowns, and official scores when announced.',
    'martial_arts': 'Martial Arts uses point scoring. Track points awarded by judges as shown on the scoreboard.',
    'default': 'Track the score as shown on the scoreboard or announced by commentators, following the specific scoring system of this sport.'
  };
  
  const scoreInstruction = sportScoreInstructions[sport.toLowerCase()] || sportScoreInstructions['default'];
  
  // Determine if this is a team sport
  const teamSports = ['basketball', 'soccer', 'football', 'volleyball', 'hockey', 'rugby', 'baseball', 'cricket'];
  const isTeamSport = teamSports.includes(sport.toLowerCase());
  
  const languageInstruction = language.toLowerCase() === 'arabic' 
    ? 'CRITICAL: ALL metric titles and descriptions MUST be written in Arabic language.'
    : 'CRITICAL: ALL metric titles and descriptions MUST be written in English language.';

  const prompt = `You are analyzing a ${sportConfig.name} match video for a video analysis web application. Your task is to identify USEFUL metrics that users will want to track and analyze.

${languageInstruction}

Based on the video, identify distinct, countable metrics that are clearly visible and provide real analytical value. You can suggest MORE than 5 metrics if they are valuable and useful (no upper limit). For ${sportConfig.name}, focus on:
1. Specific types of actions that coaches and analysts care about
2. Rule violations, penalties, or infractions if visible
3. Any other clearly identifiable, actionable metrics that provide performance insights

IMPORTANT: 
- DO NOT include "Score" or "Point Scoring" as a metric - we already have a dedicated scoring system for that
- Focus on USEFUL metrics that provide real value for performance analysis
- Prioritize metrics that are both visible AND meaningful for coaching/training purposes

${isTeamSport ? `CRITICAL TEAM SPORTS INSTRUCTIONS:
- You MUST identify which team each player belongs to (e.g., "Lakers", "Warriors", "Team A", "Team B")
- Count ALL instances from ALL players on BOTH teams
- The goal is to get COMPLETE TEAM TOTALS, not individual highlights
- If a metric like "Assists" is hard to see clearly in the video, skip it and choose something more visible
- Focus on metrics that are CLEARLY VISIBLE and COUNTABLE in this specific video
- Don't suggest metrics that require complex judgment calls or are hard to see` : ''}

CRITICAL: ALL metrics MUST use this standardized JSON format:

{
  "players": [
    {
      "name": "Full Player Name",
      "team": "Team name (e.g., Lakers, Warriors, Team A, Team B)",
      "country": "Country name if visible",
      "total": 0,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Event description",
          "value": 1
        }
      ]
    }
  ]
}

For EACH metric you identify, provide:
1. A clear title (e.g., "Aces", "Defensive Blocks", "Unforced Errors")
2. A detailed prompt that you would use to count that specific metric - this prompt MUST:
   - Start with "This is a ${sportConfig.name} video" to provide sport context
   - Explicitly specify "${roundText}" in the counting instructions
   - Include a SPECIFIC EXAMPLE from the video showing when this event happened (e.g., "An Ace occurred at 00:53 when the serve was unreturnable")
   - Provide CLEAR GUIDANCE on what qualifies as this event in ${sportConfig.name}
   - Include the standardized JSON format shown above
   - Use player FULL NAMES (not "Player 1" or "Blue/Red" unless names are unknown)
   - FOR TEAM SPORTS: Explicitly instruct to search the entire video and count for ALL players from BOTH teams who performed the action - never limit to one team
   - Include MANDATORY instructions to ALWAYS return valid JSON even if no events are detected
   - Specify that this is a ${sportConfig.name} match to ensure sport-specific accuracy

Return ONLY a valid JSON response in this exact format:
{
  "metrics": [
    {
      "title": "Metric Title",
      "prompt": "This is a ${sportConfig.name} video. Watch ${roundText} only. [PROVIDE SPECIFIC EXAMPLE: e.g., 'A 3-pointer was made at 00:15 when Austin Reaves shot from beyond the arc']. [PROVIDE CLEAR GUIDANCE: e.g., 'In Basketball, count ALL 3-point shots made by ALL players from BOTH teams']. ${isTeamSport ? 
        `CRITICAL TEAM SPORT REQUIREMENTS:
        - Count ALL instances from EVERY player on BOTH teams (e.g., Lakers AND Warriors)
        - Include the 'team' field for each player (e.g., 'Lakers', 'Warriors', 'Blue', 'Red')
        - The goal is COMPLETE TEAM TOTALS - if 5 Lakers players and 4 Warriors players performed this action, list all 9 players
        - DO NOT limit to highlights or star players - count EVERYONE
        - Use the team names visible in the video (jersey colors, scoreboard, etc.)` : 
        'Identify when each player performs [action].'} 
        Use player FULL NAMES from the video. MANDATORY: Return this EXACT JSON format: {\"players\": [{\"name\": \"Player Name\", ${isTeamSport ? '\"team\": \"Team Name\", ' : ''}\"country\": null, \"total\": 0, \"events\": [{\"timestamp\": \"MM:SS\", \"description\": \"Description\", \"value\": 1}]}]}. If you cannot detect ANY events, return {\"players\": []}. NEVER return empty text."
    }
  ]
}

CRITICAL RULES:
- DO NOT include "Score" or "Point Scoring" - we handle that separately
- ALL metrics MUST use the EXACT same standardized JSON format shown above
- Each prompt MUST start with "This is a ${sportConfig.name} video" for sport context
- Each prompt MUST include a SPECIFIC EXAMPLE from the video (timestamp + what happened)
- Each prompt MUST provide CLEAR GUIDANCE on what qualifies as this event in ${sportConfig.name}
- Use player FULL NAMES (e.g., "LeBron James", "Steph Curry") NOT "Player 1/2" or generic identifiers
${isTeamSport ? `- TEAM SPORTS: Each prompt MUST include the 'team' field for every player
- TEAM SPORTS: Instruct to identify teams from jerseys, scoreboards, or court position
- TEAM SPORTS: Count EVERY player from BOTH teams who performed the action
- TEAM SPORTS: If unsure about metrics like "Assists" that require complex judgment, choose clearer metrics instead` : ''}
- Each prompt MUST explicitly mention "${roundText}" in its instructions
- ALL TIMESTAMPS MUST BE IN MM:SS FORMAT (Minutes:Seconds) - Never use HH:MM:SS format
- Each prompt MUST include MANDATORY instructions to ALWAYS return valid JSON even if events cannot be detected
- Prompts must instruct to return {\"players\": []} when no events are detected
- Focus on metrics that are CLEARLY VISIBLE in the video - avoid complex judgment calls
- Do NOT include metrics that require off-ball tracking or are hard to see
- Return 3-5 metrics maximum
- The "total" field should sum up all event values for that player`;

  try {
    const jsonModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
        responseMimeType: "application/json",
      }
    });
    
    const response = await jsonModel.generateContent([videoFile, prompt]);
    const rawResponse = response.response.text();
    console.log(`[ASK_WHAT_TO_COUNT] Raw response:`, rawResponse.substring(0, 300));
    
    const metricsData = JSON.parse(rawResponse);
    console.log(`[ASK_WHAT_TO_COUNT] Found ${metricsData.metrics?.length || 0} metrics to count`);
    
    return metricsData;
  } catch (error) {
    console.error(`[ASK_WHAT_TO_COUNT] Error:`, error);
    // Return empty metrics on error
    return { metrics: [] };
  }
}

// Generate counts for a specific metric using Gemini
async function generateMetricCount(
  uploadedFile: any, 
  metricPrompt: string, 
  sport: string,
  teamIdentification?: { team1: string, team2: string } | null,
  language: string = 'english'
) {
  console.log(`[GENERATE_METRIC_COUNT] Generating count for metric in ${language}`);
  
  const videoFile = {
    fileData: {
      mimeType: uploadedFile.mimeType,
      fileUri: uploadedFile.uri
    }
  };
  
  const sportConfig = getSportConfig(sport);
  
  // Determine if this is a team sport
  const teamSports = ['basketball', 'soccer', 'football', 'volleyball', 'hockey', 'rugby', 'baseball', 'cricket'];
  const isTeamSport = teamSports.includes(sport.toLowerCase());
  
  // Language instruction
  const languageInstruction = language.toLowerCase() === 'arabic' 
    ? '- ALL event descriptions MUST be written in Arabic language.'
    : '- ALL event descriptions MUST be written in English language.';
  
  // FOR TEAM SPORTS: Generate metrics per team (2 separate generations)
  if (isTeamSport) {
    console.log(`[GENERATE_METRIC_COUNT] Team sport detected - generating metrics per team`);
    
    // Use provided team names or defaults
    const team1 = teamIdentification?.team1 || "Team 1";
    const team2 = teamIdentification?.team2 || "Team 2";
    console.log(`[GENERATE_METRIC_COUNT] Using teams: ${team1} vs ${team2}`);
    
    // Generate metrics for Team 1
    const team1Prompt = `${metricPrompt}

CRITICAL REQUIREMENTS:
- All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.
- This is a ${sportConfig.name} match - follow ${sportConfig.name}-specific scoring and counting rules.
${languageInstruction}
- ONLY count events for players from "${team1}" - ignore all ${team2} players
- You MUST include the "team" field set to "${team1}" for each player
- Use accurate player names from the video

MANDATORY JSON RETURN RULES:
- You MUST ALWAYS return valid JSON in the exact format specified in the prompt
- NEVER return empty text, null, or undefined
- If you cannot detect ANY events for "${team1}", return: {"players": []}
- The response MUST be parseable JSON - no explanatory text before or after the JSON`;

    // Generate metrics for Team 2
    const team2Prompt = `${metricPrompt}

CRITICAL REQUIREMENTS:
- All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.
- This is a ${sportConfig.name} match - follow ${sportConfig.name}-specific scoring and counting rules.
${languageInstruction}
- ONLY count events for players from "${team2}" - ignore all ${team1} players
- You MUST include the "team" field set to "${team2}" for each player
- Use accurate player names from the video

MANDATORY JSON RETURN RULES:
- You MUST ALWAYS return valid JSON in the exact format specified in the prompt
- NEVER return empty text, null, or undefined
- If you cannot detect ANY events for "${team2}", return: {"players": []}
- The response MUST be parseable JSON - no explanatory text before or after the JSON`;
    
    try {
      const jsonModel = genai.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
          responseMimeType: "application/json",
        }
      });
      
      // Generate both team metrics in parallel
      const [team1Response, team2Response] = await Promise.all([
        jsonModel.generateContent([videoFile, team1Prompt]),
        jsonModel.generateContent([videoFile, team2Prompt])
      ]);
      
      const team1DataStr = cleanJsonResponse(team1Response.response.text());
      const team2DataStr = cleanJsonResponse(team2Response.response.text());
      
      const team1Data = JSON.parse(team1DataStr);
      const team2Data = JSON.parse(team2DataStr);
      
      // Combine both team results
      const team1Players = team1Data?.players || [];
      const team2Players = team2Data?.players || [];
      
      const combinedResponse = {
        players: [...team1Players, ...team2Players]
      };
      
      console.log(`[GENERATE_METRIC_COUNT] ✅ Generated ${team1Players.length} players for ${team1}, ${team2Players.length} players for ${team2}`);
      return JSON.stringify(combinedResponse);
    } catch (error) {
      console.error(`[GENERATE_METRIC_COUNT] ❌ Error generating team metrics:`, error);
      return '{"players": []}';
    }
  }
  
  // FOR INDIVIDUAL SPORTS: Generate as before
  const playerInclusionRule = '- ALWAYS include BOTH players in the response, even if one has no events';
  
  // Add explicit timestamp format requirement and sport context to the prompt
  const enhancedPrompt = `${metricPrompt}

CRITICAL REQUIREMENTS:
- All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.
- This is a ${sportConfig.name} match - follow ${sportConfig.name}-specific scoring and counting rules.
${languageInstruction}
- Use accurate player names from the video.

MANDATORY JSON RETURN RULES:
- You MUST ALWAYS return valid JSON in the exact format specified in the prompt
- NEVER return empty text, null, or undefined
- If you cannot detect ANY events for this metric, return: {"players": []}
${playerInclusionRule}
- If player names are unclear, use visible identifiers (jersey colors, team names) but NEVER use generic "Player 1" or "Player 2"
- The response MUST be parseable JSON - no explanatory text before or after the JSON
- If this metric is difficult to track accurately (like Assists which require complex judgment), return {"players": []}`;
  
  try {
    const jsonModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
        responseMimeType: "application/json",
      }
    });
    
    const response = await jsonModel.generateContent([videoFile, enhancedPrompt]);
    const rawResponse = response.response.text();
    
    // Log raw response for debugging
    if (!rawResponse || rawResponse.trim() === '') {
      console.error(`[GENERATE_METRIC_COUNT] ⚠️ Gemini returned EMPTY response for this metric`);
      console.error(`[GENERATE_METRIC_COUNT] Prompt was: ${enhancedPrompt.substring(0, 200)}...`);
    }
    
    const cleanedResponse = cleanJsonResponse(rawResponse);
    
    return cleanedResponse;
  } catch (error) {
    console.error(`[GENERATE_METRIC_COUNT] Error generating metric count:`, error);
    console.error(`[GENERATE_METRIC_COUNT] Returning fallback empty structure`);
    return '{"players": []}';
  }
}

// Generate separate scores for team sports (one per team) or individual sports (one per player)
async function generateSeparateScores(
  uploadedFile: any,
  sport: string,
  roundToAnalyze: number | 'no-rounds',
  teamIdentification?: { team1: string, team2: string } | null
) {
  console.log(`[GENERATE_SEPARATE_SCORES] Starting separate score generation for ${sport}`);
  
  const videoFile = {
    fileData: {
      mimeType: uploadedFile.mimeType,
      fileUri: uploadedFile.uri
    }
  };
  
  const sportConfig = getSportConfig(sport);
  const roundText = roundToAnalyze === 'no-rounds' ? 'the entire match/game' : `round ${roundToAnalyze}`;
  
  // Determine if this is a team sport
  const teamSports = ['basketball', 'soccer', 'football', 'volleyball', 'hockey', 'rugby', 'baseball', 'cricket'];
  const isTeamSport = teamSports.includes(sport.toLowerCase());
  
  if (isTeamSport && teamIdentification) {
    // TEAM SPORTS: Generate BOTH teams' scores in a SINGLE generation (optimized)
    console.log(`[GENERATE_SEPARATE_SCORES] Team sport - generating scores for BOTH teams in single generation: ${teamIdentification.team1} vs ${teamIdentification.team2}`);
    
    const bothTeamsScorePrompt = `Watch ${roundText} of this ${sportConfig.name} match. Track EVERY scoring event for BOTH teams.

🚨 CRITICAL REQUIREMENTS - TEAM IDENTIFICATION:
1. Identify the two teams by looking at:
   - Scoreboard (team names displayed)
   - Jersey colors and team logos
   - Court/field position and bench side
   - Announcer mentions
2. Team 1 is "${teamIdentification.team1}"
3. Team 2 is "${teamIdentification.team2}"
4. For EACH scoring event, identify which team scored

🚨 SCORING REQUIREMENTS:
1. For each scoring event, identify:
   - Which team scored (${teamIdentification.team1} or ${teamIdentification.team2})
   - Which player scored (name or number)
   - How many points (2-point, 3-point, free throw, etc.)
2. In "current_score" for each event, show that team's cumulative score
3. All timestamps MUST be in MM:SS format
4. Track events chronologically as they happen in the video

MANDATORY JSON FORMAT:
{
  "teams": [
    {
      "entity_name": "${teamIdentification.team1}",
      "entity_type": "team",
      "events": [
        {
          "timestamp": "00:15",
          "player_name": "Player Name or #Number",
          "description": "2-point layup",
          "points_scored": 2,
          "current_score": "2"
        },
        {
          "timestamp": "01:45",
          "player_name": "Another Player",
          "description": "3-pointer",
          "points_scored": 3,
          "current_score": "5"
        }
      ]
    },
    {
      "entity_name": "${teamIdentification.team2}",
      "entity_type": "team",
      "events": [
        {
          "timestamp": "00:30",
          "player_name": "Player Name or #Number",
          "description": "2-point jumper",
          "points_scored": 2,
          "current_score": "2"
        },
        {
          "timestamp": "02:00",
          "player_name": "Another Player",
          "description": "Free throw",
          "points_scored": 1,
          "current_score": "3"
        }
      ]
    }
  ]
}

⚠️ CRITICAL VERIFICATION:
- Track ALL scoring events for BOTH teams
- current_score = ONLY that team's total points (NOT combined score)
- Verify each event is attributed to the correct team
- Events should be in chronological order within each team's array`;

    try {
      const jsonModel = genai.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
          responseMimeType: "application/json",
        }
      });
      
      // Generate both teams' scores in a single API call with retry logic
      const generateWithRetry = async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[GENERATE_SEPARATE_SCORES] Attempt ${attempt}/${maxRetries} - Generating scores for both teams...`);
            
            // Log the full prompt being sent
            if (attempt === 1) {
              console.log(`[GEMINI_PROMPT_SCORE] ===== FULL SCORE GENERATION PROMPT =====`);
              console.log(bothTeamsScorePrompt);
              console.log(`[GEMINI_PROMPT_SCORE] ===== END OF PROMPT =====`);
            }
            
            const response = await jsonModel.generateContent([videoFile, bothTeamsScorePrompt]);
            const text = response.response.text();
            
            if (!text || text.length === 0) {
              console.log(`[GENERATE_SEPARATE_SCORES] Attempt ${attempt}: Empty response, retrying...`);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
            }
            
            console.log(`[GENERATE_SEPARATE_SCORES] Response length: ${text.length} chars`);
            
            // Log the full JSON response
            console.log(`[GEMINI_RESPONSE_SCORE] ===== FULL SCORE JSON RESPONSE =====`);
            console.log(text);
            console.log(`[GEMINI_RESPONSE_SCORE] ===== END OF RESPONSE =====`);
            
            const parsedData = JSON.parse(text);
            
            // Validate that we got both teams
            if (!parsedData.teams || parsedData.teams.length !== 2) {
              console.error(`[GENERATE_SEPARATE_SCORES] Invalid response structure - expected 2 teams, got ${parsedData.teams?.length || 0}`);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
              }
            }
            
            return parsedData;
          } catch (error) {
            console.error(`[GENERATE_SEPARATE_SCORES] Attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              throw error;
            }
          }
        }
        throw new Error(`Failed to generate scores for both teams after ${maxRetries} attempts`);
      };
      
      // Single generation for both teams
      const bothTeamsData = await generateWithRetry();
      
      console.log(`[GENERATE_SEPARATE_SCORES] Team 1 (${bothTeamsData.teams[0].entity_name}) events: ${bothTeamsData.teams[0].events?.length || 0}`);
      console.log(`[GENERATE_SEPARATE_SCORES] Team 2 (${bothTeamsData.teams[1].entity_name}) events: ${bothTeamsData.teams[1].events?.length || 0}`);
      
      // Return both team scores
      return {
        scores: bothTeamsData.teams,
        type: 'team'
      };
    } catch (error) {
      console.error(`[GENERATE_SEPARATE_SCORES] Error generating team scores:`, error);
      return {
        scores: [
          { entity_name: teamIdentification.team1, entity_type: "team", events: [] },
          { entity_name: teamIdentification.team2, entity_type: "team", events: [] }
        ],
        type: 'team'
      };
    }
  } else {
    // INDIVIDUAL SPORTS: Generate one score object per player
    console.log(`[GENERATE_SEPARATE_SCORES] Individual sport - generating scores per player`);
    
    // First, identify the two players
    const playerIdPrompt = `Watch this ${sportConfig.name} match and identify the two players/competitors. Return their names in JSON format:
{"player1": "Player Name 1", "player2": "Player Name 2"}

Look for names on screen, scoreboards, or mentioned by commentators.`;

    try {
      const jsonModel = genai.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        }
      });
      
      const playerResponse = await jsonModel.generateContent([videoFile, playerIdPrompt]);
      const players = JSON.parse(playerResponse.response.text());
      
      console.log(`[GENERATE_SEPARATE_SCORES] Players identified: ${players.player1} vs ${players.player2}`);
      
      // Generate score progression for each player
      const player1ScorePrompt = `Watch ${roundText} of this ${sportConfig.name} match. Track the score progression for ${players.player1} ONLY.

🚨 CRITICAL REQUIREMENTS:
1. Track every point/score gained by ${players.player1}
2. In "current_score", show ONLY ${players.player1}'s score using the sport's native scoring system
3. Use the sport's official notation (e.g., tennis: "15", "30", "40" | basketball: "2", "5", "7" | table tennis: "1", "3", "5")
4. All timestamps MUST be in MM:SS format
5. "side" field MUST be "blue" for ${players.player1}
6. "country" field: Extract the 3-letter country code (like "USA", "ITA", "GER") from scoreboards, player info, or flags visible in the video. If not visible, use null.

MANDATORY JSON FORMAT:
{
  "entity_name": "${players.player1}",
  "entity_type": "player",
  "country": "ITA",
  "side": "blue",
  "events": [
    {
      "timestamp": "01:23",
      "description": "Point scored",
      "points_scored": 1,
      "current_score": "[PLAYER_1_SCORE_ONLY]"
    },
    {
      "timestamp": "02:10",
      "description": "Another point",
      "points_scored": 1,
      "current_score": "[UPDATED_PLAYER_1_SCORE]"
    }
  ]
}

⚠️ CRITICAL: current_score must contain ONLY ${players.player1}'s individual score in sport-specific notation, NOT a combined score like "${players.player1} vs ${players.player2}"`;

      const player2ScorePrompt = `Watch ${roundText} of this ${sportConfig.name} match. Track the score progression for ${players.player2} ONLY.

🚨 CRITICAL REQUIREMENTS:
1. Track every point/score gained by ${players.player2}
2. In "current_score", show ONLY ${players.player2}'s score using the sport's native scoring system
3. Use the sport's official notation (e.g., tennis: "15", "30", "40" | basketball: "2", "5", "7" | table tennis: "1", "3", "5")
4. All timestamps MUST be in MM:SS format
5. "side" field MUST be "red" for ${players.player2}
6. "country" field: Extract the 3-letter country code (like "USA", "ITA", "GER") from scoreboards, player info, or flags visible in the video. If not visible, use null.

MANDATORY JSON FORMAT:
{
  "entity_name": "${players.player2}",
  "entity_type": "player",
  "country": "USA",
  "side": "red",
  "events": [
    {
      "timestamp": "02:45",
      "description": "Point scored",
      "points_scored": 1,
      "current_score": "[PLAYER_2_SCORE_ONLY]"
    },
    {
      "timestamp": "03:20",
      "description": "Another point",
      "points_scored": 1,
      "current_score": "[UPDATED_PLAYER_2_SCORE]"
    }
  ]
}

⚠️ CRITICAL: current_score must contain ONLY ${players.player2}'s individual score in sport-specific notation, NOT a combined score like "${players.player1} vs ${players.player2}"`;

      // Generate both player scores in parallel
      const [player1Response, player2Response] = await Promise.all([
        jsonModel.generateContent([videoFile, player1ScorePrompt]),
        jsonModel.generateContent([videoFile, player2ScorePrompt])
      ]);
      
      const player1Score = JSON.parse(player1Response.response.text());
      const player2Score = JSON.parse(player2Response.response.text());
      
      console.log(`[GENERATE_SEPARATE_SCORES] Player 1 (${players.player1}) events: ${player1Score.events?.length || 0}`);
      console.log(`[GENERATE_SEPARATE_SCORES] Player 2 (${players.player2}) events: ${player2Score.events?.length || 0}`);
      
      // Return both player scores
      return {
        scores: [player1Score, player2Score],
        type: 'individual'
      };
    } catch (error) {
      console.error(`[GENERATE_SEPARATE_SCORES] Error generating player scores:`, error);
      return {
        scores: [
          { entity_name: "Player 1", entity_type: "player", country: null, events: [] },
          { entity_name: "Player 2", entity_type: "player", country: null, events: [] }
        ],
        type: 'individual'
      };
    }
  }
}

// Process video with Gemini using Files API (memory-efficient approach)
export async function processVideoGemini(videoFilePath: string, roundToAnalyze: number | 'no-rounds', sport: string = 'taekwondo', language: string = 'english') {
  console.log(`[PROCESS_VIDEO_GEMINI] Starting video analysis for round ${roundToAnalyze}`);
  console.log(`[PROCESS_VIDEO_GEMINI] Video file: ${videoFilePath}`);
  console.log(`[PROCESS_VIDEO_GEMINI] Sport: ${sport}`);
  console.log(`[PROCESS_VIDEO_GEMINI] Language: ${language}`);
  
  let uploadedFile: any = null;
  
  try {
    // Upload file to Gemini without loading into memory
    console.log(`[PROCESS_VIDEO_GEMINI] Uploading video file to Gemini...`);
    uploadedFile = await uploadFileToGemini(videoFilePath);
    
    console.log(`[PROCESS_VIDEO_GEMINI] Video ready for analysis: ${uploadedFile.uri}`);
    
    const roundText = roundToAnalyze === 'no-rounds' ? 'the entire match/game' : `round ${roundToAnalyze}`;
    const normalizedSport = sport.toLowerCase().replace(/\s+/g, '_');
    const isTaekwondo = normalizedSport === 'taekwondo';
    
    console.log(`[PROCESS_VIDEO_GEMINI] Is Taekwondo: ${isTaekwondo}`);
    
    // Generate sport-specific prompts
    const { promptMatch, promptScore, promptActions, promptActionCount, promptViolations } = generateSportSpecificPrompts(sport, roundToAnalyze, language);
    
    // Create model instances
    const textModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
      }
    });

    const jsonModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro", 
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
        responseMimeType: "application/json",
      }
    });
    
    const videoFileRef = {
      fileData: {
        mimeType: uploadedFile.mimeType,
        fileUri: uploadedFile.uri
      }
    };
    
    let matchAnalysis, scoreAnalysis, kickCountAnalysis, yellowCardAnalysis;
    let dynamicMetrics: any[] = [];
    
    if (isTaekwondo) {
      // For Taekwondo: Use existing flow with kicks and warnings
      console.log(`[PROCESS_VIDEO_GEMINI] Using Taekwondo-specific analysis (kicks + warnings)`);
      
      const [responseMatch, responseScore, responsePunch, responseKickNo, responseYellowCards] = await Promise.all([
        textModel.generateContent([videoFileRef, promptMatch]),
        jsonModel.generateContent([videoFileRef, promptScore]),
        jsonModel.generateContent([videoFileRef, promptActions]),
        jsonModel.generateContent([videoFileRef, promptActionCount]),
        jsonModel.generateContent([videoFileRef, promptViolations])
      ]);

      console.log(`[PROCESS_VIDEO_GEMINI] All 5 Taekwondo analysis calls completed`);

      // Extract and clean responses
      matchAnalysis = cleanMarkdownFormatting(responseMatch.response.text());
      const rawScoreResponse = responseScore.response.text();
      const rawPunchResponse = responsePunch.response.text();
      const rawKickCountResponse = responseKickNo.response.text();
      const rawYellowCardResponse = responseYellowCards.response.text();

      scoreAnalysis = cleanJsonResponse(rawScoreResponse);
      const punchAnalysis = cleanJsonResponse(rawPunchResponse);
      kickCountAnalysis = cleanJsonResponse(rawKickCountResponse);
      yellowCardAnalysis = cleanJsonResponse(rawYellowCardResponse);

      // Return traditional format for Taekwondo
      return [
        null,
        matchAnalysis,
        scoreAnalysis,
        punchAnalysis,
        kickCountAnalysis,
        yellowCardAnalysis
      ];
      
    } else {
      // For other sports: Use dynamic metric generation
      console.log(`[PROCESS_VIDEO_GEMINI] Using dynamic metric generation for ${sport}`);
      
      const sportConfig = getSportConfig(sport);
      
      // Step 1: Create generic Score prompt (works for all sports)
      const scorePrompt = `This is a ${sportConfig.name} video. ${roundToAnalyze !== 'no-rounds' ? `Watch round ${roundToAnalyze} only.` : 'Watch the entire match/game only.'}

Analyze the score progression throughout the video. Focus on the scoreboard for accuracy and listen to commentators for confirmation. Include timestamps of when scoring events happened and what the score is after each event.

Use player FULL NAMES from the video. Include country if displayed.

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Full Player Name",
      "country": "Country name if visible",
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Score description",
          "current_score": "X"
        }
      ]
    }
  ]
}

CRITICAL REQUIREMENTS:
- All timestamps MUST be in MM:SS format (Minutes:Seconds). Never use HH:MM:SS format.
- The current_score field should show the score AFTER this scoring event
- If no scoring events are visible, return empty events arrays but ALWAYS include both players
- NEVER return empty text - ALWAYS return this JSON structure`;
      
      // Step 2: Identify teams ONCE for team sports (shared across all metrics)
      const teamSports = ['basketball', 'soccer', 'football', 'volleyball', 'hockey', 'rugby', 'baseball', 'cricket'];
      const isTeamSport = teamSports.includes(sport.toLowerCase());
      
      let teamIdentification: { team1: string, team2: string } | null = null;
      
      if (isTeamSport) {
        console.log(`[PROCESS_VIDEO_GEMINI] Team sport - identifying teams once for all metrics...`);
        const teamIdPrompt = `Watch this ${sport} video and identify the two teams playing. Return only their names in JSON format:
{"team1": "Team Name 1", "team2": "Team Name 2"}

Look for team names on jerseys, scoreboards, or court/field markings. If team names are not visible, use colors (e.g., "Home Team", "Away Team").`;
        
        try {
          const teamResponse = await jsonModel.generateContent([videoFileRef, teamIdPrompt]);
          teamIdentification = JSON.parse(teamResponse.response.text());
          console.log(`[PROCESS_VIDEO_GEMINI] Teams: ${teamIdentification?.team1} vs ${teamIdentification?.team2}`);
        } catch (error) {
          console.log(`[PROCESS_VIDEO_GEMINI] Team ID failed, using defaults`);
        }
      }
      
      // Step 3: Ask Gemini what to count (EXCLUDING Score - we have our own)
      const metricsPromise = askGeminiWhatToCount(uploadedFile, sport, roundText, language);
      
      // Step 4: Generate Score, Match Analysis, and get metrics data in parallel
      console.log(`[PROCESS_VIDEO_GEMINI] Starting parallel: Score + Match + asking Gemini what to count...`);
      
      const [metricsData, responseScore, responseMatch] = await Promise.all([
        metricsPromise,
        jsonModel.generateContent([videoFileRef, scorePrompt]),
        textModel.generateContent([videoFileRef, promptMatch])
      ]);
      
      console.log(`[PROCESS_VIDEO_GEMINI] Gemini suggested ${metricsData.metrics?.length || 0} dynamic metrics`);
      
      matchAnalysis = cleanMarkdownFormatting(responseMatch.response.text());
      scoreAnalysis = cleanJsonResponse(responseScore.response.text());
      console.log(`[PROCESS_VIDEO_GEMINI] Match and Score analysis complete`);
      
      // Step 5: Generate all dynamic metrics in parallel (with shared team identification)
      if (metricsData.metrics && metricsData.metrics.length > 0) {
        console.log(`[PROCESS_VIDEO_GEMINI] Generating ${metricsData.metrics.length} dynamic metrics in parallel...`);
        
        const metricPromises = metricsData.metrics.map((metric: any) => 
          generateMetricCount(uploadedFile, metric.prompt, sport, teamIdentification, language)
        );
        
        const metricResults = await Promise.all(metricPromises);
        
        // Build dynamic metrics array with titles and parsed data
        dynamicMetrics = metricsData.metrics.map((metric: any, index: number) => {
          try {
            let parsedData = JSON.parse(metricResults[index]);
            
            // Normalize the data format to always have {players: [...]}
            if (Array.isArray(parsedData)) {
              // Case 1: [{players: [...]}] - extract the first element
              if (parsedData.length > 0 && parsedData[0].players) {
                parsedData = parsedData[0];
              }
              // Case 2: [{name: "...", total: ..., events: [...]}] - wrap in players
              else if (parsedData.length > 0 && parsedData[0].name) {
                parsedData = { players: parsedData };
              }
              // Case 3: Empty array
              else {
                parsedData = { players: [] };
              }
            }
            // Case 4: Already correct format {players: [...]}
            else if (!parsedData.players) {
              parsedData = { players: [] };
            }
            
            // Calculate totals from events if total is missing or zero
            if (parsedData.players && Array.isArray(parsedData.players)) {
              parsedData.players = parsedData.players.map((player: any) => {
                // Only calculate if total is missing or zero and events exist
                if ((!player.total || player.total === 0) && player.events && Array.isArray(player.events) && player.events.length > 0) {
                  const calculatedTotal = player.events.reduce((sum: number, event: any) => {
                    // For count metrics, sum the value field
                    if (event.value !== undefined && event.value !== null) {
                      return sum + (typeof event.value === 'number' ? event.value : parseInt(event.value) || 0);
                    }
                    return sum;
                  }, 0);
                  
                  console.log(`[PROCESS_VIDEO_GEMINI] Calculated total for ${player.name}: ${calculatedTotal} from ${player.events.length} events`);
                  
                  return {
                    ...player,
                    total: calculatedTotal
                  };
                }
                return player;
              });
            }
            
            console.log(`[PROCESS_VIDEO_GEMINI] Normalized metric "${metric.title}":`, JSON.stringify(parsedData).substring(0, 200));
            
            return {
              title: metric.title,
              data: parsedData
            };
          } catch (e) {
            console.error(`Failed to parse metric data for "${metric.title}":`, e);
            return {
              title: metric.title,
              data: { players: [] }
            };
          }
        });
        
        console.log(`[PROCESS_VIDEO_GEMINI] Generated ${dynamicMetrics.length} dynamic metrics`);
      }
      
      // Return format for dynamic sports (Score is separate, not in dynamic_metrics)
      return [
        null,
        matchAnalysis,
        scoreAnalysis, // Score goes here (for UI above video)
        null, // No punch analysis for non-taekwondo
        null, // No kick count for non-taekwondo
        null, // No yellow cards for non-taekwondo
        dynamicMetrics // Dynamic metrics (Winners, Errors, etc.)
      ];
    }

  } catch (error) {
    console.error(`[PROCESS_VIDEO_GEMINI] Error:`, error);
    throw error;
  } finally {
    // Clean up uploaded file from Gemini
    if (uploadedFile) {
      try {
        console.log(`[PROCESS_VIDEO_GEMINI] Cleaning up uploaded file: ${uploadedFile.uri}`);
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
        }
        const fileManager = new GoogleAIFileManager(apiKey);
        await fileManager.deleteFile(uploadedFile.name);
        console.log(`[PROCESS_VIDEO_GEMINI] Uploaded file cleaned up successfully`);
      } catch (cleanupError) {
        console.warn(`[PROCESS_VIDEO_GEMINI] Failed to cleanup uploaded file:`, cleanupError);
      }
    }
  }
}

// New function to generate advice for each player
export async function generatePlayerAdvice(videoFilePath: string, roundToAnalyze: number) {
  console.log(`[GENERATE_PLAYER_ADVICE] Starting advice generation for round ${roundToAnalyze}`);
  console.log(`[GENERATE_PLAYER_ADVICE] Video file: ${videoFilePath}`);
  
  let uploadedFile = null;
  
  try {
    // Upload file to Gemini without loading into memory
    console.log(`[GENERATE_PLAYER_ADVICE] Uploading video file to Gemini...`);
    uploadedFile = await uploadFileToGemini(videoFilePath);
    
    const videoFile = {
      fileData: {
        mimeType: uploadedFile.mimeType,
        fileUri: uploadedFile.uri
      }
    };
    
    console.log(`[GENERATE_PLAYER_ADVICE] Video ready for advice analysis: ${uploadedFile.uri}`);
    
    // Prompt for player advice generation
    const advicePrompt = `Analyze round ${roundToAnalyze} of this combat sports match and provide detailed improvement advice for each player. Focus on tactical, technical, and mental aspects.

IMPORTANT: Return ONLY a valid JSON response in the following structure:

{
  "players": [
    {
      "name": "Player 1",
      "color": "Red/Blue",
      "tactical_advice": {
        "issues": ["List of tactical mistakes or weaknesses observed"],
        "improvements": ["Specific tactical recommendations for improvement"]
      },
      "technical_advice": {
        "issues": ["List of technical mistakes in technique, form, or execution"],
        "improvements": ["Specific technical skills to work on"]
      },
      "mental_advice": {
        "issues": ["Mental/psychological issues observed (hesitation, aggression, focus)"],
        "improvements": ["Mental training and mindset recommendations"]
      }
    },
    {
      "name": "Player 2", 
      "color": "Red/Blue",
      "tactical_advice": {
        "issues": ["List of tactical mistakes or weaknesses observed"],
        "improvements": ["Specific tactical recommendations for improvement"]
      },
      "technical_advice": {
        "issues": ["List of technical mistakes in technique, form, or execution"],
        "improvements": ["Specific technical skills to work on"]
      },
      "mental_advice": {
        "issues": ["Mental/psychological issues observed (hesitation, aggression, focus)"],
        "improvements": ["Mental training and mindset recommendations"]
      }
    }
  ],
  "general_observations": "Overall observations about the match and areas both players could improve on"
}

FOCUS ON:
- Tactical errors: Poor timing, distance management, strategy choices, defensive lapses
- Technical flaws: Incorrect form, missed opportunities, execution problems
- Mental aspects: Visible hesitation, over-aggression, loss of focus, confidence issues

Watch the entire round carefully and provide actionable, specific advice that coaches could use to help these athletes improve.`;

    console.log(`[GENERATE_PLAYER_ADVICE] Sending advice prompt to Gemini...`);
    
    const result = await model.generateContent([
      videoFile,
      advicePrompt
    ]);

    if (!result.response) {
      throw new Error('No response received from Gemini');
    }

    const rawAdviceResponse = result.response.text();
    console.log(`[GENERATE_PLAYER_ADVICE] Raw response length: ${rawAdviceResponse?.length || 0}`);
    
    if (!rawAdviceResponse || rawAdviceResponse.trim() === '') {
      throw new Error('Empty response received from Gemini');
    }

    // Clean the JSON response
    const adviceAnalysis = cleanJsonResponse(rawAdviceResponse);
    console.log(`[GENERATE_PLAYER_ADVICE] Advice generation completed successfully`);

    return {
      advice_analysis: adviceAnalysis,
      roundAnalyzed: roundToAnalyze,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[GENERATE_PLAYER_ADVICE] Error:`, error);
    throw error;
  } finally {
    // Clean up uploaded file from Gemini
    if (uploadedFile) {
      try {
        console.log(`[GENERATE_PLAYER_ADVICE] Cleaning up uploaded file: ${uploadedFile.uri}`);
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
        }
        const fileManager = new GoogleAIFileManager(apiKey);
        await fileManager.deleteFile(uploadedFile.name);
        console.log(`[GENERATE_PLAYER_ADVICE] Uploaded file cleaned up successfully`);
      } catch (cleanupError) {
        console.warn(`[GENERATE_PLAYER_ADVICE] Failed to cleanup uploaded file:`, cleanupError);
      }
    }
  }
}

// Comprehensive analysis function that runs all analyses including advice in parallel
export async function analyzeVideoComprehensive(
  videoFilePath: string,
  filename: string,
  roundToAnalyze: number | 'no-rounds',
  language: string = 'english',
  sport: string = 'taekwondo'
) {
  console.log(`[ANALYZE_COMPREHENSIVE] Starting comprehensive video analysis for ${filename} at ${videoFilePath}`);
  console.log(`[ANALYZE_COMPREHENSIVE] Round: ${roundToAnalyze}, Sport: ${sport}`);
  
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file not found: ${videoFilePath}`);
  }
  
  const fileStats = fs.statSync(videoFilePath);
  console.log(`[ANALYZE_COMPREHENSIVE] Video file size: ${fileStats.size} bytes`);
  
  let uploadedFile: any = null;
  
  try {
    // Upload file to Gemini once and reuse for all analyses
    console.log(`[ANALYZE_COMPREHENSIVE] Uploading video file to Gemini...`);
    uploadedFile = await uploadFileToGemini(videoFilePath);
    
    const videoFile = {
      fileData: {
        mimeType: uploadedFile.mimeType,
        fileUri: uploadedFile.uri
      }
    };
    
    console.log(`[ANALYZE_COMPREHENSIVE] Video ready for analysis: ${uploadedFile.uri}`);
    
    const roundText = roundToAnalyze === 'no-rounds' ? 'the entire match/game' : `round ${roundToAnalyze}`;
    const normalizedSport = sport.toLowerCase().replace(/\s+/g, '_');
    const isTaekwondo = normalizedSport === 'taekwondo';
    
    console.log(`[ANALYZE_COMPREHENSIVE] Is Taekwondo: ${isTaekwondo}`);
    console.log(`[ANALYZE_COMPREHENSIVE] Starting all analyses in parallel...`);

    // Generate sport-specific prompts based on the sport
    const sportPrompts = generateSportSpecificPrompts(sport, roundToAnalyze, language);

    // Use sport-specific prompts
    const promptMatch = sportPrompts.promptMatch;
    const promptScore = sportPrompts.promptScore;

    // Create sport-specific advice prompt
    const sportConfig = getSportConfig(sport);
    const languageInstruction = language === 'arabic' 
      ? `Write your response in Arabic (العربية). Use proper Arabic terminology for ${sportConfig.name.toLowerCase()} techniques and match analysis.`
      : `Write your response in English.`;
    
    const promptAdvice = `Analyze ${roundText} of this ${sportConfig.name.toLowerCase()} match and provide detailed improvement advice for each player. Focus on tactical, technical, and mental aspects.

${languageInstruction}

IMPORTANT: Return ONLY a valid JSON response. Do NOT include any introductory text, explanations, or phrases before the JSON. Start directly with the JSON object in the following structure:

{
  "players": [
    {
      "name": "Player 1",
      "color": "Red/Blue",
      "tactical_advice": {
        "issues": ["List of tactical mistakes or weaknesses observed"],
        "improvements": ["Specific tactical recommendations for improvement"]
      },
      "technical_advice": {
        "issues": ["List of technical mistakes in technique, form, or execution"],
        "improvements": ["Specific technical skills to work on"]
      },
      "mental_advice": {
        "issues": ["Mental/psychological issues observed (hesitation, aggression, focus)"],
        "improvements": ["Mental training and mindset recommendations"]
      }
    },
    {
      "name": "Player 2", 
      "color": "Red/Blue",
      "tactical_advice": {
        "issues": ["List of tactical mistakes or weaknesses observed"],
        "improvements": ["Specific tactical recommendations for improvement"]
      },
      "technical_advice": {
        "issues": ["List of technical mistakes in technique, form, or execution"],
        "improvements": ["Specific technical skills to work on"]
      },
      "mental_advice": {
        "issues": ["Mental/psychological issues observed (hesitation, aggression, focus)"],
        "improvements": ["Mental training and mindset recommendations"]
      }
    }
  ],
  "general_observations": "Overall observations about the match and areas both players could improve on"
}

FOCUS ON:
- Tactical positioning, timing, distance management, strategy
- Technical execution of ${sportConfig.analysisTerms.action}, blocks, movement, balance
- Mental aspects like focus, confidence, aggression levels, composure
- Provide specific, actionable advice for each area

Be detailed and specific in your observations and recommendations.`;

    let responseMatch, responseScore, responsePunch, responseKickNo, responseYellowCards, responseAdvice;
    let dynamicMetrics: any[] = [];

    if (isTaekwondo) {
      // For Taekwondo: Use existing flow with kicks and warnings
      console.log(`[ANALYZE_COMPREHENSIVE] Using Taekwondo-specific analysis (kicks + warnings)`);
      
      const promptPunch = sportPrompts.promptActions;
      const promptKickNo = sportPrompts.promptActionCount;
      const promptYellowCards = sportPrompts.promptViolations;
      
      // Run all analyses in parallel using Promise.allSettled for better error handling
      const analysisPromises = [
        model.generateContent([videoFile, promptMatch]),      // 0: Match Analysis
        model.generateContent([videoFile, promptScore]),      // 1: Score Analysis  
        model.generateContent([videoFile, promptPunch]),      // 2: Punch Analysis
        model.generateContent([videoFile, promptKickNo]),     // 3: Kick Count
        model.generateContent([videoFile, promptYellowCards]), // 4: Yellow Cards
        model.generateContent([videoFile, promptAdvice])      // 5: Player Advice
      ];

      console.log(`[ANALYZE_COMPREHENSIVE] Making 6 parallel analysis calls...`);
      const results = await Promise.allSettled(analysisPromises);
      console.log(`[ANALYZE_COMPREHENSIVE] All 6 analysis calls completed`);

      // Process results with robust error handling for each analysis type
      const responses = results.map((result, index) => {
        const analysisNames = ['Match', 'Score', 'Punch', 'Kick Count', 'Yellow Cards', 'Advice'];
        if (result.status === 'fulfilled') {
          const text = result.value.response.text();
          console.log(`[ANALYZE_COMPREHENSIVE] ✅ ${analysisNames[index]} Response SUCCESS - Length: ${text.length}`);
          console.log(`[ANALYZE_COMPREHENSIVE] Raw ${analysisNames[index]} Response Preview:`, text.substring(0, 300) + (text.length > 300 ? '...' : ''));
          
          // Extra logging for kicks and yellow cards (truncated to avoid log bloat)
          if (index === 3 || index === 4) {
            const maxLogLength = 2000; // Limit log size
            const truncatedText = text.length > maxLogLength 
              ? text.substring(0, maxLogLength) + `... (truncated ${text.length - maxLogLength} chars)` 
              : text;
            console.log(`[ANALYZE_COMPREHENSIVE] ${analysisNames[index]} Response (detailed):`, truncatedText);
          }
          
          return text;
        } else {
          console.error(`[ANALYZE_COMPREHENSIVE] ❌ ${analysisNames[index]} analysis FAILED:`, result.reason);
          // Log error details safely without JSON.stringify
          console.error(`[ANALYZE_COMPREHENSIVE] ${analysisNames[index]} Error message:`, 
            result.reason instanceof Error ? result.reason.message : String(result.reason));
          // Return safe defaults for failed analyses
          if (index === 0) return null; // Match analysis (required)
          if (index === 5) return JSON.stringify({ // Advice (safe default)
            players: [],
            general_observations: "Player advice generation failed, but match analysis completed successfully."
          });
          return JSON.stringify({ players: [] }); // Other analyses (safe default)
        }
      });

      [responseMatch, responseScore, responsePunch, responseKickNo, responseYellowCards, responseAdvice] = responses;
      
      // Log what we're about to return
      console.log(`[ANALYZE_COMPREHENSIVE] Final data structure:`);
      console.log(`  - Match: ${responseMatch ? 'Present' : 'Missing'}`);
      console.log(`  - Score: ${responseScore ? 'Present' : 'Missing'}`);
      console.log(`  - Punch: ${responsePunch ? 'Present' : 'Missing'}`);
      console.log(`  - Kick Count: ${responseKickNo ? 'Present' : 'Missing'}`);
      console.log(`  - Yellow Cards: ${responseYellowCards ? 'Present' : 'Missing'}`);
      console.log(`  - Advice: ${responseAdvice ? 'Present' : 'Missing'}`);
      
    } else {
      // For other sports: Use dynamic metric generation
      console.log(`[ANALYZE_COMPREHENSIVE] Using dynamic metric generation for ${sport}`);
      
      const sportConfig = getSportConfig(sport);
      
      // Step 1: Identify teams ONCE for team sports (shared across all metrics)
      const teamSports = ['basketball', 'soccer', 'football', 'volleyball', 'hockey', 'rugby', 'baseball', 'cricket'];
      const isTeamSport = teamSports.includes(sport.toLowerCase());
      
      let teamIdentification: { team1: string, team2: string } | null = null;
      
      if (isTeamSport) {
        console.log(`[ANALYZE_COMPREHENSIVE] Team sport - identifying teams once for all metrics...`);
        const teamIdPrompt = `Watch this ${sport} video and identify the two teams playing. Return only their names in JSON format:
{"team1": "Team Name 1", "team2": "Team Name 2"}

Look for team names on jerseys, scoreboards, or court/field markings. If team names are not visible, use colors (e.g., "Home Team", "Away Team").`;
        
        try {
          const model = genai.getGenerativeModel({
            model: "gemini-2.5-pro",
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
            }
          });
          const teamResponse = await model.generateContent([videoFile, teamIdPrompt]);
          teamIdentification = JSON.parse(teamResponse.response.text());
          console.log(`[ANALYZE_COMPREHENSIVE] Teams: ${teamIdentification?.team1} vs ${teamIdentification?.team2}`);
        } catch (error) {
          console.log(`[ANALYZE_COMPREHENSIVE] Team ID failed, using defaults`);
        }
      }
      
      // Step 2: Ask Gemini what to count (EXCLUDING Score - we have our own)
      const metricsPromise = askGeminiWhatToCount(uploadedFile, sport, roundText, language);
      
      // Step 3: Generate SEPARATE Scores (2 generations), Match Analysis, Advice, and get metrics data in parallel
      console.log(`[ANALYZE_COMPREHENSIVE] Starting parallel: Separate Score generations + Match + Advice + asking Gemini what to count...`);
      
      // Use the new separate score generation function
      const scoreGenerationPromise = generateSeparateScores(uploadedFile, sport, roundToAnalyze, teamIdentification);
      
      const model2 = genai.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          temperature: 0.3,
        }
      });
      
      // BATCH 1: Get metrics definition first (needed for later)
      const metricsData = await metricsPromise.then(
        result => ({ status: 'fulfilled' as const, value: result }),
        reason => ({ status: 'rejected' as const, reason })
      );
      
      // Add small delay between batches to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // BATCH 2: Score generations (2 parallel requests)
      let separateScoresResult;
      try {
        const scoreData = await scoreGenerationPromise;
        console.log(`[ANALYZE_COMPREHENSIVE] Score generation completed successfully`);
        console.log(`[ANALYZE_COMPREHENSIVE] Score data type: ${scoreData?.type}, scores count: ${scoreData?.scores?.length}`);
        separateScoresResult = { status: 'fulfilled' as const, value: scoreData };
      } catch (error) {
        console.error(`[ANALYZE_COMPREHENSIVE] Score generation failed completely:`, error);
        separateScoresResult = { status: 'rejected' as const, reason: error };
      }
      
      // Add small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // BATCH 3: Match and Advice analysis (2 parallel requests)
      const [matchResult, adviceResult] = await Promise.allSettled([
        model2.generateContent([videoFile, promptMatch]),
        model2.generateContent([videoFile, promptAdvice])
      ]);
      
      console.log(`[ANALYZE_COMPREHENSIVE] Gemini suggested ${metricsData.status === 'fulfilled' ? metricsData.value.metrics?.length || 0 : 0} dynamic metrics`);
      
      // Process Separate Score results
      responseScore = null;  // Assign to outer variable, don't redeclare
      if (separateScoresResult.status === 'fulfilled') {
        // Convert separate scores to the expected format for backwards compatibility
        const separateScores = separateScoresResult.value;
        console.log(`[ANALYZE_COMPREHENSIVE] Separate score analysis complete - Type: ${separateScores.type}`);
        
        // Create a combined response that maintains backwards compatibility but includes separate tracking
        responseScore = JSON.stringify({
          separate_scores: separateScores.scores,
          score_type: separateScores.type,
          // For backwards compatibility, also include a players array
          players: separateScores.scores.map((scoreEntity: any) => ({
            name: scoreEntity.entity_name,
            team: scoreEntity.entity_type === 'team' ? scoreEntity.entity_name : undefined,
            country: scoreEntity.country || null,
            events: scoreEntity.events?.map((event: any) => ({
              timestamp: event.timestamp,
              description: event.description || `${event.player_name ? event.player_name + ': ' : ''}${event.description}`,
              current_score: event.current_score
            })) || []
          }))
        });
        console.log(`[ANALYZE_COMPREHENSIVE] Score analysis formatted for frontend`);
        console.log(`[ANALYZE_COMPREHENSIVE] responseScore length: ${responseScore?.length || 0} chars`);
        console.log(`[ANALYZE_COMPREHENSIVE] responseScore preview: ${responseScore?.substring(0, 200)}...`);
      } else {
        console.error(`[ANALYZE_COMPREHENSIVE] Score analysis failed:`, separateScoresResult.reason);
        responseScore = null;
      }
      
      // Process Match result
      if (matchResult.status === 'fulfilled') {
        responseMatch = matchResult.value.response.text();
        console.log(`[ANALYZE_COMPREHENSIVE] Match Analysis complete:`, responseMatch.substring(0, 200) + '...');
      } else {
        console.error(`[ANALYZE_COMPREHENSIVE] Match analysis failed:`, matchResult.reason);
        responseMatch = null;
      }
      
      // Process Advice result
      if (adviceResult.status === 'fulfilled') {
        responseAdvice = adviceResult.value.response.text();
        console.log(`[ANALYZE_COMPREHENSIVE] Advice complete:`, responseAdvice.substring(0, 200) + '...');
      } else {
        console.error(`[ANALYZE_COMPREHENSIVE] Advice failed:`, adviceResult.reason);
        responseAdvice = JSON.stringify({ players: [], general_observations: "Player advice generation failed." });
      }
      
      responsePunch = null;
      responseKickNo = null;
      responseYellowCards = null;
      
      // Step 4: Generate all dynamic metrics in BATCHES to avoid overload
      let metricResults: string[] = [];
      if (metricsData.status === 'fulfilled' && metricsData.value.metrics && metricsData.value.metrics.length > 0) {
        console.log(`[ANALYZE_COMPREHENSIVE] Generating ${metricsData.value.metrics.length} dynamic metrics in batches of 2...`);
        
        const batchSize = 2;
        const metrics = metricsData.value.metrics;
        
        for (let i = 0; i < metrics.length; i += batchSize) {
          const batch = metrics.slice(i, i + batchSize);
          console.log(`[ANALYZE_COMPREHENSIVE] Processing metric batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(metrics.length/batchSize)}`);
          
          const batchPromises = batch.map((metric: any) => 
            generateMetricCount(uploadedFile, metric.prompt, sport, teamIdentification, language)
          );
          
          const batchResults = await Promise.all(batchPromises);
          metricResults.push(...batchResults);
          
          // Add delay between batches (except for last batch)
          if (i + batchSize < metrics.length) {
            console.log(`[ANALYZE_COMPREHENSIVE] Waiting 1 second before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Build dynamic metrics array with titles and parsed data
        dynamicMetrics = metricsData.value.metrics.map((metric: any, index: number) => {
          try {
            let parsedData = JSON.parse(metricResults[index]);
            
            // Normalize the data format to always have {players: [...]}
            if (Array.isArray(parsedData)) {
              // Case 1: [{players: [...]}] - extract the first element
              if (parsedData.length > 0 && parsedData[0].players) {
                parsedData = parsedData[0];
              }
              // Case 2: [{name: "...", total: ..., events: [...]}] - wrap in players
              else if (parsedData.length > 0 && parsedData[0].name) {
                parsedData = { players: parsedData };
              }
              // Case 3: Empty array
              else {
                parsedData = { players: [] };
              }
            }
            // Case 4: Already correct format {players: [...]}
            else if (!parsedData.players) {
              parsedData = { players: [] };
            }
            
            // Calculate totals from events if total is missing or zero
            if (parsedData.players && Array.isArray(parsedData.players)) {
              parsedData.players = parsedData.players.map((player: any) => {
                // Only calculate if total is missing or zero and events exist
                if ((!player.total || player.total === 0) && player.events && Array.isArray(player.events) && player.events.length > 0) {
                  const calculatedTotal = player.events.reduce((sum: number, event: any) => {
                    // For count metrics, sum the value field
                    if (event.value !== undefined && event.value !== null) {
                      return sum + (typeof event.value === 'number' ? event.value : parseInt(event.value) || 0);
                    }
                    return sum;
                  }, 0);
                  
                  console.log(`[ANALYZE_COMPREHENSIVE] Calculated total for ${player.name}: ${calculatedTotal} from ${player.events.length} events`);
                  
                  return {
                    ...player,
                    total: calculatedTotal
                  };
                }
                return player;
              });
            }
            
            console.log(`[ANALYZE_COMPREHENSIVE] Normalized metric "${metric.title}":`, JSON.stringify(parsedData).substring(0, 200));
            
            return {
              title: metric.title,
              data: parsedData
            };
          } catch (e) {
            console.error(`Failed to parse metric data for "${metric.title}":`, e);
            console.error(`Raw metric data:`, metricResults[index]);
            return {
              title: metric.title,
              data: { players: [] }
            };
          }
        });
        
        console.log(`[ANALYZE_COMPREHENSIVE] Generated ${dynamicMetrics.length} dynamic metrics`);
      }
    }

    // Clean up the uploaded file
    try {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
      }
      const fileManager = new GoogleAIFileManager(apiKey);
      await fileManager.deleteFile(uploadedFile.name);
      console.log(`[ANALYZE_COMPREHENSIVE] Uploaded file cleaned up successfully`);
    } catch (cleanupError) {
      console.warn(`[ANALYZE_COMPREHENSIVE] Failed to cleanup uploaded file:`, cleanupError);
    }

    console.log(`[ANALYZE_COMPREHENSIVE] Processing complete, structuring results...`);

    // Return comprehensive analysis results including advice and dynamic metrics
    const finalResult = {
      match_analysis: responseMatch,
      score_analysis: responseScore,
      punch_analysis: responsePunch,  
      kick_count_analysis: responseKickNo,
      yellow_card_analysis: responseYellowCards,
      advice_analysis: responseAdvice,
      dynamic_metrics: dynamicMetrics.length > 0 ? dynamicMetrics : undefined, // NEW: Dynamic metrics for non-taekwondo sports
      sport: sport,
      isTaekwondo: isTaekwondo,
      roundAnalyzed: roundToAnalyze,
      processedAt: new Date().toISOString(),
      errors: {
        match: responseMatch ? null : 'Match analysis failed',
        score: responseScore ? null : 'Score analysis failed', 
        punch: responsePunch ? null : 'Punch analysis failed',
        kickCount: responseKickNo ? null : 'Kick count analysis failed',
        yellowCards: responseYellowCards ? null : 'Yellow card analysis failed',
        advice: responseAdvice ? null : 'Player advice generation failed'
      }
    };
    
    console.log(`[ANALYZE_COMPREHENSIVE] Final result has score_analysis: ${!!finalResult.score_analysis}`);
    console.log(`[ANALYZE_COMPREHENSIVE] Final result score_analysis type: ${typeof finalResult.score_analysis}`);
    
    return finalResult;

  } catch (error) {
    console.error(`[ANALYZE_COMPREHENSIVE] Error occurred: ${error}`);
    console.error(`[ANALYZE_COMPREHENSIVE] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Clean up uploaded file on error
    if (uploadedFile) {
      try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
          const fileManager = new GoogleAIFileManager(apiKey);
          await fileManager.deleteFile(uploadedFile.name);
          console.log(`[ANALYZE_COMPREHENSIVE] Uploaded file cleaned up after error`);
        }
      } catch (cleanupError) {
        console.warn(`[ANALYZE_COMPREHENSIVE] Failed to cleanup uploaded file after error:`, cleanupError);
      }
    }
    
    throw new Error(`Comprehensive video analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    console.log(`[ANALYZE_COMPREHENSIVE] Comprehensive analysis complete`);
  }
}

// Main function that matches the Python API pattern
// Clip Analysis Function using Gemini 2.5 Pro with web search
export async function analyzeVideoClip(
  videoFilePath: string,
  filename: string,
  whatToAnalyze: string,
  sport: string,
  language: string = 'english'
) {
  console.log(`[ANALYZE_VIDEO_CLIP] Starting clip analysis for ${filename}`);
  console.log(`[ANALYZE_VIDEO_CLIP] User request: ${whatToAnalyze}`);
  console.log(`[ANALYZE_VIDEO_CLIP] Sport: ${sport}, Language: ${language}`);
  
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file not found: ${videoFilePath}`);
  }
  
  const fileStats = fs.statSync(videoFilePath);
  console.log(`[ANALYZE_VIDEO_CLIP] Video file size: ${fileStats.size} bytes`);
  
  let uploadedFile = null;

  try {
    // Upload video to Gemini
    console.log(`[ANALYZE_VIDEO_CLIP] Uploading video to Gemini...`);
    const fileManager = new GoogleAIFileManager(GEMINI_API_KEY!);
    
    // Upload video for processing
    const uploadResponse = await fileManager.uploadFile(videoFilePath, {
      mimeType: 'video/mp4',
      displayName: filename,
    });
    
    uploadedFile = uploadResponse.file;
    console.log(`[ANALYZE_VIDEO_CLIP] Video uploaded successfully: ${uploadedFile.uri}`);
    
    // Wait for processing to complete
    let file = uploadedFile;
    while (file.state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 10000));
      file = await fileManager.getFile(uploadedFile.name);
    }
    
    if (file.state === 'FAILED') {
      throw new Error('Video processing failed');
    }
    
    console.log(`[ANALYZE_VIDEO_CLIP] Video processing complete: ${file.state}`);
    
    // Create the clip analysis prompt - directly use the sport name from user input
    const prompt = `You are an expert ${sport} coach and performance analyst with extensive experience in professional training and technique optimization. 
Analyze this video clip based on the user's specific request and provide detailed, actionable coaching advice.

User's Request: ${whatToAnalyze}

Sport: ${sport}

IMPORTANT FORMATTING RULES:
- Skip all introductory sentences and preambles. Do not start with phrases like "Of course", "As a coach", "I can provide", etc. Start directly with the analysis content.
- Use ## headers ONLY for major sections (like "Person 1 Analysis", "Person 2 Analysis", "Overall Comparison", etc.)
- Use **bold text** for subsection labels (like **Strengths:**, **Weaknesses:**, **Tips:**, etc.) - NOT headers
- Write detailed paragraphs under each label
- Use bullet points (-) for lists of specific points

Please provide a comprehensive coaching analysis that:
1. Directly addresses the user's specific question or concern
2. Identifies what each person is doing correctly (strengths and good fundamentals)
3. Points out specific technical areas that need improvement
4. Provides actionable steps and drills to improve their technique
5. Compares their technique to professional standards and best practices
6. Includes any safety considerations or injury prevention tips
7. Suggests specific exercises, drills, or training methods to develop the skills shown
8. If analyzing multiple people, provide individual feedback for each person

${language === 'arabic' ? 'Please provide the entire analysis in Arabic.' : 'Please provide the analysis in English.'}

Be specific, detailed, and constructive. Focus on practical coaching advice that can be immediately applied.
Use your expertise in ${sport} to provide comprehensive technical guidance based on professional standards and training methodologies.`;
    
    console.log(`[ANALYZE_VIDEO_CLIP] Generating clip analysis with Gemini...`);
    
    // Generate analysis (web search is not supported with video files)
    const clipAnalysisModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.7, // Slightly higher for more conversational responses
        maxOutputTokens: 65536, // Maximum for Gemini 2.5 Pro
      }
    });
    
    const result = await clipAnalysisModel.generateContent([
      {
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri,
        },
      },
      { text: prompt }
    ]);
    
    const response = result.response;
    const analysisText = response.text();
    
    console.log(`[ANALYZE_VIDEO_CLIP] Analysis generated successfully`);
    
    // Structure the response
    return {
      analysisType: 'clip',
      userRequest: whatToAnalyze,
      sport: sport,
      language: language,
      analysis: analysisText,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[ANALYZE_VIDEO_CLIP] Error occurred:`, error);
    throw new Error(`Clip analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clean up uploaded file if it exists
    if (uploadedFile) {
      try {
        const fileManager = new GoogleAIFileManager(GEMINI_API_KEY!);
        await fileManager.deleteFile(uploadedFile.name);
        console.log(`[ANALYZE_VIDEO_CLIP] Cleaned up uploaded file`);
      } catch (cleanupError) {
        console.error(`[ANALYZE_VIDEO_CLIP] Failed to clean up file:`, cleanupError);
      }
    }
  }
}

export async function analyzeVideoFile(
  videoFilePath: string,
  filename: string,
  roundToAnalyze: number
) {
  console.log(`[ANALYZE_VIDEO_FILE] Starting video analysis for ${filename} at ${videoFilePath}`);
  console.log(`[ANALYZE_VIDEO_FILE] Round: ${roundToAnalyze}`);
  
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file not found: ${videoFilePath}`);
  }
  
  const fileStats = fs.statSync(videoFilePath);
  console.log(`[ANALYZE_VIDEO_FILE] Video file size: ${fileStats.size} bytes`);
  
  let videoFile = null;

  try {
    // Send the video and round number to Gemini for processing (like Python)
    console.log(`[ANALYZE_VIDEO_FILE] Calling processVideoGemini...`);
    const [
      uploadedVideoFile,
      responseMatch,
      responseScore,
      responsePunch,
      responseKickNo,
      responseYellowCards
    ] = await processVideoGemini(videoFilePath, roundToAnalyze);

    videoFile = uploadedVideoFile;

    console.log(`[ANALYZE_VIDEO_FILE] Processing complete, structuring results...`);

    // Return the consolidated analysis from Gemini (like Python)
    return {
      match_analysis: responseMatch,
      score_analysis: responseScore,
      punch_analysis: responsePunch,
      kick_count_analysis: responseKickNo,
      yellow_card_analysis: responseYellowCards,
      roundAnalyzed: roundToAnalyze,
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[ANALYZE_VIDEO_FILE] Error occurred: ${error}`);
    console.error(`[ANALYZE_VIDEO_FILE] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Video analysis failed: ${error instanceof Error ? error.message : String(error)}`);

  } finally {
    // Note: File cleanup is handled by the route handler
    // since we're using the original multer file path
    console.log(`[ANALYZE_VIDEO_FILE] Analysis complete`);
  }
}