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
- Each meal should have 2-4 food items with quantities`;

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
    throw new Error(`Failed to generate nutrition plan: ${error instanceof Error ? error.message : String(error)}`);
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

MANDATORY: Use ONLY current web search results from 2024-2025. If specific information cannot be found through web search, clearly state "Information not found through web search" rather than using generic descriptions.`;

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