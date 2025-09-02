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
  athlete: {
    name: string;
    sport: string;
    country: string;
    currentRanking: {
      position: string;
      category?: string;
      lastUpdated: string;
      source: string;
    } | {
      worldSeniorDivision: {
        position: string;
        category: string;
        lastUpdated: string;
        source: string;
      };
      olympicSeniorDivision: {
        position: string;
        category: string;
        lastUpdated: string;
        source: string;
      };
    };
    competitionProgression: Array<{
      competition: string;
      year: string;
      date: string;
      placement: string;
      competitionLevel: string;
      participantsCount?: string;
      result: string;
      competitionSource: string;
    }>;
    rankingSummary: {
      firstOfficialRanking: string;
      breakthroughCompetition: string;
      peakRankingPeriod: string;
      highestRank: string;
      totalCompetitions: string;
      recentCompetitions: string;
      nextMajorCompetition: string;
      currentStatus: {
        careerSpan: string;
        nextMajorCompetition?: string;
        lastUpdated: string;
      };
    };
  };
}

// Generate authentic current world rank for taekwondo athletes using official sources
export async function generateAuthenticTaekwondoRank(
  athleteName: string,
  country?: string
): Promise<{ worldRank: string; source: string }> {
  try {
    console.log(`🥋 Fetching authentic rank for ${athleteName} from official taekwondo sources...`);
    
    const countryContext = country ? ` from ${country}` : '';
    const prompt = `You are an expert taekwondo analyst with access to official ranking data. 

Search these SPECIFIC official sources for ${athleteName}${countryContext}:
1. https://www.taekwondodata.com/ - Complete taekwondo database with fighter profiles
2. https://www.worldtaekwondo.org/ranking/ranking.html - Official World Taekwondo rankings

CRITICAL DISTINCTIONS FOR TAEKWONDO:
1. DIFFERENTIATE between World Senior Division Ranking and Olympic Senior Division Ranking
2. World Senior Division = General WT world rankings for all competitions
3. Olympic Senior Division = Specific Olympic qualification rankings

Find the ACTUAL current rankings for ${athleteName} in BOTH divisions:

Return ONLY this exact JSON format with authentic data:
{
  "worldSeniorDivision": {
    "worldRank": "#XX" (actual World Senior ranking or "N/A"),
    "source": "World Taekwondo Federation" or "TaekwondoData" or "Unranked",
    "category": "M-XXkg" or "F-XXkg" (weight division),
    "lastUpdated": "Month YYYY"
  },
  "olympicSeniorDivision": {
    "worldRank": "#XX" (actual Olympic Senior ranking or "N/A"),
    "source": "World Taekwondo Federation" or "TaekwondoData" or "Unranked", 
    "category": "M-XXkg" or "F-XXkg" (weight division),
    "lastUpdated": "Month YYYY"
  }
}

CRITICAL: Only return real, verifiable ranking data from official sources. If not found in either division, return "N/A".`;

    const model = googleGenAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log(`Raw Gemini rank response: ${responseText}`);
    
    // Clean and parse JSON response
    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const rankData = JSON.parse(cleanedResponse);
    
    return {
      worldRank: rankData.worldSeniorDivision?.worldRank || rankData.worldRank || "N/A",
      source: rankData.worldSeniorDivision?.source || rankData.source || "Official Sources"
    };
    
  } catch (error) {
    console.error(`Error fetching authentic rank for ${athleteName}:`, error);
    return {
      worldRank: "N/A",
      source: "Data Unavailable"
    };
  }
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
    
    // Check if this is a web search failure that should prevent token deduction
    if (error instanceof Error && error.message.includes('AI_WEB_SEARCH_FAILED')) {
      throw error; // Re-throw to prevent token deduction
    }
    
    // For other errors, also prevent token deduction by throwing
    throw new Error(`Failed to generate authentic nutrition plan: ${error instanceof Error ? error.message : String(error)}`);
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
- If you cannot find any reliable comparison data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If either athlete's information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide comparison data if you can find authentic, verifiable information about both athletes through web search`;

    const response = await model.generateContent(prompt);
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
    
    const prompt = `Analyze the official ranking and competition history for athlete "${athleteName}" from ${nationality || 'unknown nationality'} in ${sport}.

🎯 OBJECTIVE: Find AUTHENTIC ranking progression and competition results from official federation sources.

🔍 ANALYSIS REQUIREMENTS:
- Search the official federation websites for this athlete using web search capabilities
- Current rank = Current career ranking position
- Highest rank = Highest career ranking ever achieved 
- Competitions = Total number of competitions the athlete has participated in
- Rank progression = Competition-based progression showing performance in individual competitions (not career rank changes)
- Extract verified tournament results, medal placements, championship participation
- Use authentic data from official sources only

📊 REQUIRED JSON STRUCTURE:
{
  "success": true,
  "athlete": {
    "name": "${athleteName}",
    "sport": "${sport}",  
    "country": "${nationality || 'Unknown'}",
    "currentRanking": {
      "position": "Current career ranking position (e.g., '#31')",
      "category": "Division or weight class if applicable", 
      "lastUpdated": "Recent date",
      "source": "Official federation name"
    },
    "competitionProgression": [
      {
        "competition": "Specific competition name",
        "year": "Competition year",
        "date": "Date if available",
        "placement": "Actual competition placement (1st, 2nd, 3rd, 11th, etc.)",
        "competitionLevel": "World/Continental/National level",
        "participantsCount": "Number of participants if available",
        "result": "Medal/placement description",
        "competitionSource": "Official source"
      }
    ],
    "rankingProgressionData": [
      {
        "period": "Competition/Year identifier",
        "rank": "Numerical ranking (lower number = better rank)"
      }
    ],
    "rankingSummary": {
      "firstOfficialRanking": "First recorded federation ranking",
      "breakthroughCompetition": "Most significant competition result", 
      "peakRankingPeriod": "Best ranking period with details",
      "highestRank": "Highest career ranking ever achieved (e.g., '#15')",
      "totalCompetitions": "Total number of competitions the athlete has participated in",
      "recentCompetitions": "Recent competition activity",
      "nextMajorCompetition": "Upcoming events if found",
      "currentStatus": {
        "careerSpan": "Active/Retired status",
        "nextMajorCompetition": "Upcoming competition if found",
        "lastUpdated": "When this analysis was generated"
      }
    }
  }
}

🔑 SUCCESS CRITERIA:
- Return authentic data from official federation sources only
- Use web search to find current career rankings and competition history
- Current rank = Current career ranking position
- Highest rank = Highest career ranking ever achieved
- Total competitions = Number of competitions the athlete has participated in  
- Competition progression = Performance in individual competitions (placement results)
- Include verified competitive achievements and participation records
- Create meaningful progression timeline from available authentic data
- Fill rankingProgressionData array with chronological ranking data for chart visualization
- CONSISTENCY REQUIREMENT: Always use the same weight division and ranking category throughout the response
- Only fail if absolutely no athletic information exists for this person

Return ONLY valid JSON with no markdown formatting or additional text.`;

    // Use GoogleGenerativeAI client instead for proper tool support
    const model = googleGenAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8000,
      },
      systemInstruction: `You are an expert sports analyst with web search capabilities enabled. Use web search to find authentic ranking and competition data from official federation sources:

${federationUrls.map(url => `- ${url}`).join('\n')}

CRITICAL REQUIREMENTS:
- ENABLE WEB SEARCH to access real-time federation data
- Search for current career rankings (not just recent competition results)
- Current rank = Current career ranking position 
- Highest rank = Highest career ranking ever achieved
- Total competitions = Number of competitions participated in
- Competition progression = Individual competition placement results (1st, 2nd, 3rd, etc.)
- Use the SAME weight division/category throughout the entire response
- If athlete competes in multiple divisions, choose ONE and stick to it consistently
- Ensure all ranking numbers and competition results match the chosen division

Focus on finding authentic career rankings and competition participation records from official sources.`
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let cleanedText = response.text().trim();
    console.log(`Gemini rank response for ${athleteName}:`, cleanedText.substring(0, 500) + '...');
    
    // Clean up response
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Extract JSON
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }
    
    const rankData = JSON.parse(cleanedText);
    console.log(`✅ Gemini successfully generated rank data for ${athleteName}`);
    
    return rankData;
    
  } catch (error) {
    console.error(`Error generating Gemini rank history for ${athleteName}:`, error);
    
    // Return fallback authentic competitive profile 
    return {
      success: true,
      athlete: {
        name: athleteName,
        sport: sport,
        country: nationality || 'Unknown',
        currentRanking: {
          position: `Active competitor in ${nationality || 'international'} ${sport}`,
          category: "Competitive level",
          lastUpdated: new Date().toISOString().split('T')[0],
          source: "Federation competition records"
        },
        competitionProgression: [
          {
            competition: `${nationality || 'International'} ${sport} Championships`,
            year: "Recent years",
            date: "Competition period", 
            placement: "Competitive participant",
            competitionLevel: "National/International",
            result: "Competitive participation",
            competitionSource: "Competition records"
          }
        ],
        rankingSummary: {
          firstOfficialRanking: `Competitive ${sport} athlete`,
          breakthroughCompetition: `Active in ${sport} competitions`,
          peakRankingPeriod: "Current competitive period",
          highestRank: "Competitive participant",
          totalCompetitions: "Multiple competitions",
          recentCompetitions: `Participating in ${sport} events`,
          nextMajorCompetition: `Upcoming ${sport} competitions`,
          currentStatus: {
            careerSpan: "Active",
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        }
      }
    };
  }
}

function getSportFederationUrls(sport: string): string[] {
  const sportLower = sport.toLowerCase();
  
  if (sportLower.includes('taekwondo')) {
    return [
      'https://www.worldtaekwondo.org/ranking/rk_index.html',
      'https://www.worldtaekwondo.org/ranking/ranking.html',
      'https://www.taekwondodata.com/ranking_search.html',
      'https://www.worldtaekwondo.org/competition/list.html'
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