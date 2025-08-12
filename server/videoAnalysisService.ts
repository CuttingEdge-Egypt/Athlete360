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
  // Combined comprehensive prompt for all analyses
  const comprehensivePrompt = `Analyze this taekwondo video comprehensively for round ${roundToAnalyze}. Use player names: ${athlete1Name} (blue) and ${athlete2Name} (red).

Please provide a complete analysis covering all aspects below. Return your response as a JSON object with the following exact structure:

{
  "match_analysis": "Write a detailed match analysis of what happened in round ${roundToAnalyze} in technical terms. Include the story of the round, match score, kick count & types for both players, punch count, technical analysis of both players' approaches and strategies, strategic adaptation, key moments/commentator notes, and a summary of who performed better and why. Take your time in processing to make sure the results are accurate.",
  
  "score_analysis": {
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
  },
  
  "punch_analysis": {
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
  },
  
  "kick_count_analysis": {
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
  },
  
  "yellow_card_analysis": {
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
  }
}

Instructions:
- Focus on the scoreboard for accurate scoring information
- Listen to commentators for additional insights
- If no punches are found, set Punch arrays to empty []
- If no yellow cards are found, set Yellow_cards arrays to empty []
- Provide realistic timestamps in HH:MM:SS format
- Ensure all numbers are realistic based on what you observe
- Take your time to ensure accuracy and don't mistake yellow cards for actual scores`;

  try {
    console.log(`[VIDEO ANALYSIS] Starting comprehensive analysis for ${athlete1Name} vs ${athlete2Name}, Round ${roundToAnalyze}`);
    console.log(`[VIDEO ANALYSIS] Step 1: Preparing video data...`);
    
    const videoData = await prepareVideoForGemini(videoFilePath);
    console.log(`[VIDEO ANALYSIS] Step 1 Complete: Video data prepared (size: ${videoData.inlineData.data.length} chars)`);

    console.log(`[VIDEO ANALYSIS] Step 2: Making single comprehensive API call to Google Gemini...`);
    const startTime = Date.now();

    const response = await model.generateContent([videoData, comprehensivePrompt]);
    
    const apiCallTime = Date.now() - startTime;
    console.log(`[VIDEO ANALYSIS] Step 2 Complete: API call finished in ${apiCallTime}ms`);

    console.log(`[VIDEO ANALYSIS] Step 3: Parsing comprehensive response...`);
    
    const responseText = response.response.text();
    console.log(`[VIDEO ANALYSIS] Raw response length: ${responseText.length} characters`);
    
    const parsedResults = JSON.parse(responseText);
    console.log(`[VIDEO ANALYSIS] Response parsed successfully`);

    // Structure results to match the expected format
    const results = {
      match_analysis: parsedResults.match_analysis,
      score_analysis: parsedResults.score_analysis,
      punch_analysis: parsedResults.punch_analysis,
      kick_count_analysis: parsedResults.kick_count_analysis,
      yellow_card_analysis: parsedResults.yellow_card_analysis,
      athlete1Name,
      athlete2Name,
      roundAnalyzed: roundToAnalyze,
      processedAt: new Date().toISOString()
    };

    const totalTime = Date.now() - startTime;
    console.log(`[VIDEO ANALYSIS] Step 3 Complete: All results structured`);
    console.log(`[VIDEO ANALYSIS] SUCCESS: Video analysis completed in ${totalTime}ms total`);
    return results;

  } catch (error) {
    console.error('[VIDEO ANALYSIS] Error processing video with Gemini:', error);
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