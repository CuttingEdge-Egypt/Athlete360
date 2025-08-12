import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

const genai = new GoogleGenerativeAI(GOOGLE_API_KEY);

const generationConfig = {
  temperature: 0,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const generationConfigMatch = {
  temperature: 0.2,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const model = genai.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig,
});

const modelMatch = genai.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: generationConfigMatch,
});

async function prepareVideoForGemini(videoFilePath: string, mimeType?: string) {
  console.log(`Reading video file for analysis...`);
  
  // Read the video file as base64
  const videoBuffer = fs.readFileSync(videoFilePath);
  const videoBase64 = videoBuffer.toString('base64');
  
  return {
    inlineData: {
      data: videoBase64,
      mimeType: mimeType || "video/mp4"
    }
  };
}

export async function processVideoGemini(
  videoFilePath: string, 
  roundToAnalyze: number,
  athlete1Name: string,
  athlete2Name: string
) {
  const promptKickNo = `Analyze this sports video and count the number of kicks for each player in round ${roundToAnalyze}. Use player names: ${athlete1Name} (blue) and ${athlete2Name} (red).

Output Format:
{
  "players": [
    {
      "name": "${athlete1Name}",
      "kicks": [
        {
          "total_kick_number": 0
        }
      ]
    },
    {
      "name": "${athlete2Name}",
      "kicks": [
        {
          "total_kick_number": 0
        }
      ]
    }
  ]
}`;

  const promptYellowCards = `This is a taekwondo match, following taekwondo rules. By looking at the scoreboard and watching when the referee gives a warning or 'yellow card' to a player, list all yellow cards. Use player names: ${athlete1Name} (blue) and ${athlete2Name} (red).

Output Format:
{
  "players": [
    {
      "name": "${athlete1Name}",
      "Yellow_cards": [
        {
          "timestamp": "HH:MM:SS",
          "Amount": 0
        }
      ],
      "total_yellows": 0
    },
    {
      "name": "${athlete2Name}",
      "Yellow_cards": [
        {
          "timestamp": "HH:MM:SS", 
          "Amount": 0
        }
      ],
      "total_yellows": 0
    }
  ]
}`;

  const promptPunch = `Watch round ${roundToAnalyze} only. Watch this taekwondo match and tell me when a player performed a punch, a punch is when a player clenches their fist and tries to hit another player. If there are no punches found let the JSON be NONE. Use player names: ${athlete1Name} (blue) and ${athlete2Name} (red).

Output Format:
{
  "players": [
    {
      "name": "${athlete1Name}",
      "Punch": [
        {
          "timestamp": "HH:MM:SS",
          "score": 0
        }
      ],
      "total_punches": 0
    },
    {
      "name": "${athlete2Name}",
      "Punch": [
        {
          "timestamp": "HH:MM:SS",
          "score": 0
        }
      ],
      "total_punches": 0
    }
  ]
}`;

  const promptMatchScore = `Identify when a player scored using the scoreboard. Use player names: ${athlete1Name} (blue) and ${athlete2Name} (red). Focus on the scoreboard change for better accuracy. Listen to commentators they will help you reference which kicked scored how many points. Include final match score (from scoreboard) in the summary.

Output Format:
{
  "players": [
    {
      "name": "${athlete1Name}",
      "kicks": [
        {
          "timestamp": "HH:MM:SS",
          "score": 0
        }
      ],
      "total_kicks": 0,
      "total_points": 0
    },
    {
      "name": "${athlete2Name}",
      "kicks": [
        {
          "timestamp": "HH:MM:SS",
          "score": 0
        }
      ],
      "total_kicks": 0,
      "total_points": 0
    }
  ],
  "summary": {
    "total_match_score_blue": 0,
    "total_match_score_red": 0
  }
}`;

  const promptMatch = `Write me a match Analysis of what happened in round ${roundToAnalyze} in technical terms. Include the story of the round. Use player names: ${athlete1Name} (blue) and ${athlete2Name} (red).

Listen to any insights the commentator might have. Here is a template:

Match Score:
Give me the final score of the match.

Kick Count & Types:
This analysis is limited by the fast action and occasional obscured views, but here are some highlights. Precise numbers are hard to determine but I will use as many markers as possible.

${athlete1Name} (Blue): Describe their technique style.
Count of spinning kicks: Estimate based on observation
Number of front kicks: Estimate based on observation

${athlete2Name} (Red): Describe their technique style.  
Count of Round housekicks: Estimate based on observation
Number of Tipi-chaji: Estimate based on observation

Punch Count:
Mention if there were any punches in the match

Match Brief & Technical Analysis:
Provide detailed technical analysis of both players' approaches and strategies.

Strategic Adaptation: How each player adapted during the round.

Key Moments/Commentator Notes:
Include any key insights from commentators.

Summary:
Explain who performed better and why.

Take your time in processing to make sure the results are accurate.
Make sure you're not scanning the yellow card as an actual score.`;

  try {
    console.log(`[VIDEO ANALYSIS] Starting analysis for ${athlete1Name} vs ${athlete2Name}, Round ${roundToAnalyze}`);
    console.log(`[VIDEO ANALYSIS] Step 1: Preparing video data...`);
    
    const videoData = await prepareVideoForGemini(videoFilePath);
    console.log(`[VIDEO ANALYSIS] Step 1 Complete: Video data prepared (size: ${videoData.inlineData.data.length} chars)`);

    console.log(`[VIDEO ANALYSIS] Step 2: Starting 5 parallel API calls to Google Gemini...`);
    const startTime = Date.now();

    // Generate all analyses with individual logging
    console.log(`[VIDEO ANALYSIS] Calling API for: Match Analysis, Match Score, Punches, Kick Count, Yellow Cards`);
    
    const [
      responseMatchAnalysis,
      responseMatchScore,
      responsePunch,
      responseKickNo,
      responseYellowCards
    ] = await Promise.all([
      (async () => {
        console.log(`[VIDEO ANALYSIS] Starting: Match Analysis`);
        const response = await modelMatch.generateContent([videoData, promptMatch]);
        console.log(`[VIDEO ANALYSIS] Completed: Match Analysis`);
        return response;
      })(),
      (async () => {
        console.log(`[VIDEO ANALYSIS] Starting: Match Score`);
        const response = await model.generateContent([videoData, promptMatchScore]);
        console.log(`[VIDEO ANALYSIS] Completed: Match Score`);
        return response;
      })(),
      (async () => {
        console.log(`[VIDEO ANALYSIS] Starting: Punches`);
        const response = await model.generateContent([videoData, promptPunch]);
        console.log(`[VIDEO ANALYSIS] Completed: Punches`);
        return response;
      })(),
      (async () => {
        console.log(`[VIDEO ANALYSIS] Starting: Kick Count`);
        const response = await model.generateContent([videoData, promptKickNo]);
        console.log(`[VIDEO ANALYSIS] Completed: Kick Count`);
        return response;
      })(),
      (async () => {
        console.log(`[VIDEO ANALYSIS] Starting: Yellow Cards`);
        const response = await model.generateContent([videoData, promptYellowCards]);
        console.log(`[VIDEO ANALYSIS] Completed: Yellow Cards`);
        return response;
      })()
    ]);

    const apiCallTime = Date.now() - startTime;
    console.log(`[VIDEO ANALYSIS] Step 2 Complete: All API calls finished in ${apiCallTime}ms`);

    console.log(`[VIDEO ANALYSIS] Step 3: Parsing responses...`);
    
    // Parse responses with error handling
    const results = {
      matchAnalysis: (() => {
        try {
          const parsed = JSON.parse(responseMatchAnalysis.response.text());
          console.log(`[VIDEO ANALYSIS] Match Analysis parsed successfully`);
          return parsed;
        } catch (e) {
          console.error(`[VIDEO ANALYSIS] Error parsing Match Analysis:`, e);
          return { error: 'Failed to parse match analysis' };
        }
      })(),
      matchScore: (() => {
        try {
          const parsed = JSON.parse(responseMatchScore.response.text());
          console.log(`[VIDEO ANALYSIS] Match Score parsed successfully`);
          return parsed;
        } catch (e) {
          console.error(`[VIDEO ANALYSIS] Error parsing Match Score:`, e);
          return { error: 'Failed to parse match score' };
        }
      })(),
      punches: (() => {
        try {
          const parsed = JSON.parse(responsePunch.response.text());
          console.log(`[VIDEO ANALYSIS] Punches parsed successfully`);
          return parsed;
        } catch (e) {
          console.error(`[VIDEO ANALYSIS] Error parsing Punches:`, e);
          return { error: 'Failed to parse punches' };
        }
      })(),
      kickCount: (() => {
        try {
          const parsed = JSON.parse(responseKickNo.response.text());
          console.log(`[VIDEO ANALYSIS] Kick Count parsed successfully`);
          return parsed;
        } catch (e) {
          console.error(`[VIDEO ANALYSIS] Error parsing Kick Count:`, e);
          return { error: 'Failed to parse kick count' };
        }
      })(),
      yellowCards: (() => {
        try {
          const parsed = JSON.parse(responseYellowCards.response.text());
          console.log(`[VIDEO ANALYSIS] Yellow Cards parsed successfully`);
          return parsed;
        } catch (e) {
          console.error(`[VIDEO ANALYSIS] Error parsing Yellow Cards:`, e);
          return { error: 'Failed to parse yellow cards' };
        }
      })(),
      athlete1Name,
      athlete2Name,
      roundAnalyzed: roundToAnalyze,
      processedAt: new Date().toISOString()
    };

    const totalTime = Date.now() - (startTime - apiCallTime);
    console.log(`[VIDEO ANALYSIS] Step 3 Complete: All responses parsed`);
    console.log(`[VIDEO ANALYSIS] SUCCESS: Video analysis completed in ${totalTime}ms total`);
    return results;

  } catch (error) {
    console.error('Error processing video with Gemini:', error);
    throw new Error(`Video analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeVideoFile(
  videoBuffer: Buffer,
  filename: string,
  roundToAnalyze: number,
  athlete1Name: string,
  athlete2Name: string
) {
  console.log(`[ANALYZE FILE] Starting analyzeVideoFile for ${filename} (${videoBuffer.length} bytes)`);
  console.log(`[ANALYZE FILE] Athletes: ${athlete1Name} vs ${athlete2Name}, Round: ${roundToAnalyze}`);
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    console.log(`[ANALYZE FILE] Creating temp directory: ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Save video to temporary file
  const tempFilePath = path.join(tempDir, `video_${Date.now()}_${filename}`);
  console.log(`[ANALYZE FILE] Saving video to temp file: ${tempFilePath}`);
  fs.writeFileSync(tempFilePath, videoBuffer);
  console.log(`[ANALYZE FILE] Video saved successfully, file size: ${fs.statSync(tempFilePath).size} bytes`);

  try {
    console.log(`[ANALYZE FILE] Calling processVideoGemini...`);
    const startTime = Date.now();
    
    const results = await processVideoGemini(
      tempFilePath,
      roundToAnalyze,
      athlete1Name,
      athlete2Name
    );

    const totalTime = Date.now() - startTime;
    console.log(`[ANALYZE FILE] processVideoGemini completed in ${totalTime}ms`);
    return results;
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('[ANALYZE FILE] Temporary video file cleaned up successfully');
    } catch (cleanupError) {
      console.warn('[ANALYZE FILE] Failed to cleanup temp file:', cleanupError);
    }
  }
}