import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API clients
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const googleGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface NutritionPlanData {
  plan: string;
}

export interface NutritionPlanDay {
  day: {
    date: string;
    name: string;
  };
  meals: {
    scan_meal?: {};
    calories_intake: string;
    meal_description: string[];
  }[];
  explanation: string;
  total_calories_intake: string;
}

export interface StructuredNutritionPlan {
  days: NutritionPlanDay[];
}

export interface GeminiRankResponse {
  success: boolean;
  athlete_name: string;
  sport: string;
  nationality: string;
  active_period: {
    start_year: number;
    end_year: string | number;
  };
  ranking_system_overview: string;
  career_phases: Array<{
    phase_name: string;
    period: string;
    key_achievements: Array<{
      year: number;
      event_name: string;
      event_tier: string;
      result: string;
      notes: string;
    }>;
  }>;
  analysis_narrative: string;
}

export interface AthleteData {
  name: string;
  bio: string;
  playersStory?: string;
  currentRank: number | string;
  rank?: number | string; // Keep for backward compatibility
  achievements?: string[];
  recentNews?: string[];
  profileImageUrl?: string | null;
  worldRank?: string;
  currentRecord?: string;
}

export async function generateNutritionPlan(
  name: string,
  age: number,
  gender: string,
  sport: string,
  nationality: string
): Promise<NutritionPlanData> {
  try {
    const nationalityText = nationality === 'International' ? 'international' : nationality;
    const genderText = gender === 'Unknown' ? 'athlete' : `${age} years old ${gender}`;
    const systemPrompt = `You are a professional sports nutritionist specializing in ${nationalityText} cuisine. Create a 7-day nutrition plan in JSON format only. Do not include any text before or after the JSON. The response must be valid JSON without any markdown formatting.`;
    
    const prompt = `Create a personalized 7-day nutrition plan for this athlete:

Athlete: ${name} (${genderText} from ${nationalityText})
Sport: ${sport}

CRITICAL: Return ONLY valid JSON in this EXACT structure with no additional text, no markdown, no explanations:

{
  "days": [
    {
      "day": {
        "date": "2024-08-14",
        "name": "Monday"
      },
      "meals": [
        {
          "calories_intake": "500 kcal",
          "meal_description": [
            "Traditional ${nationalityText} breakfast item 100g",
            "Another item with quantity"
          ]
        },
        {
          "calories_intake": "300 kcal",
          "meal_description": [
            "Mid-morning snack items"
          ]
        },
        {
          "calories_intake": "700 kcal",
          "meal_description": [
            "Traditional ${nationality} lunch items"
          ]
        },
        {
          "calories_intake": "200 kcal",
          "meal_description": [
            "Afternoon snack"
          ]
        },
        {
          "calories_intake": "600 kcal",
          "meal_description": [
            "Traditional ${nationality} dinner items"
          ]
        }
      ],
      "explanation": "Brief explanation of why this daily plan supports ${sport} performance with ${nationality} foods",
      "total_calories_intake": "2300 kcal"
    }
  ]
}

Requirements:
- Use traditional ${nationalityText} foods appropriate for ${sport} athletes
- Include 5 meals per day (breakfast, snack, lunch, snack, dinner)
- Consider ${sport} training needs (explosive power, agility, recovery)
- Provide realistic portion sizes
- Generate 7 complete days
- Each meal should have 2-4 food items with quantities

FAILURE HANDLING: If you cannot generate authentic nutrition plan due to insufficient data, web search failures, or any other issues, return this exact JSON structure:
{
  "error": true,
  "errorType": "insufficient_data|web_search_failed|parsing_error|other",
  "errorMessage": "Specific reason why nutrition plan failed",
  "retryable": true,
  "suggestion": "What the user should try instead"
}

Otherwise, return the full nutrition plan structure.

CRITICAL ERROR HANDLING:
- If you cannot find any reliable nutrition data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide nutrition plans if you can find authentic dietary information for the athlete's sport and nationality`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      name: { type: "string" }
                    },
                    required: ["date", "name"]
                  },
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        calories_intake: { type: "string" },
                        meal_description: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["calories_intake", "meal_description"]
                    }
                  },
                  explanation: { type: "string" },
                  total_calories_intake: { type: "string" }
                },
                required: ["day", "meals", "explanation", "total_calories_intake"]
              }
            }
          },
          required: ["days"]
        }
      },
      contents: prompt,
    });

    const responseText = result.text || "{}";
    
    // Check for error responses indicating no data found
    if (responseText.includes('"error": "no_data_found"') || 
        responseText.includes('"error": "search_failed"') || 
        responseText.includes('"error": "not_found"') ||
        responseText.includes('"success": false')) {
      throw new Error('AI_WEB_SEARCH_FAILED: No authentic nutrition data found through web search');
    }
    
    // Clean and parse the JSON response
    let cleanedResponse = responseText.trim();
    
    // Remove any markdown code blocks
    cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    
    // Try to parse the JSON
    let parsedPlan: StructuredNutritionPlan;
    try {
      parsedPlan = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("JSON parsing failed, using fallback structure:", parseError);
      // Fallback structure if parsing fails
      parsedPlan = {
        days: [
          {
            day: {
              date: new Date().toISOString().split('T')[0],
              name: "Sample Day"
            },
            meals: [
              {
                calories_intake: "500 kcal",
                meal_description: [`Traditional ${nationality} breakfast items`, "Mixed with local ingredients"]
              },
              {
                calories_intake: "300 kcal", 
                meal_description: ["Healthy snack options"]
              },
              {
                calories_intake: "700 kcal",
                meal_description: [`Traditional ${nationality} lunch`, "Balanced for ${sport} training"]
              },
              {
                calories_intake: "200 kcal",
                meal_description: ["Afternoon energy boost"]
              },
              {
                calories_intake: "600 kcal",
                meal_description: [`Traditional ${nationality} dinner`, "Optimized for recovery"]
              }
            ],
            explanation: `Sample nutrition plan for ${sport} athlete incorporating ${nationality} cuisine`,
            total_calories_intake: "2300 kcal"
          }
        ]
      };
    }

    return {
      plan: JSON.stringify(parsedPlan)
    };
  } catch (error) {
    console.error("Error generating nutrition plan:", error);
    
    // Return structured error response instead of throwing
    return {
      error: true,
      errorType: error instanceof Error && error.message.includes('AI_WEB_SEARCH_FAILED') ? "web_search_failed" : "parsing_error",
      errorMessage: `Unable to generate nutrition plan: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
      suggestion: "Please try again or check if the athlete information is correct",
      days: []
    };
  }
}

// Gemini-2.5-pro powered detailed comparison data and head-to-head analysis
export async function generateDetailedComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const timestamp = new Date().toISOString();
    const sessionId = Math.random().toString(36).substring(7);

    const model = googleGenAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });

    const prompt = `You are an expert ${sport} analyst specializing in detailed athlete comparisons and head-to-head predictions. Use your web search capabilities to find the most current and comprehensive information about these two athletes.

Session ID: ${sessionId} - Generation Time: ${timestamp}

ATHLETES TO ANALYZE:
Athlete 1: ${athlete1.name} from ${athlete1.country} (${sport})
Athlete 2: ${athlete2.name} from ${athlete2.country} (${sport})

CRITICAL INSTRUCTIONS:
1. Search the web extensively for current competition data, rankings, recent results, and performance metrics
2. Find technical analysis, fighting styles, recent match footage, and expert commentary
3. Return ONLY valid JSON with no additional text or explanations
4. Base ALL analysis on current web search findings - no generic content

WEB SEARCH FOCUS AREAS:
- Recent competition results and performance trends (2024-2025)
- Current world rankings and trajectory analysis
- Head-to-head records if available
- Technical skills analysis from recent matches
- Physical attributes and fighting styles
- Expert analysis and predictions from sports analysts
- Injury history and current form assessment

Return this EXACT JSON structure:
{
  "detailedAnalysis": {
    "athlete1": {
      "name": "${athlete1.name}",
      "country": "${athlete1.country}",
      "currentForm": "Based on recent competition results and web search findings",
      "technicalSkills": [
        {
          "skill": "Specific technique name",
          "proficiency": 95,
          "description": "Detailed analysis with recent match evidence",
          "evidence": "Specific examples from 2024-2025 competitions"
        }
      ],
      "physicalAttributes": {
        "height": "Web search finding or 'Not found'",
        "weight": "Competition weight class",
        "reach": "Web search finding or 'Not found'",
        "stance": "Fighting stance preference",
        "strengths": ["List of physical advantages from analysis"]
      },
      "recentPerformance": {
        "wins": "Recent win count from web search",
        "losses": "Recent loss count", 
        "lastCompetition": "Most recent competition details",
        "rankingChange": "Recent ranking progression",
        "form": "Current competitive form assessment"
      }
    },
    "athlete2": {
      "name": "${athlete2.name}",
      "country": "${athlete2.country}",
      "currentForm": "Based on recent competition results and web search findings",
      "technicalSkills": [
        {
          "skill": "Specific technique name",
          "proficiency": 92,
          "description": "Detailed analysis with recent match evidence", 
          "evidence": "Specific examples from 2024-2025 competitions"
        }
      ],
      "physicalAttributes": {
        "height": "Web search finding or 'Not found'",
        "weight": "Competition weight class",
        "reach": "Web search finding or 'Not found'",
        "stance": "Fighting stance preference",
        "strengths": ["List of physical advantages from analysis"]
      },
      "recentPerformance": {
        "wins": "Recent win count from web search",
        "losses": "Recent loss count",
        "lastCompetition": "Most recent competition details", 
        "rankingChange": "Recent ranking progression",
        "form": "Current competitive form assessment"
      }
    },
    "comparison": {
      "technicalEdge": "athlete1 or athlete2 based on skills analysis",
      "physicalEdge": "athlete1 or athlete2 based on attributes",
      "experienceEdge": "athlete1 or athlete2 based on competition history",
      "formEdge": "athlete1 or athlete2 based on recent results"
    }
  },
  "headToHead": {
    "prediction": "athlete1 or athlete2",
    "confidence": 75,
    "reasoning": "Comprehensive prediction based on web search analysis of both athletes",
    "keyFactors": [
      "Most important factor from analysis",
      "Second most important factor",
      "Third deciding factor"
    ],
    "scenario": "Detailed fight/competition scenario prediction",
    "tacticalAdvice": {
      "forAthlete1": "Strategic advice based on opponent analysis",
      "forAthlete2": "Strategic advice based on opponent analysis"
    },
    "historicalContext": "Any previous meetings or similar matchups from web search",
    "expertPredictions": "Expert opinions found through web search or 'No expert predictions found'"
  }
}

MANDATORY: Use ONLY current web search results from 2024-2025. If specific information cannot be found through web search, clearly state "Information not found through web search" rather than using generic descriptions.

CRITICAL ERROR HANDLING:
- If you cannot find any reliable comparison data through web search, respond with exactly: {"error": "Couldn't Generate", "errorType": "no_data_found", "errorMessage": "Insufficient authentic data found for both athletes"}
- If web search fails or returns no results, respond with exactly: {"error": "Error", "errorType": "search_failed", "errorMessage": "Web search capabilities returned no results"}
- If either athlete's information does not exist, respond with exactly: {"error": "Couldn't Generate", "errorType": "not_found", "errorMessage": "One or both athletes not found in current databases"}
- Only provide comparison data if you can find authentic, verifiable information about both athletes through web search`;

    // Add timeout wrapper to prevent long delays
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Gemini analysis timed out after 90 seconds')), 90000)
    );
    
    const response = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      }),
      timeoutPromise
    ]) as any;
    const responseText = response.response.text();
    
    console.log(`[GEMINI] Detailed comparison generated for ${athlete1.name} vs ${athlete2.name}`);
    console.log(`[GEMINI] Response length: ${responseText.length} characters`);

    // Clean and parse JSON response
    let cleanedResponse = responseText.trim();
    
    // Remove code block markers if present
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    try {
      const parsedData = JSON.parse(cleanedResponse);
      
      // Check if Gemini returned an error response
      if (parsedData.error && (parsedData.error === "Couldn't Generate" || parsedData.error === "Error" || parsedData.error === "no_data_found" || parsedData.error === "search_failed" || parsedData.error === "not_found")) {
        console.log(`[GEMINI] Returned error response:`, parsedData.error);
        console.log(`[GEMINI] Using fallback structure due to:`, parsedData.error);
        
        // Return structured fallback instead of the error
        return {
          detailedAnalysis: {
            athlete1: {
              name: athlete1.name,
              country: athlete1.country,
              currentForm: "Analysis not available - insufficient data found",
              technicalSkills: [],
              physicalAttributes: {},
              recentPerformance: {}
            },
            athlete2: {
              name: athlete2.name,
              country: athlete2.country,
              currentForm: "Analysis not available - insufficient data found", 
              technicalSkills: [],
              physicalAttributes: {},
              recentPerformance: {}
            },
            comparison: {}
          },
          headToHead: {
            prediction: "athlete1",
            confidence: 50,
            reasoning: "Detailed analysis unavailable - using basic comparison data",
            keyFactors: ["Analysis unavailable"],
            scenario: "Unable to provide detailed scenario",
            tacticalAdvice: {},
            historicalContext: "Information not found",
            expertPredictions: "No expert predictions available"
          }
        };
      }
      
      console.log(`[GEMINI] Successfully parsed detailed comparison data`);
      return parsedData;
    } catch (parseError) {
      console.error(`[GEMINI] JSON parsing failed for detailed comparison:`, parseError);
      console.log(`[GEMINI] Raw response:`, responseText.substring(0, 500));
      
      // Return structured fallback data
      return {
        detailedAnalysis: {
          athlete1: {
            name: athlete1.name,
            country: athlete1.country,
            currentForm: "Information not found through web search",
            technicalSkills: [],
            physicalAttributes: {},
            recentPerformance: {}
          },
          athlete2: {
            name: athlete2.name,
            country: athlete2.country,
            currentForm: "Information not found through web search", 
            technicalSkills: [],
            physicalAttributes: {},
            recentPerformance: {}
          },
          comparison: {}
        },
        headToHead: {
          prediction: "athlete1",
          confidence: 50,
          reasoning: "Unable to generate detailed analysis due to web search limitations",
          keyFactors: ["Analysis unavailable"],
          scenario: "Unable to provide detailed scenario",
          tacticalAdvice: {},
          historicalContext: "Information not found through web search",
          expertPredictions: "No expert predictions found"
        }
      };
    }
  } catch (error) {
    console.error("Error generating detailed comparison with Gemini:", error);
    throw new Error(`Failed to generate detailed comparison: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateRankHistoryWithGemini(
  athleteName: string,
  sport: string,
  nationality?: string
): Promise<GeminiRankResponse> {
  try {
    console.log(`Generating rank history with Gemini 2.5 Pro for ${athleteName} in ${sport}`);
    
    // Get sport-specific federation URLs for context
    const federationUrls = getSportFederationUrls(sport);
    
    // Get current date for more accurate analysis
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });
    const formattedCurrentDate = `${currentMonth} ${currentYear}`;
    
    const prompt = `As an expert sports analyst, your task is to generate a comprehensive rank history analysis for athlete "${athleteName}" from ${nationality || 'unknown nationality'} in ${sport}.

**CURRENT DATE CONTEXT**: Today is ${formattedCurrentDate}. Use this as your reference point for determining what is "current" and "recent" in your analysis.

**Instructions:**

1. **Analyze, Don't Just List:** Do not simply list the athlete's achievements. Your primary goal is to create a narrative that explains the **impact** of these achievements on the athlete's ranking and standing within their sport.
2. **Explain the "Why":** Use the ranking_system_overview to explain *why* certain results led to significant changes in rank. Explain how winning major events provides substantial point boosts compared to lower-tier events.
3. **Infer the Trajectory:** Based on the results, infer the athlete's likely ranking trajectory. Use phrases like "this likely propelled them into the top 50," "this would have solidified their position among the elite," or "this performance established their initial senior ranking."
4. **Follow the Chronology:** Structure your analysis chronologically using career phases. Dedicate a section to each phase, explaining the progression during that period.
5. **Maintain a Professional Tone:** Write the analysis in a clear, professional, and insightful manner, as would be expected from a sports journalist or analyst.

**REQUIRED JSON STRUCTURE:**
{
  "success": true,
  "athlete_name": "${athleteName}",
  "sport": "${sport}",
  "nationality": "${nationality || 'Unknown'}",
  "active_period": {
    "start_year": Start year of player,
    "end_year": "${formattedCurrentDate}"
  },
  "ranking_system_overview": "Detailed explanation of how the ranking system works in ${sport}, including point systems, event tiers, and what achievements lead to ranking improvements",
  "career_phases": [
    {
      "phase_name": "Early Career and Senior Transition",
      "period": "2017-2019",
      "key_achievements": [
        {
          "year": 2018,
          "event_name": "Specific tournament name",
          "event_tier": "competition tier",
          "result": "Medal/placement result",
          "notes": "Explanation of significance and ranking impact"
        }
      ]
    },
    {
      "phase_name": "Continental Breakthrough and Ranking Ascent",
      "period": "2020-2022",
      "key_achievements": [
        {
          "year": 2021,
          "event_name": "Major championship name",
          "event_tier": "Continental Championship or equivalent tier",
          "result": "Medal result",
          "notes": "Impact on world ranking and career trajectory"
        }
      ]
    },
    {
      "phase_name": "Elite Status and Recent Achievements",
      "period": "2023-${formattedCurrentDate}",
      "key_achievements": [
        {
          "year": 2023,
          "event_name": "Recent major competition",
          "event_tier": "Event classification",
          "result": "Achievement",
          "notes": "Current status and ranking implications as of ${formattedCurrentDate}"
        }
      ]
    }
  ],
  "analysis_narrative": "A comprehensive 3-4 paragraph narrative analyzing the athlete's ranking journey, explaining how each achievement contributed to their career progression, discussing their current standing in the sport, and providing insights into their competitive trajectory based on the career phases above."
}

**CRITICAL REQUIREMENTS:**
- Base analysis on authentic competitive achievements and realistic ranking progressions
- Include proper event tier classifications (G-ratings for combat sports, ATP levels for tennis, etc.)
- Create logical career phases that reflect natural progression in the sport
- Provide detailed analysis narrative that connects achievements to ranking impact
- Only use realistic and sport-appropriate event names and results

Return ONLY valid JSON with no markdown formatting or additional text.`;

    // Use new GoogleGenAI client with proper search grounding
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 1,
        maxOutputTokens: 8000,
        tools: [{ googleSearch: {} }]
      }
    });
    
    let cleanedText = (result.text || "").trim();
    console.log(`Gemini rank response for ${athleteName}:`, cleanedText);
    
    if (!cleanedText) {
      throw new Error("Empty response from Gemini model");
    }
    
    // Clean up response - remove markdown formatting
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Remove any markdown headers or text before JSON
    cleanedText = cleanedText.replace(/^#+.*$/gm, '').trim();
    cleanedText = cleanedText.replace(/^[^{]*/, '').trim();
    
    // Extract JSON more robustly
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      console.error('No valid JSON structure found in rank response:', cleanedText.substring(0, 200));
      throw new Error('Invalid JSON structure in Gemini rank response');
    }
    
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    
    const rankData = JSON.parse(cleanedText);
    console.log(`✅ Gemini successfully generated rank data for ${athleteName}`);
    
    return rankData;
    
  } catch (error) {
    console.error(`Error generating Gemini rank history for ${athleteName}:`, error);
    
    // Throw error to trigger proper error handling in routes.ts
    throw new Error(`AI_WEB_SEARCH_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Bio generation functions using Gemini 2.5 Pro
export async function generateAthleteBiography(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  const prompt = `Today's date is ${currentDate}.
    
    Using Google search, find factual, up-to-date information about the athlete "${name}"${nationalityContext}, who competes in ${sport}.
    
    Create a detailed biography structured with the following headings:
    - An introductory paragraph
    - Players' overall story and what they're known for in ${sport}
    - A heading "Recent Competitions:"
    - A heading "Career Record and Rankings:"
    - A heading "Notable Achievements:"

    Only mention information that is 100% accurate and verifiable.

    IMPORTANT: Do not include any links, URLs, citations, or references in your response. Provide clean text without any reference links or citations.

    For achievements, determine the medal type for each achievement.

    Provide the response as a JSON object with these fields:
    - name: athlete's full name
    - bio: the detailed biography without any links or citations
    - playersStory: a compelling narrative about the athlete's journey and what makes them unique
    - currentRank: current world ranking if available (as number or "N/A")
    - achievements: array of achievement objects with achievement description and medal type
    - recentNews: array of recent news or competition results
    
    CRITICAL ERROR HANDLING:
    - If you cannot find any reliable data through Google search, respond with exactly: {"error": "no_data_found", "success": false}
    - If search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
    - If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}

    Please respond in valid JSON format with these exact fields:
    {
      "name": "athlete's full name",
      "bio": "detailed biography without any links or citations",
      "playersStory": "compelling narrative about the athlete's journey and unique qualities",
      "currentRank": "current world ranking or N/A",
      "achievements": [
        {
          "achievement": "achievement description",
          "medal": "Gold" | "Silver" | "Bronze" | "Participation"
        }
      ],
      "recentNews": ["array of recent news or competition results"]
    }`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 1,
        maxOutputTokens: 8000,
        tools: [{ googleSearch: {} }]
      }
    });
    
    let cleanedText = (result.text || "").trim();
    console.log(`Gemini bio response for ${name}:`, cleanedText);
    
    if (!cleanedText) {
      throw new Error("Empty response from Gemini model");
    }
    
    // Clean up response
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Extract JSON
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }
    
    // Try to parse and handle malformed JSON
    try {
      const athleteData = JSON.parse(cleanedText);
      
      // Check for error responses
      if (athleteData.error && (athleteData.error === 'no_data_found' || athleteData.error === 'search_failed' || athleteData.error === 'not_found')) {
        throw new Error(`AI_WEB_SEARCH_FAILED: ${athleteData.error}`);
      }
      
      if (athleteData.success === false) {
        throw new Error('AI_WEB_SEARCH_FAILED: No authentic athlete data found through Google search');
      }
      
      // Validate required fields
      if (!athleteData.name || !athleteData.bio) {
        throw new Error("Missing required fields in Gemini bio response");
      }
      
      // Ensure arrays are properly formatted
      athleteData.achievements = athleteData.achievements || [];
      athleteData.recentNews = athleteData.recentNews || [];
      
      // Handle rank conversion for both rank and currentRank fields
      if (athleteData.currentRank && typeof athleteData.currentRank === 'string' && !isNaN(Number(athleteData.currentRank)) && athleteData.currentRank !== 'N/A') {
        athleteData.currentRank = Number(athleteData.currentRank);
      }
      // Also handle legacy rank field for backward compatibility - map currentRank to rank for frontend
      if (athleteData.rank && typeof athleteData.rank === 'string' && !isNaN(Number(athleteData.rank)) && athleteData.rank !== 'N/A') {
        athleteData.rank = Number(athleteData.rank);
      }
      
      // Map currentRank to rank for frontend compatibility
      if (athleteData.currentRank !== undefined) {
        athleteData.rank = athleteData.currentRank;
      }
      
      console.log(`✅ Gemini successfully generated bio data for ${name}`);
      console.log('Final athleteData structure:', JSON.stringify(athleteData, null, 2));
      return athleteData;
      
    } catch (parseError) {
      console.log("Initial JSON parse failed, attempting to fix malformed JSON...");
      
      // Try to fix common JSON issues
      let fixedText = cleanedText;
      
      // Fix unescaped newlines in strings
      fixedText = fixedText.replace(/"([^"]*?)\\n\\n([^"]*?)"/g, '"$1 $2"');
      fixedText = fixedText.replace(/"([^"]*?)\\n([^"]*?)"/g, '"$1 $2"');
      
      // Fix truncated strings by completing them
      if (fixedText.endsWith('"') === false && fixedText.includes('"bio":')) {
        const bioMatch = fixedText.match(/"bio":\s*"([^"]*?)$/);
        if (bioMatch) {
          fixedText = fixedText + '"';
        }
      }
      
      // Ensure the JSON object is properly closed
      let braceCount = (fixedText.match(/\{/g) || []).length - (fixedText.match(/\}/g) || []).length;
      let bracketCount = (fixedText.match(/\[/g) || []).length - (fixedText.match(/\]/g) || []).length;
      
      // Add missing closing braces/brackets
      while (braceCount > 0) {
        fixedText += '}';
        braceCount--;
      }
      while (bracketCount > 0) {
        fixedText += ']';
        bracketCount--;
      }
      
      try {
        const athleteData = JSON.parse(fixedText);
        
        // Check for error responses
        if (athleteData.error && (athleteData.error === 'no_data_found' || athleteData.error === 'search_failed' || athleteData.error === 'not_found')) {
          throw new Error(`AI_WEB_SEARCH_FAILED: ${athleteData.error}`);
        }
        
        if (athleteData.success === false) {
          throw new Error('AI_WEB_SEARCH_FAILED: No authentic athlete data found through Google search');
        }
        
        // Validate required fields
        if (!athleteData.name || !athleteData.bio) {
          throw new Error("Missing required fields in fixed Gemini bio response");
        }
        
        // Ensure arrays are properly formatted
        athleteData.achievements = athleteData.achievements || [];
        athleteData.recentNews = athleteData.recentNews || [];
        
        // Handle rank conversion
        if (typeof athleteData.rank === 'string' && !isNaN(Number(athleteData.rank)) && athleteData.rank !== 'N/A') {
          athleteData.rank = Number(athleteData.rank);
        }
        
        console.log(`✅ Gemini successfully generated bio data for ${name} after JSON fix`);
        return athleteData;
        
      } catch (finalError) {
        console.error(`❌ Failed to parse even after fixing JSON for ${name}:`, finalError);
        console.error(`❌ Original content:`, cleanedText);
        console.error(`❌ Fixed content:`, fixedText);
        throw parseError;
      }
    }
    
  } catch (error) {
    console.error(`❌ Error generating Gemini bio for ${name}:`, error);
    throw new Error(`AI_WEB_SEARCH_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Refresh function removed per user request

function getSportFederationUrls(sport: string): string[] {
  const sportLower = sport.toLowerCase();
  
  if (sportLower.includes('taekwondo')) {
    return [
'https://www.taekwondodata.com/ranking_search.html',
    ];
  } else if (sportLower.includes('fencing')) {
    return [
      'https://fie.org/athletes',
      'https://www.eurofencing.info/rankings/individual-rankings'
    ];
  } else if (sportLower.includes('wrestling')) {
    return [
      'https://uww.org/',
      'https://www.flowrestling.org/rankings'
    ];
  } else if (sportLower.includes('squash')) {
    return [
      'https://www.psasquashtour.com/',
      'https://www.worldsquash.org/',
      'https://www.squashinfo.com/rankings'
    ];
  } else if (sportLower.includes('football') || sportLower.includes('soccer')) {
    return [
      'https://inside.fifa.com/fifa-world-ranking/men',
      'https://www.uefa.com/nationalassociations/uefarankings/',
      'https://football-ranking.com/fifa-world-rankings'
    ];
  } else if (sportLower.includes('basketball')) {
    return [
      'https://www.fiba.basketball/',
      'https://www.olympics.com/en/news/fiba-men-basketball-world-ranking'
    ];
  }
  
  // Default federation search URLs
  return [
    `https://www.olympic.org/sports/${sportLower}`,
    `https://en.wikipedia.org/wiki/World_${sport}_rankings`
  ];
}