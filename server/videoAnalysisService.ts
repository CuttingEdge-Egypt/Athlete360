import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genai = new GoogleGenerativeAI(GEMINI_API_KEY);

const generationConfig = {
  temperature: 0,
  maxOutputTokens: 8192,
};

const model = genai.getGenerativeModel({
  model: "gemini-2.5-pro",
  generationConfig,
});

// Process video with Gemini using base64 encoding (working approach)
export async function processVideoGemini(videoFilePath: string, roundToAnalyze: number) {
  console.log(`[PROCESS_VIDEO_GEMINI] Starting video analysis for round ${roundToAnalyze}`);
  console.log(`[PROCESS_VIDEO_GEMINI] Video file: ${videoFilePath}`);
  
  try {
    // Read video file and convert to base64 for Gemini API
    console.log(`[PROCESS_VIDEO_GEMINI] Reading video file...`);
    const videoBuffer = fs.readFileSync(videoFilePath);
    const videoBase64 = videoBuffer.toString('base64');
    
    const videoData = {
      inlineData: {
        data: videoBase64,
        mimeType: "video/mp4"
      }
    };
    
    console.log(`[PROCESS_VIDEO_GEMINI] Video prepared (${videoBase64.length} chars base64)`);
    console.log(`[PROCESS_VIDEO_GEMINI] Starting 5 analysis calls...`);

    // Define prompts for each analysis type
    const promptMatch = `Write me a match Analysis of what happened in round ${roundToAnalyze} in technical terms. Include the story of the round.

Listen to any insights the commentator might have. Here is a template:

Match Score:
Give me the final score of the match.

Kick Count & Types:
This analysis is limited by the fast action and occasional obscured views, but here are some highlights. Precise numbers are hard to determine but I will use as many markers as possible.

Player 1 (Blue): Describe their technique style.
Count of spinning kicks: Estimate based on observation
Number of front kicks: Estimate based on observation

Player 2 (Red): Describe their technique style.  
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

    const promptScore = `Watch round ${roundToAnalyze} only. Identify when a player scored using the scoreboard. Focus on the scoreboard change for better accuracy. Listen to commentators they will help you reference which player scored how many points. Include final match score (from scoreboard) in the summary.

IMPORTANT: Calculate total_points by adding up all individual kick scores. For example: if kicks are [1, 1, 2], then total_points = 1+1+2 = 4.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "color": "Red/Blue"
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
      "name": "Player 2 (Red)", 
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

    const promptPunch = `Watch round ${roundToAnalyze} only. Watch this taekwondo match and tell me when a player performed a punch, a punch is when a player clenches their fist and tries to hit another player. If there are no punches found let the JSON be NONE.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "Punch": [
        {
          "timestamp": "HH:MM:SS",
          "score": 0
        }
      ],
      "total_punches": 0
    },
    {
      "name": "Player 2",
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

    const promptKickNo = `Watch round ${roundToAnalyze} only. Watch the taekwondo match and count the total number of kicks both players executed. Even if kicks doesn't hit the opponent or if they blocked it; count every time there is an attempt.

IMPORTANT: This total_kick_number should match the total_kicks count from the scoring analysis.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "kicks": [
        {
          "total_kick_number": 0
        }
      ]
    },
    {
      "name": "Player 2",
      "kicks": [
        {
          "total_kick_number": 0
        }
      ]
    }
  ]
}`;

    const promptYellowCards = `Watch round ${roundToAnalyze} only. This is a taekwondo match, following taekwondo rules. By looking at the scoreboard and watching when the referee gives a warning or 'yellow card' to a player, list all yellow cards with their exact timestamps.

IMPORTANT: Calculate total_yellows by adding up all individual warning amounts. For example: if warnings are [1, 1, 1], then total_yellows = 1+1+1 = 3.

Return JSON format:
{
  "players": [
    {
      "name": "Player 1",
      "color": "Red/Blue"
      "Yellow_cards": [
        {
          "timestamp": "HH:MM:SS",
          "Amount": 1
        }
      ],
      "total_yellows": 0
    },
    {
      "name": "Player 2 (Red)",
      "Yellow_cards": [
        {
          "timestamp": "HH:MM:SS",
          "Amount": 1
        }
      ],
      "total_yellows": 0
    }
  ]
}`;

    // Make 5 parallel API calls (like Python version)
    console.log(`[PROCESS_VIDEO_GEMINI] Making 5 parallel analysis calls...`);
    
    // Create separate model instances for different response types
    const textModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
      }
    });

    const jsonModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro", 
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      }
    });
    
    const [responseMatch, responseScore, responsePunch, responseKickNo, responseYellowCards] = await Promise.all([
      textModel.generateContent([videoData, promptMatch]),
      jsonModel.generateContent([videoData, promptScore]),
      jsonModel.generateContent([videoData, promptPunch]),
      jsonModel.generateContent([videoData, promptKickNo]),
      jsonModel.generateContent([videoData, promptYellowCards])
    ]);

    console.log(`[PROCESS_VIDEO_GEMINI] All 5 analysis calls completed`);

    // Extract text responses
    const matchAnalysis = responseMatch.response.text();
    const scoreAnalysis = responseScore.response.text();
    const punchAnalysis = responsePunch.response.text();
    const kickCountAnalysis = responseKickNo.response.text();
    const yellowCardAnalysis = responseYellowCards.response.text();

    console.log(`[PROCESS_VIDEO_GEMINI] Analysis completed successfully`);

    // Return the tuple like Python version
    return [
      null, // No uploaded file in this approach
      matchAnalysis,
      scoreAnalysis,
      punchAnalysis, 
      kickCountAnalysis,
      yellowCardAnalysis
    ];

  } catch (error) {
    console.error(`[PROCESS_VIDEO_GEMINI] Error:`, error);
    throw error;
  }
}

// Main function that matches the Python API pattern
export async function analyzeVideoFile(
  videoBuffer: Buffer,
  filename: string,
  roundToAnalyze: number
) {
  console.log(`[ANALYZE_VIDEO_FILE] Starting video analysis for ${filename} (${videoBuffer.length} bytes)`);
  console.log(`[ANALYZE_VIDEO_FILE] Round: ${roundToAnalyze}`);
  
  let tempFilePath = null;
  let videoFile = null;

  try {
    // Save the uploaded video file temporarily (like Python)
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      console.log(`[ANALYZE_VIDEO_FILE] Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create unique filename like Python uuid.uuid4()
    const uuid = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tempFilePath = path.join(tempDir, `${uuid}.mp4`);
    
    console.log(`[ANALYZE_VIDEO_FILE] Saving video to: ${tempFilePath}`);
    fs.writeFileSync(tempFilePath, videoBuffer);
    console.log(`[ANALYZE_VIDEO_FILE] Video saved successfully, size: ${fs.statSync(tempFilePath).size} bytes`);

    // Send the video and round number to Gemini for processing (like Python)
    console.log(`[ANALYZE_VIDEO_FILE] Calling processVideoGemini...`);
    const [
      uploadedVideoFile,
      responseMatch,
      responseScore,
      responsePunch,
      responseKickNo,
      responseYellowCards
    ] = await processVideoGemini(tempFilePath, roundToAnalyze);

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
    // Clean up the temporary local file (like Python)
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[ANALYZE_VIDEO_FILE] Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn(`[ANALYZE_VIDEO_FILE] Failed to cleanup temp file:`, cleanupError);
      }
    }

    // No need to delete file from Gemini storage since we use base64 approach
    console.log(`[ANALYZE_VIDEO_FILE] Cleanup complete`);
  }
}