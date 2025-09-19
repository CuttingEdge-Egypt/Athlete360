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
  if (!responseText) return '{}';
  
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
          // Final fallback - return empty structure
          console.log(`[CLEAN_JSON] All cleanup attempts failed, returning fallback structure`);
          return '{"players": []}';
        }
      }
    }
  }
  
  // Should never reach here, but just in case
  return '{"players": []}';
}

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
    console.log(`[PROCESS_VIDEO_GEMINI] Making single unified analysis call...`);

    // Create a single unified prompt that requests all analyses in one structured JSON
    const unifiedPrompt = `Analyze round ${roundToAnalyze} of this taekwondo match and provide a comprehensive analysis. Return a single JSON with all the following sections:

IMPORTANT: Return a single valid JSON object with all the following sections. Do not include any markdown formatting or code blocks.

{
  "match_analysis": "Write a detailed match analysis of what happened in round ${roundToAnalyze} in technical terms. Include the story of the round, match score, kick count & types, punch count, technical analysis of both players' approaches, strategic adaptation, key moments/commentator notes, and summary of who performed better and why. Take your time to ensure accuracy and don't scan yellow cards as actual scores.",
  
  "score_analysis": {
    "players": [
      {
        "name": "Player 1",
        "color": "Blue/Red",
        "kicks": [
          {
            "timestamp": "MM:SS",
            "score": 0
          }
        ],
        "total_kicks": 0,
        "total_points": 0
      },
      {
        "name": "Player 2",
        "color": "Blue/Red", 
        "kicks": [
          {
            "timestamp": "MM:SS",
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
        "name": "Player 1",
        "Punch": [
          {
            "timestamp": "MM:SS",
            "score": 0
          }
        ],
        "total_punches": 0
      },
      {
        "name": "Player 2",
        "Punch": [
          {
            "timestamp": "MM:SS", 
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
  },
  
  "yellow_card_analysis": {
    "players": [
      {
        "name": "Player 1",
        "color": "Blue/Red",
        "Yellow_cards": [
          {
            "timestamp": "MM:SS",
            "Amount": 1
          }
        ],
        "total_yellows": 0
      },
      {
        "name": "Player 2",
        "color": "Blue/Red",
        "Yellow_cards": [
          {
            "timestamp": "MM:SS",
            "Amount": 1
          }
        ],
        "total_yellows": 0
      }
    ]
  },
  
  "advice_analysis": {
    "advice": {
      "player1": {
        "name": "Player 1 (Blue/Red)",
        "improvements": [
          "Specific advice point 1 about technique or strategy",
          "Specific advice point 2 about positioning or timing",
          "Specific advice point 3 about what to avoid"
        ],
        "strengths": [
          "What they did well in this round"
        ],
        "next_round_strategy": "Overall strategy recommendation for next round"
      },
      "player2": {
        "name": "Player 2 (Blue/Red)", 
        "improvements": [
          "Specific advice point 1 about technique or strategy",
          "Specific advice point 2 about positioning or timing",
          "Specific advice point 3 about what to avoid"
        ],
        "strengths": [
          "What they did well in this round"
        ],
        "next_round_strategy": "Overall strategy recommendation for next round"
      }
    },
    "round_analysis": "Overall analysis of what happened in this specific round and key coaching insights"
  }
}

Instructions:
1. Watch round ${roundToAnalyze} only
2. Focus on scoreboard changes for accurate scoring
3. Listen to commentators for additional insights
4. Count all kick attempts (even blocked/missed ones)
5. Look for punches (clenched fist hitting attempts)
6. Watch for referee warnings/yellow cards on scoreboard
7. Provide expert coaching advice for both players
8. Calculate totals by adding up individual scores
9. Use MM:SS format for timestamps
10. Be thorough and accurate in your analysis`;

    // Make single API call with unified analysis
    const unifiedModel = genai.getGenerativeModel({
      model: "gemini-2.5-pro", 
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      }
    });
    
    const unifiedResponse = await unifiedModel.generateContent([videoData, unifiedPrompt]);

    console.log(`[PROCESS_VIDEO_GEMINI] Unified analysis call completed`);

    // Extract and parse the unified response
    const rawUnifiedResponse = unifiedResponse.response.text();
    console.log(`[PROCESS_VIDEO_GEMINI] Raw Unified Response:`, rawUnifiedResponse.substring(0, 300));

    // Parse the unified JSON response
    const unifiedAnalysis = JSON.parse(cleanJsonResponse(rawUnifiedResponse));

    // Extract individual sections from the unified response
    const matchAnalysis = cleanMarkdownFormatting(unifiedAnalysis.match_analysis || "");
    const scoreAnalysis = JSON.stringify(unifiedAnalysis.score_analysis || {"players": []});
    const punchAnalysis = JSON.stringify(unifiedAnalysis.punch_analysis || {"players": []});
    const kickCountAnalysis = JSON.stringify(unifiedAnalysis.kick_count_analysis || {"players": []});
    const yellowCardAnalysis = JSON.stringify(unifiedAnalysis.yellow_card_analysis || {"players": []});
    const adviceAnalysis = JSON.stringify(unifiedAnalysis.advice_analysis || {"advice": {"player1": {}, "player2": {}}});

    console.log(`[PROCESS_VIDEO_GEMINI] Analysis completed successfully`);

    // Return the tuple with added coaching advice
    return [
      null, // No uploaded file in this approach
      matchAnalysis,
      scoreAnalysis,
      punchAnalysis, 
      kickCountAnalysis,
      yellowCardAnalysis,
      adviceAnalysis
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
      responseYellowCards,
      responseAdvice
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
      advice_analysis: responseAdvice,
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