import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import { DevelopmentPlanV1, developmentPlanV1Schema, Exercise, Video } from '../shared/schema.js';

// Initialize Gemini API clients
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const googleGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface NutritionPlanData {
  plan: string;
}

export interface NutritionPlanFormData {
  goal: string;
  age: number;
  height: number; // in cm
  currentWeight: number; // in kg
  targetWeight: number; // in kg  
  period: number; // in weeks
  sportName: string;
  country: string;
  language: string;
  gender?: string; // optional, defaults to 'Unknown'
  name?: string; // optional, defaults to 'User'
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
  instructions: string;
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

// Enhanced nutrition plan function that accepts comprehensive form data
// Helper function to summarize previous weeks for variety context
function summarizePreviousWeeks(previousWeeks: NutritionPlanDay[][]): string {
  if (previousWeeks.length === 0) return "";
  
  const usedProteins = new Set<string>();
  const usedGrains = new Set<string>();
  const usedMeals = new Set<string>();
  
  previousWeeks.forEach(week => {
    week.forEach(day => {
      day.meals.forEach(meal => {
        // Extract proteins and grains from meal descriptions
        meal.meal_description.forEach(item => {
          const lowerItem = item.toLowerCase();
          
          // Common proteins
          if (lowerItem.includes('chicken')) usedProteins.add('chicken');
          if (lowerItem.includes('fish') || lowerItem.includes('salmon') || lowerItem.includes('tuna')) usedProteins.add('fish');
          if (lowerItem.includes('beef') || lowerItem.includes('meat')) usedProteins.add('beef');
          if (lowerItem.includes('egg')) usedProteins.add('eggs');
          if (lowerItem.includes('lentil') || lowerItem.includes('bean') || lowerItem.includes('chickpea')) usedProteins.add('legumes');
          
          // Common grains
          if (lowerItem.includes('rice')) usedGrains.add('rice');
          if (lowerItem.includes('bread') || lowerItem.includes('aish')) usedGrains.add('bread');
          if (lowerItem.includes('pasta')) usedGrains.add('pasta');
          if (lowerItem.includes('bulgur')) usedGrains.add('bulgur');
          if (lowerItem.includes('freekeh')) usedGrains.add('freekeh');
          
          // Store simplified meal names
          usedMeals.add(lowerItem.split(' ').slice(0, 3).join(' '));
        });
      });
    });
  });
  
  return `Previously used proteins: ${Array.from(usedProteins).join(', ')}. Previously used grains: ${Array.from(usedGrains).join(', ')}. Avoid repeating these exact meal combinations: ${Array.from(usedMeals).slice(0, 10).join(', ')}.`;
}

// Helper function to repair malformed JSON strings
function repairJsonString(jsonStr: string): string {
  try {
    // Step 1: Find the actual JSON boundaries
    const firstBraceIndex = jsonStr.indexOf('{');
    const lastBraceIndex = jsonStr.lastIndexOf('}');
    
    if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
      // Extract only the JSON content between the outermost braces
      jsonStr = jsonStr.substring(firstBraceIndex, lastBraceIndex + 1);
    }
    
    // Step 2: Fix common JSON issues
    jsonStr = jsonStr
      // Fix unescaped quotes in Arabic meal descriptions
      .replace(/": "([^"]*)"([^",\]}]*)"([^",\]}]*)",/g, '": "$1\\"$2\\"$3",')
      // Fix line breaks in strings
      .replace(/": "([^"]*)\n([^"]*)",/g, '": "$1\\n$2",')
      // Fix trailing commas before closing brackets/braces
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing quotes around property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Ensure proper string escaping for backslashes
      .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
      // Remove any standalone quotes at the end
      .replace(/\s*"?\s*$/, '');
      
    // Step 3: Validate and fix array/object structure
    const openBraces = (jsonStr.match(/{/g) || []).length;
    const closeBraces = (jsonStr.match(/}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    
    // Step 4: Fix incomplete JSON structure by analyzing the end
    // Check if we have incomplete meals array
    if (jsonStr.includes('"meals": [') && !jsonStr.includes('"meals": []')) {
      // Find the last incomplete meal object
      const mealsStartIndex = jsonStr.lastIndexOf('"meals": [');
      if (mealsStartIndex !== -1) {
        const afterMeals = jsonStr.substring(mealsStartIndex);
        // Count braces after meals array starts
        const mealsBraces = (afterMeals.match(/{/g) || []).length;
        const mealsCloseBraces = (afterMeals.match(/}/g) || []).length;
        
        // If meals array is incomplete, try to fix it
        if (mealsBraces > mealsCloseBraces) {
          // Add missing closing braces for meal objects
          const missingMealBraces = mealsBraces - mealsCloseBraces;
          
          // Find if we need to close the meals array too
          const mealsArrayClosed = jsonStr.substring(mealsStartIndex).includes(']');
          
          if (!mealsArrayClosed) {
            // Close meal objects and meals array
            jsonStr += '}'.repeat(missingMealBraces) + ']';
          } else {
            // Just close meal objects
            jsonStr += '}'.repeat(missingMealBraces);
          }
        }
      }
    }
    
    // Step 5: Add missing closing brackets and braces
    if (openBrackets > closeBrackets) {
      jsonStr += ']'.repeat(openBrackets - closeBrackets);
    }
    
    if (openBraces > closeBraces) {
      jsonStr += '}'.repeat(openBraces - closeBraces);
    }
    
    // Step 6: Remove excessive closing braces/brackets
    jsonStr = jsonStr.replace(/}+$/, '}').replace(/]+$/, ']');
    
    return jsonStr.trim();
  } catch (error) {
    console.error('JSON repair failed:', error);
    return jsonStr;
  }
}

// Helper function to detect excessive duplicates in a week
function detectDuplicates(week: NutritionPlanDay[], previousWeeks: NutritionPlanDay[][]): boolean {
  const currentMeals = new Set<string>();
  const previousMeals = new Set<string>();
  
  // Collect current week meals
  week.forEach(day => {
    day.meals.forEach(meal => {
      meal.meal_description.forEach(item => {
        currentMeals.add(item.toLowerCase().trim());
      });
    });
  });
  
  // Collect previous weeks meals
  previousWeeks.forEach(prevWeek => {
    prevWeek.forEach(day => {
      day.meals.forEach(meal => {
        meal.meal_description.forEach(item => {
          previousMeals.add(item.toLowerCase().trim());
        });
      });
    });
  });
  
  // Check for excessive overlap (>40% = violation of 60-70% different requirement)
  const overlap = Array.from(currentMeals).filter(meal => previousMeals.has(meal));
  const overlapRatio = overlap.length / currentMeals.size;
  
  return overlapRatio > 0.4; // More than 40% overlap is too much
}

// Helper interface for single week generation
interface GenerateSingleWeekParams {
  weekNumber: number;
  startDate: Date;
  formData: NutritionPlanFormData;
  nationalityText: string;
  genderText: string;
  isArabic: boolean;
  varietyContext: string;
}

// Generate a single week's worth of nutrition plan (7 days)
async function generateSingleWeek(params: GenerateSingleWeekParams): Promise<{
  instructions: string;
  days: NutritionPlanDay[];
}> {
  const {
    weekNumber,
    startDate,
    formData,
    nationalityText,
    genderText,
    isArabic,
    varietyContext
  } = params;

  const {
    goal,
    age,
    height,
    currentWeight,
    targetWeight,
    period,
    sportName,
    country,
    language,
    name = 'User'
  } = formData;

  // Generate the 7 days for this week
  const weekDays: NutritionPlanDay[] = [];
  const dayNames = isArabic 
    ? ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let dayNum = 0; dayNum < 7; dayNum++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + dayNum);
    const dayDateStr = dayDate.toISOString().split('T')[0];

    weekDays.push({
      day: {
        date: dayDateStr,
        name: dayNames[dayNum]
      },
      meals: [], // Will be filled by AI
      explanation: '', // Will be filled by AI
      total_calories_intake: '' // Will be filled by AI
    });
  }

  // Build the prompt for this specific week
  const systemPrompt = isArabic ? 
    `أنت خبير تغذية رياضية متخصص في تصميم خطط غذائية شخصية للرياضيين.` :
    `You are a sports nutrition expert specializing in personalized nutrition plans for athletes.`;

  // No week-specific instructions - only generate meal data for each week

  const prompt = isArabic ?
    `قم بإنشاء خطة غذائية للأسبوع رقم ${weekNumber} (7 أيام):

الرياضي: ${name} (${genderText} من ${nationalityText})
الرياضة: ${sportName}
الهدف: ${goal}
الطول: ${height} سم
الوزن الحالي: ${currentWeight} كغ
الوزن المستهدف: ${targetWeight} كغ
إجمالي الفترة: ${period} أسبوع

${varietyContext}

مهم جداً: أرجع JSON صالح فقط بهذا التركيب الدقيق:

{
  "instructions": "Week ${weekNumber} meals only - no overall plan instructions needed",
  "days": [
    {
      "day": {
        "date": "${weekDays[0].day.date}",
        "name": "${weekDays[0].day.name}"
      },
      "meals": [
        {
          "calories_intake": "500 سعرة حرارية",
          "meal_description": ["أطعمة ${nationalityText} تقليدية مع الكميات"]
        }
      ],
      "explanation": "لماذا يدعم هذا اليوم أداء ${sportName}",
      "total_calories_intake": "2300 سعرة حرارية"
    }
  ]
}

متطلبات الأسبوع ${weekNumber}:
- 7 أيام كاملة (${dayNames.join('، ')})
- 5 وجبات يومياً مناسبة لرياضة ${sportName}
- استخدم أطعمة ${nationalityText} متنوعة
- احسب السعرات حسب الهدف: ${goal}` :
    `Create a nutrition plan for Week ${weekNumber} (7 days):

Athlete: ${name} (${genderText} from ${nationalityText})
Sport: ${sportName}
Goal: ${goal}
Height: ${height}cm
Current Weight: ${currentWeight}kg
Target Weight: ${targetWeight}kg
Total Period: ${period} weeks

${varietyContext}

CRITICAL: Return ONLY valid JSON in this EXACT structure:

{
  "instructions": "Week ${weekNumber} meals only - no overall plan instructions needed",
  "days": [
    {
      "day": {
        "date": "${weekDays[0].day.date}",
        "name": "${weekDays[0].day.name}"
      },
      "meals": [
        {
          "calories_intake": "500 kcal",
          "meal_description": ["Traditional ${nationalityText} foods with quantities"]
        }
      ],
      "explanation": "Why this daily plan supports ${sportName} performance",
      "total_calories_intake": "2300 kcal"
    }
  ]
}

Requirements for Week ${weekNumber}:
- 7 complete days (${dayNames.join(', ')})
- 5 meals per day suitable for ${sportName}
- Use varied ${nationalityText} foods
- Calculate calories for goal: ${goal}`;

  // JSON schema for the week response
  const weekSchema = {
    type: "object",
    properties: {
      instructions: {
        type: "string"
      },
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
    required: ["instructions", "days"]
  };

  try {
    console.log(`⏳ Generating Week ${weekNumber} nutrition plan...`);
    const weekStartTime = Date.now();

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: weekSchema,
        temperature: 0.2,
        maxOutputTokens: 8000 // Reasonable limit for 7 days
      },
      contents: prompt
    });

    const duration = Date.now() - weekStartTime;
    console.log(`✅ Week ${weekNumber} generated in ${duration}ms`);

    const responseText = result?.text || "{}";
    
    // Clean and parse the JSON response with robust repair
    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    cleanedResponse = cleanedResponse.replace(/^```/, '').replace(/```$/, '');
    
    // Advanced JSON repair
    cleanedResponse = repairJsonString(cleanedResponse);

    let weekPlan: { instructions: string; days: NutritionPlanDay[] };
    try {
      weekPlan = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error(`❌ Week ${weekNumber} JSON parsing failed:`, parseError);
      console.error(`❌ Problematic JSON (first 500 chars):`, cleanedResponse.substring(0, 500));
      console.error(`❌ Problematic JSON (last 500 chars):`, cleanedResponse.substring(Math.max(0, cleanedResponse.length - 500)));
      throw new Error(`AI_JSON_PARSE_FAILED: Week ${weekNumber} returned invalid JSON`);
    }

    // Validate the response has 7 days
    if (!weekPlan.days || weekPlan.days.length !== 7) {
      console.error(`❌ Week ${weekNumber} returned ${weekPlan.days?.length || 0} days instead of 7`);
      console.error(`❌ Week ${weekNumber} complete response:`, JSON.stringify(weekPlan, null, 2));
      console.error(`❌ Week ${weekNumber} raw response (first 1000 chars):`, cleanedResponse.substring(0, 1000));
      throw new Error(`AI_INVALID_RESPONSE: Week ${weekNumber} must have exactly 7 days`);
    }

    console.log(`✅ Week ${weekNumber} validated: ${weekPlan.days.length} days`);
    return weekPlan;

  } catch (error) {
    console.error(`❌ Error generating Week ${weekNumber}:`, error);
    throw error;
  }
}

export async function generateEnhancedNutritionPlan(
  formData: NutritionPlanFormData
): Promise<NutritionPlanData> {
  try {
    const {
      goal,
      age,
      height,
      currentWeight,
      targetWeight,
      period,
      sportName,
      country,
      language,
      gender = 'Unknown',
      name = 'User'
    } = formData;

    const nationalityText = country === 'International' ? 'international' : country;
    const genderText = gender === 'Unknown' ? 'athlete' : `${age} years old ${gender}`;
    
    // Get current date for accurate nutrition plan scheduling
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    console.log(`🧵 Starting THREADED nutrition plan generation: ${period} weeks for ${sportName} athlete`);
    const startTime = Date.now();
    
    // Language-specific prompts
    const isArabic = language === 'ar';
    
    // Generate overall plan instructions (not week-specific)
    const overallInstructions = isArabic ?
      `هذه خطة تغذية شخصية لمدة ${period} أسابيع مصممة خصيصاً لك لتحقيق هدفك: ${goal}. الخطة تركز على الطعام ${nationalityText} التقليدي مع المكونات المناسبة لرياضة ${sportName}. اتبع الخطة بدقة واشرب 3-4 لتر من الماء يومياً. كل وجبة محسوبة السعرات لتحقيق هدفك من ${currentWeight}كغ إلى ${targetWeight}كغ. استشر طبيبك قبل البدء بأي نظام غذائي جديد.` :
      `This is a personalized ${period}-week nutrition plan designed specifically for you to achieve your goal: ${goal}. The plan focuses on traditional ${nationalityText} foods with components suitable for ${sportName}. Follow the plan precisely and drink 3-4 liters of water daily. Each meal is calorie-calculated to help you reach your goal from ${currentWeight}kg to ${targetWeight}kg. Consult your doctor before starting any new nutrition plan.`;

    // Store all weeks and track variety
    const allWeeks: NutritionPlanDay[][] = [];
    
    // Generate week by week for better reliability and variety control
    for (let weekNum = 1; weekNum <= period; weekNum++) {
      console.log(`📅 Generating week ${weekNum}/${period}...`);
      
      // Calculate start date for this week
      const weekStartDate = new Date(currentDate);
      weekStartDate.setDate(currentDate.getDate() + (weekNum - 1) * 7);
      
      // Limit context to prevent token overflow - only use last 1-2 weeks
      const recentWeeks = allWeeks.slice(-2); // Only last 2 weeks maximum
      const previousWeeksSummary = summarizePreviousWeeks(recentWeeks);
      const varietyContext = weekNum > 1 ? 
        `VARIETY REQUIREMENT: This week must be 60-70% different from recent weeks. ${previousWeeksSummary.substring(0, 800)}` : // Limit to 800 chars
        'This is the first week - establish a strong foundation.';
      
      // Try generating the week with retry logic
      let weekResult: { instructions: string; days: NutritionPlanDay[] } | undefined;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          // Use simpler context for retries
          const retryVarietyContext = attempts > 1 ? 
            'Generate varied meals different from previous weeks.' : 
            varietyContext;
            
          weekResult = await generateSingleWeek({
            weekNumber: weekNum,
            startDate: weekStartDate,
            formData,
            nationalityText,
            genderText,
            isArabic,
            varietyContext: retryVarietyContext
          });
          
          // Success - break out of retry loop
          break;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`⚠️ Week ${weekNum} attempt ${attempts} failed:`, errorMessage);
          
          if (attempts === maxAttempts) {
            throw error; // Final attempt failed
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      // Ensure weekResult exists before proceeding
      if (!weekResult) {
        throw new Error(`Failed to generate Week ${weekNum} after ${maxAttempts} attempts`);
      }
      
      allWeeks.push(weekResult.days);
      // Instructions are now generated overall, not per week
      
      console.log(`✅ Week ${weekNum} generated: ${weekResult.days.length} days (attempt ${attempts})`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`🎉 THREADED generation complete: ${period} weeks in ${duration}ms`);
    
    // Combine all weeks into final plan
    const allDays = allWeeks.flat();
    const finalPlan: StructuredNutritionPlan = {
      instructions: overallInstructions,
      days: allDays
    };
    
    console.log(`📊 Final plan: ${finalPlan.days.length} total days across ${period} weeks`);
    
    return {
      plan: JSON.stringify(finalPlan)
    };
  } catch (error) {
    console.error("Error generating enhanced nutrition plan:", error);
    
    // For critical errors (JSON parsing, timeout, etc.), re-throw so tokens aren't deducted
    if (error instanceof Error) {
      if (error.message.includes('AI_JSON_PARSE_FAILED') ||
          error.message.includes('AI_TIMEOUT') ||
          error.message.includes('ROUTE_TIMEOUT')) {
        // Re-throw critical errors so route can handle them properly (no token deduction)
        throw error;
      }
      
      // Only convert web search failures to error response objects
      if (error.message.includes('AI_WEB_SEARCH_FAILED')) {
        const errorResponse = {
          error: true,
          errorType: "web_search_failed",
          errorMessage: `Unable to generate nutrition plan: ${error.message}`,
          retryable: true,
          suggestion: "Please try again or check if the athlete information is correct",
          days: []
        };
        
        return {
          plan: JSON.stringify(errorResponse)
        };
      }
    }
    
    // For other unexpected errors, re-throw them
    throw error;
  }
}

// Keep the original function for backward compatibility
export async function generateNutritionPlan(
  name: string,
  age: number,
  gender: string,
  sport: string,
  nationality: string,
  period: number = 1
): Promise<NutritionPlanData> {
  try {
    const nationalityText = nationality === 'International' ? 'international' : nationality;
    const genderText = gender === 'Unknown' ? 'athlete' : `${age} years old ${gender}`;
    
    // Calculate total days based on period (default 1 week for backward compatibility)
    const totalDays = period * 7;
    
    // Get current date for accurate nutrition plan scheduling
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const systemPrompt = `You are a professional sports nutritionist specializing in ${nationalityText} cuisine. Create a ${period}-week nutrition plan (${totalDays} days) in JSON format only. Do not include any text before or after the JSON. The response must be valid JSON without any markdown formatting.`;
    
    const prompt = `Create a personalized ${period}-week nutrition plan (${totalDays} days) for this athlete:

Athlete: ${name} (${genderText} from ${nationalityText})
Sport: ${sport}

CRITICAL: Return ONLY valid JSON in this EXACT structure with no additional text, no markdown, no explanations:

{
  "days": [
    {
      "day": {
        "date": "${currentDateStr}",
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
- Generate ${totalDays} complete days (${period} weeks)
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
      model: "gemini-2.5-flash",
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
        instructions: `General nutrition instructions for ${sport} athlete from ${nationality}. Focus on balanced meals, proper hydration, and adequate recovery nutrition.`,
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
    
    // Return structured error response in proper NutritionPlanData format
    const errorResponse = {
      error: true,
      errorType: error instanceof Error && error.message.includes('AI_WEB_SEARCH_FAILED') ? "web_search_failed" : "parsing_error",
      errorMessage: `Unable to generate nutrition plan: ${error instanceof Error ? error.message : String(error)}`,
      retryable: true,
      suggestion: "Please try again or check if the athlete information is correct",
      days: []
    };
    
    return {
      plan: JSON.stringify(errorResponse)
    };
  }
}

// Modular Gemini-2.5-pro comparison functions for each tab

// 1. Overview Tab - Basic athlete information and rankings
export async function generateOverviewComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const prompt = `You are an expert ${sport} analyst with Google search capabilities. Find current ranking and basic information for these two athletes.

ATHLETES TO ANALYZE:
Athlete 1: ${athlete1.name} from ${athlete1.country} (${sport})
Athlete 2: ${athlete2.name} from ${athlete2.country} (${sport})

MANDATORY: Use Google search to find current World ${sport} rankings 2024-2025.

Return ONLY pure JSON (no markdown blocks):
{
  "athlete1": {
    "name": "${athlete1.name}",
    "country": "${athlete1.country}", 
    "rank": "Current world ranking from search or 'Unranked'",
    "profileImageUrl": "${athlete1.profileImageUrl || ''}"
  },
  "athlete2": {
    "name": "${athlete2.name}",
    "country": "${athlete2.country}",
    "rank": "Current world ranking from search or 'Unranked'", 
    "profileImageUrl": "${athlete2.profileImageUrl || ''}"
  },
  "overallAnalysis": {
    "summary": "Brief comparison summary based on rankings and recent form",
    "betterAthlete": "athlete1, athlete2, or even",
    "reasonsWhy": ["Primary reasons based on current standings"],
    "closeness": "clear-difference, somewhat-close, or very-close"
  }
}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    responseText = responseText.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      tabType: "overview"
    };
  } catch (error) {
    console.error("Error generating overview comparison:", error);
    throw new Error(`Failed to generate overview: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 2. Strengths Tab - Detailed strength analysis
export async function generateStrengthsComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const prompt = `You are an expert ${sport} analyst. Analyze the specific strengths of these two athletes using Google search.

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for technical skills, recent performances, signature techniques, and competitive advantages.

Return ONLY pure JSON:
{
  "strengths": {
    "athlete1": [
      {
        "title": "Specific strength name",
        "description": "Detailed explanation with evidence",
        "rating": 90,
        "evidence": "Recent examples from competitions"
      }
    ],
    "athlete2": [
      {
        "title": "Specific strength name", 
        "description": "Detailed explanation with evidence",
        "rating": 88,
        "evidence": "Recent examples from competitions"
      }
    ],
    "advantage": "athlete1, athlete2, or even"
  }
}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 3072,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    responseText = responseText.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      tabType: "strengths"
    };
  } catch (error) {
    console.error("Error generating strengths comparison:", error);
    throw new Error(`Failed to generate strengths: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 3. Weaknesses Tab - Detailed weakness analysis
export async function generateWeaknessesComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const prompt = `You are an expert ${sport} analyst. Analyze areas for improvement and weaknesses for these athletes using Google search.

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for technical weaknesses, past struggles, and areas opponents have exploited.

Return ONLY pure JSON:
{
  "weaknesses": {
    "athlete1": [
      {
        "title": "Area for improvement",
        "description": "Detailed explanation",
        "impact": "high, medium, or low",
        "exploitation": "How opponents can exploit this"
      }
    ],
    "athlete2": [
      {
        "title": "Area for improvement",
        "description": "Detailed explanation", 
        "impact": "high, medium, or low",
        "exploitation": "How opponents can exploit this"
      }
    ],
    "advantage": "athlete1, athlete2, or even"
  }
}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 3072,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    responseText = responseText.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      tabType: "weaknesses"
    };
  } catch (error) {
    console.error("Error generating weaknesses comparison:", error);
    throw new Error(`Failed to generate weaknesses: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 4. Competition History Tab - Career achievements and trajectory
export async function generateCompetitionHistoryComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const prompt = `You are an expert ${sport} analyst. Research the competition history and achievements of these athletes using Google search.

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for major tournament wins, career milestones, ranking progression, and recent competition results.

Return ONLY pure JSON:
{
  "ranking": {
    "comparison": "Current ranking analysis from search",
    "athlete1Trajectory": "Recent ranking progression and trajectory",
    "athlete2Trajectory": "Recent ranking progression and trajectory", 
    "competitiveEdge": "athlete1, athlete2, or even"
  }
}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 3072,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    responseText = responseText.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      tabType: "competition-history"
    };
  } catch (error) {
    console.error("Error generating competition history:", error);
    throw new Error(`Failed to generate competition history: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 5. Head-to-Head Tab - Direct prediction and match analysis
export async function generateHeadToHeadComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const prompt = `You are an expert ${sport} analyst. Provide head-to-head prediction analysis for these athletes using Google search.

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for previous meetings, fighting styles, recent form, and expert predictions.

Return ONLY pure JSON:
{
  "headToHead": {
    "prediction": "athlete1 or athlete2",
    "confidence": 75,
    "reasoning": "Comprehensive prediction based on analysis",
    "keyFactors": [
      "Most important factor",
      "Second factor",
      "Third factor"
    ],
    "scenario": "Detailed match scenario prediction",
    "tacticalAdvice": {
      "forAthlete1": "Strategic advice based on opponent analysis",
      "forAthlete2": "Strategic advice based on opponent analysis"
    },
    "historicalContext": "Previous meetings or similar matchups",
    "expertPredictions": "Expert opinions from search or 'No predictions found'"
  }
}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    responseText = responseText.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      tabType: "head-to-head"
    };
  } catch (error) {
    console.error("Error generating head-to-head comparison:", error);
    throw new Error(`Failed to generate head-to-head: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 6. Details Tab - Comprehensive technical analysis
export async function generateDetailsComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const prompt = `You are an expert ${sport} analyst. Provide detailed technical analysis of these athletes using Google search.

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for physical attributes, technical skills, training methods, and performance metrics.

Return ONLY pure JSON:
{
  "detailedAnalysis": {
    "athlete1": {
      "name": "${athlete1.name}",
      "country": "${athlete1.country}",
      "currentForm": "Recent performance analysis",
      "technicalSkills": [
        {
          "skill": "Specific technique name",
          "proficiency": 95,
          "description": "Analysis with evidence",
          "evidence": "Examples from recent competitions"
        }
      ],
      "physicalAttributes": {
        "height": "From search or 'Not found'",
        "weight": "Competition weight class",
        "reach": "From search or 'Not found'", 
        "stance": "Fighting stance",
        "strengths": ["Physical advantages"]
      },
      "recentPerformance": {
        "wins": "Recent win count",
        "losses": "Recent loss count",
        "lastCompetition": "Most recent competition", 
        "rankingChange": "Recent ranking progression",
        "form": "Current form assessment"
      }
    },
    "athlete2": {
      "name": "${athlete2.name}",
      "country": "${athlete2.country}",
      "currentForm": "Recent performance analysis",
      "technicalSkills": [
        {
          "skill": "Specific technique name", 
          "proficiency": 92,
          "description": "Analysis with evidence",
          "evidence": "Examples from recent competitions"
        }
      ],
      "physicalAttributes": {
        "height": "From search or 'Not found'",
        "weight": "Competition weight class",
        "reach": "From search or 'Not found'",
        "stance": "Fighting stance", 
        "strengths": ["Physical advantages"]
      },
      "recentPerformance": {
        "wins": "Recent win count",
        "losses": "Recent loss count",
        "lastCompetition": "Most recent competition",
        "rankingChange": "Recent ranking progression", 
        "form": "Current form assessment"
      }
    }
  }
}`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 6144,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    responseText = responseText.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      tabType: "details"
    };
  } catch (error) {
    console.error("Error generating details comparison:", error);
    throw new Error(`Failed to generate details: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Legacy comprehensive comparison function (kept for backward compatibility)
export async function generateComprehensiveAthleteComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const timestamp = new Date().toISOString();
    const sessionId = Math.random().toString(36).substring(7);

    console.log(`[GEMINI] Starting comprehensive comparison: ${athlete1.name} vs ${athlete2.name}`);

    const prompt = `You are an expert ${sport} analyst with advanced Google search capabilities. You MUST use the Google search tool extensively to find the most current and comprehensive information about these two athletes for a complete comparison.

Session ID: ${sessionId} - Generation Time: ${timestamp}

ATHLETES TO ANALYZE:
Athlete 1: ${athlete1.name} from ${athlete1.country} (${sport})
Athlete 2: ${athlete2.name} from ${athlete2.country} (${sport})

MANDATORY GOOGLE SEARCH REQUIREMENTS:
1. SEARCH for current World ${sport} rankings 2024-2025 for both athletes
2. SEARCH for recent competition results and tournament performances 2024-2025
3. SEARCH for technical analysis, fighting styles, and signature techniques
4. SEARCH for head-to-head records if they've competed against each other
5. SEARCH for expert analysis and predictions from sports analysts
6. SEARCH for physical attributes, training methods, and performance metrics
7. SEARCH for career achievements, major titles, and competition history

CRITICAL JSON FORMATTING REQUIREMENTS:
- Return ONLY pure JSON with no markdown blocks, explanations, or additional text
- Ensure complete JSON structure with all opening and closing braces matched
- Prioritize completing JSON structure over including all details if response gets long
- All string values must be properly quoted and escaped
- No trailing commas in objects or arrays

COMPREHENSIVE COMPARISON STRUCTURE (return as pure JSON):
{
  "athlete1": {
    "name": "${athlete1.name}",
    "country": "${athlete1.country}",
    "rank": "Current world ranking from Google search",
    "profileImageUrl": "${athlete1.profileImageUrl || ''}"
  },
  "athlete2": {
    "name": "${athlete2.name}",
    "country": "${athlete2.country}",
    "rank": "Current world ranking from Google search",
    "profileImageUrl": "${athlete2.profileImageUrl || ''}"
  },
  "strengths": {
    "athlete1": [
      {
        "title": "Specific strength from search analysis",
        "description": "Detailed explanation with evidence",
        "rating": 90,
        "evidence": "Specific examples from recent competitions found via search"
      }
    ],
    "athlete2": [
      {
        "title": "Specific strength from search analysis", 
        "description": "Detailed explanation with evidence",
        "rating": 88,
        "evidence": "Specific examples from recent competitions found via search"
      }
    ],
    "advantage": "athlete1 or athlete2 based on analysis"
  },
  "weaknesses": {
    "athlete1": [
      {
        "title": "Area for improvement from analysis",
        "description": "Detailed explanation",
        "impact": "high, medium, or low",
        "exploitation": "How opponents can exploit this"
      }
    ],
    "athlete2": [
      {
        "title": "Area for improvement from analysis",
        "description": "Detailed explanation", 
        "impact": "high, medium, or low",
        "exploitation": "How opponents can exploit this"
      }
    ],
    "advantage": "athlete1 or athlete2 based on analysis"
  },
  "ranking": {
    "comparison": "Current ranking analysis from Google search",
    "athlete1Trajectory": "Recent ranking progression and trajectory",
    "athlete2Trajectory": "Recent ranking progression and trajectory", 
    "competitiveEdge": "athlete1, athlete2, or even"
  },
  "headToHead": {
    "prediction": "athlete1 or athlete2",
    "confidence": 75,
    "reasoning": "Comprehensive prediction based on Google search analysis",
    "keyFactors": [
      "Most important factor from analysis",
      "Second most important factor",
      "Third deciding factor"
    ],
    "scenario": "Detailed match scenario prediction"
  },
  "overallAnalysis": {
    "summary": "Comprehensive summary based on all Google search findings",
    "betterAthlete": "athlete1, athlete2, or even",
    "reasonsWhy": [
      "Primary reason with evidence",
      "Secondary reason with evidence",
      "Supporting factor"
    ],
    "closeness": "clear-difference, somewhat-close, or very-close",
    "recommendation": "Training and tactical recommendations for both athletes"
  },
  "detailedAnalysis": {
    "athlete1": {
      "name": "${athlete1.name}",
      "country": "${athlete1.country}",
      "currentForm": "Recent performance analysis from search",
      "technicalSkills": [
        {
          "skill": "Specific technique name",
          "proficiency": 95,
          "description": "Analysis with evidence",
          "evidence": "Examples from 2024-2025 competitions"
        }
      ],
      "physicalAttributes": {
        "height": "From search or 'Not found'",
        "weight": "Competition weight class",
        "reach": "From search or 'Not found'", 
        "stance": "Fighting stance",
        "strengths": ["Physical advantages"]
      },
      "recentPerformance": {
        "wins": "Recent win count",
        "losses": "Recent loss count",
        "lastCompetition": "Most recent competition", 
        "rankingChange": "Recent ranking progression",
        "form": "Current form assessment"
      }
    },
    "athlete2": {
      "name": "${athlete2.name}",
      "country": "${athlete2.country}",
      "currentForm": "Recent performance analysis from search",
      "technicalSkills": [
        {
          "skill": "Specific technique name", 
          "proficiency": 92,
          "description": "Analysis with evidence",
          "evidence": "Examples from 2024-2025 competitions"
        }
      ],
      "physicalAttributes": {
        "height": "From search or 'Not found'",
        "weight": "Competition weight class",
        "reach": "From search or 'Not found'",
        "stance": "Fighting stance", 
        "strengths": ["Physical advantages"]
      },
      "recentPerformance": {
        "wins": "Recent win count",
        "losses": "Recent loss count",
        "lastCompetition": "Most recent competition",
        "rankingChange": "Recent ranking progression", 
        "form": "Current form assessment"
      }
    }
  }
}

MANDATORY: Base ALL analysis on current Google search results from 2024-2025. If information cannot be found, state "Information not found through search" rather than using generic content.

FAILURE HANDLING: Only return error JSON if Google search completely fails:
{"error": "Couldn't Generate", "errorType": "search_failed", "errorMessage": "Google search unavailable", "retryable": true}

Otherwise, ALWAYS return the complete structure with available data.`;

    // Use GoogleGenAI with search tools enabled
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    
    console.log(`[GEMINI] Comprehensive comparison response for ${athlete1.name} vs ${athlete2.name}`);
    console.log(`[GEMINI] Response length: ${responseText.length} characters`);

    // Clean the response to remove markdown blocks
    responseText = responseText.trim();
    
    // Remove markdown code blocks
    responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Extract JSON if wrapped in other text
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }

    console.log(`[GEMINI] Cleaned response length: ${responseText.length} characters`);
    console.log(`[GEMINI] Cleaned response preview:`, responseText.substring(0, 200) + '...');

    // Return cleaned response for frontend parsing
    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      athletes: `${athlete1.name} vs ${athlete2.name}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error generating comprehensive comparison with Gemini:", error);
    throw new Error(`Failed to generate comprehensive comparison: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Legacy detailed comparison function (kept for backward compatibility)
export async function generateDetailedComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string
): Promise<any> {
  try {
    const timestamp = new Date().toISOString();
    const sessionId = Math.random().toString(36).substring(7);

    const model = googleGenAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });

    const prompt = `You are an expert ${sport} analyst with advanced web search capabilities specializing in detailed athlete comparisons and head-to-head predictions. You MUST search the internet extensively to find the most current and comprehensive information about these two athletes.

Session ID: ${sessionId} - Generation Time: ${timestamp}

ATHLETES TO ANALYZE:
Athlete 1: ${athlete1.name} from ${athlete1.country} (${sport})
Athlete 2: ${athlete2.name} from ${athlete2.country} (${sport})

CRITICAL INSTRUCTIONS:
1. MANDATORY: Use web search to find current competition data, rankings, recent results, and performance metrics from official federation websites and sports databases
2. MANDATORY: Search for technical analysis, fighting styles, recent match footage, and expert commentary from credible sports news sources
3. MANDATORY: Return ONLY pure JSON with absolutely no additional text, explanations, markdown formatting, or content outside the JSON structure
4. MANDATORY: Base ALL analysis on current web search findings from 2024-2025 - no generic content or training data

CRITICAL JSON FORMATTING REQUIREMENTS:
- NO markdown code blocks (backticks with json or just backticks)
- NO explanatory text before or after the JSON
- NO unescaped quotes in string values
- NO trailing commas in objects or arrays
- ALL string values must be properly quoted and escaped
- ALL numbers must be valid JSON numbers (no quotes around numeric values)
- Your entire response must be parseable JSON that fits the frontend structure exactly
- ENSURE COMPLETE JSON: Your response must be a complete, well-formed JSON object with all opening and closing braces properly matched
- NO TRUNCATION: If the response is getting too long, prioritize completing the JSON structure over including all details
- VALIDATE JSON SYNTAX: Before sending, mentally verify your JSON would pass JSON.parse() without errors
- CLOSE ALL BRACKETS: Every opening brace { must have a corresponding closing brace }
- COMPLETE ALL ARRAYS: Every opening bracket [ must have a corresponding closing bracket ]
- JSON COMPLETENESS: If you reach token limits, ensure you close all open JSON structures properly

WEB SEARCH FOCUS AREAS:
- Recent competition results and performance trends (2024-2025)
- Current world rankings and trajectory analysis
- Head-to-head records if available
- Technical skills analysis from recent matches
- Physical attributes and fighting styles
- Expert analysis and predictions from sports analysts
- Injury history and current form assessment

FAILURE HANDLING: If web search fails completely or no data is found, return this exact error JSON:
{
  "error": "Couldn't Generate",
  "errorType": "web_search_failed",
  "errorMessage": "Unable to find authentic athlete data through web search",
  "retryable": true,
  "suggestion": "Please verify athlete names and try again"
}

REQUIRED JSON STRUCTURE (return this exact format as pure JSON with no additional content):
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

MANDATORY JSON RESPONSE: You MUST always return a valid JSON response. Even if you cannot find complete data through web search, you MUST return the full detailed analysis structure with available data and clearly marked unavailable sections.

Only return this error JSON structure if web search completely fails or you cannot access any information about either athlete:
{"error": "Couldn't Generate", "errorType": "web_search_failed|athletes_not_found|complete_data_unavailable", "errorMessage": "Specific reason why generation failed"}

Otherwise, ALWAYS return the full detailedAnalysis and headToHead structure even with partial data. Mark missing information as "Information not found through web search" rather than returning an error.`;

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
    
    console.log(`[GEMINI] Raw response for ${athlete1.name} vs ${athlete2.name}:`, responseText);
    console.log(`[GEMINI] Response length: ${responseText.length} characters`);

    // Return raw response without any parsing
    return {
      rawResponse: responseText,
      source: "Gemini-2.5-pro",
      athletes: `${athlete1.name} vs ${athlete2.name}`,
      timestamp: new Date().toISOString()
    };
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

    // Use GoogleGenAI client with proper search grounding
    const model = googleGenAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 8000,
      },
    });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    
    let cleanedText = result.response.text().trim();
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
      model: "gemini-2.5-flash",
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

// Development Plan Data Interfaces
export interface DevelopmentPlanFormData {
  athleteName?: string; // Optional, defaults to generic athlete
  goal: string;
  age: number; // in years
  height: number; // in cm
  weight: number; // in kg
  gender: 'male' | 'female';
  sport: string;
  language: 'en' | 'ar';
  duration?: string; // Optional, defaults to "12 weeks"
  athleteData?: {
    bio: string | null;
    rank: number | null;
    country: string | null;
    achievements: string[] | null;
    competitionRecord: string;
  };
}

export interface DevelopmentPlanData {
  plan: string;
  error?: boolean;
  errorMessage?: string;
  errorType?: string;
  retryable?: boolean;
  suggestion?: string;
}

// YouTube scraping function to fetch exercise videos
async function scrapeYouTubeForExercise(exerciseName: string, sport: string): Promise<string | null> {
  try {
    const query = `${exerciseName} in ${sport} training`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ YouTube search failed for "${exerciseName}": ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Extract video ID from YouTube search results
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1];
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`✅ Found YouTube video for "${exerciseName}": ${videoUrl}`);
      return videoUrl;
    }
    
    console.log(`⚠️ No video found for "${exerciseName}"`);
    return null;
  } catch (error) {
    console.error(`❌ Error scraping YouTube for "${exerciseName}":`, error);
    return null;
  }
}

// Function to extract exercise names using regex
function extractExerciseNames(planText: string): string[] {
  // Regex patterns to match exercise names
  const exercisePatterns = [
    /(?:\d+\.?\s*)?(\w+(?:\s+\w+)*(?:\s+exercise|\s+drill|\s+workout|\s+training))/gi,
    /(?:\*\*|__)([^*_]+(?:exercise|drill|workout|training|stretch|push|pull|squat|lunge|jump|run)[^*_]*)(?:\*\*|__)/gi,
    /(?:Exercise|Drill|Workout)\s*:\s*([^.\n]+)/gi,
    /(?:\d+\.\s*)?([A-Z][a-z]+(?:\s+[A-Za-z]+)*(?=\s*:|\s*-|\s*\(|\n|$))/g
  ];
  
  const exercises = new Set<string>();
  
  exercisePatterns.forEach(pattern => {
    const matches = planText.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match
          .replace(/^\d+\.\s*/, '') // Remove numbering
          .replace(/[*_]+/g, '') // Remove markdown formatting
          .replace(/Exercise:|Drill:|Workout:/gi, '') // Remove prefixes
          .replace(/\s*:\s*.*$/, '') // Remove descriptions after colon
          .replace(/\s*-\s*.*$/, '') // Remove descriptions after dash
          .replace(/\s*\(.*\)$/, '') // Remove parentheses
          .trim();
        
        if (cleaned.length > 3 && cleaned.length < 50) {
          exercises.add(cleaned);
        }
      });
    }
  });
  
  return Array.from(exercises);
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match?.[1] || '';
}

// Generate goal-based development plan (no weeks, just pure goal analysis)
async function generateGoalBasedDevelopmentPlan(
  formData: DevelopmentPlanFormData,
  genderText: string,
  isArabic: boolean
): Promise<any> {
  const { goal, age, height, weight, sport } = formData;
  
  const systemPrompt = isArabic ? 
    `أنت خبير تدريب رياضي متخصص في تحليل الأهداف وتصميم التمارين المخصصة. قم بتحليل هدف الرياضي وإنشاء 3 تمارين لكل ضعف أو مجال للتحسين. لا تفكر في أسابيع، فقط حلل الأهداف وأنشئ التمارين.` :
    `You are a professional sports training expert specialized in goal analysis and creating targeted exercises. Analyze the athlete's goal and create 3 exercises for each weakness or area to improve. Don't think about weeks, just analyze goals and create exercises.`;

  // Schema for pure goal-based plan
  const planSchema = {
    type: "object",
    properties: {
      title: {
        type: "object",
        properties: {
          en: { type: "string" },
          ar: { type: "string" }
        }
      },
      overview: { type: "string" },
      goalAnalysis: {
        type: "array",
        minItems: 1,
        maxItems: 4, // Allow 1-4 goal areas maximum
        items: {
          type: "object",
          properties: {
            area: { type: "string" },
            description: { type: "string" },
            exercises: {
              type: "array",
              minItems: 3,
              maxItems: 3, // Enforce exactly 3 exercises per area
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  prescription: {
                    type: "object",
                    properties: {
                      sets: { type: "number" },
                      reps: { type: ["string", "number"] },
                      restSec: { type: "number" },
                      intensity: { type: "string" }
                    }
                  },
                  equipment: { type: "array", items: { type: "string" } }
                },
                required: ["id", "name", "description"]
              }
            }
          },
          required: ["area", "description", "exercises"]
        }
      }
    },
    required: ["title", "overview", "goalAnalysis"]
  };

  const prompt = isArabic ?
    `حلل وأنشئ خطة تدريب قائمة على التحليل الهدف:

- الرياضة: ${sport}
- الهدف: ${goal}
- العمر: ${age} سنة
- الجنس: ${genderText}

المطلوب:
1. حلل الهدف "${goal}" وحدد المجالات/نقاط الضعف المحددة للعمل عليها
2. لكل مجال، أنشئ 3 تمارين مخصصة بالضبط
3. كل تمرين يجب أن يكون له اسم واضح ومحدد لسهولة العثور على فيديو تعليمي له
4. ادرج معلومات الشدة والراحة والمعدات
5. أنشئ عنوان جذاب وملخص للخطة

أرجع JSON صالح فقط.` :
    `Analyze and create a goal-based training plan:

- Sport: ${sport}
- Goal: ${goal}
- Age: ${age} years
- Gender: ${genderText}

Requirements:
1. Analyze the goal "${goal}" and identify specific areas/weaknesses to work on
2. For each area, create exactly 3 targeted exercises
3. Each exercise must have a clear, specific name for easy video tutorial discovery
4. Include intensity, rest, and equipment information
5. Create an engaging title and overview for the plan

Return ONLY valid JSON.`;

  try {
    console.log(`⏳ Generating goal-based development plan...`);
    const planStart = Date.now();
    
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: planSchema,
        temperature: 0.2,
        maxOutputTokens: 8192  // More tokens for complete plan
      },
      contents: prompt
    });

    const planDuration = Date.now() - planStart;
    console.log(`✅ Goal-based plan generated in ${planDuration}ms`);

    // Check for truncation
    const finishReason = (result as any)?.response?.candidates?.[0]?.finishReason || 
                        (result as any)?.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.error(`⚠️ Goal-based plan was truncated`);
      throw new Error(`Goal-based plan response was truncated`);
    }

    const responseText = result?.text || "";
    if (!responseText) {
      throw new Error(`Empty response for goal-based plan`);
    }

    const plan = JSON.parse(responseText);
    
    // Flatten exercises for compatibility and video integration
    if (plan.goalAnalysis && Array.isArray(plan.goalAnalysis)) {
      const allExercises: any[] = [];
      
      // Extract exercises from each goal area
      plan.goalAnalysis.forEach((area: any) => {
        if (area.exercises && Array.isArray(area.exercises)) {
          area.exercises.forEach((exercise: any) => {
            // Add the target area to each exercise for context
            exercise.targetArea = area.area;
            allExercises.push(exercise);
          });
        }
      });
      
      // Add flattened exercises to plan root for backward compatibility
      plan.exercises = allExercises;
      
      console.log(`📊 Flattened ${allExercises.length} exercises from ${plan.goalAnalysis.length} goal areas`);
    }
    
    return plan;
  } catch (error) {
    console.error(`❌ Error generating goal-based plan:`, error);
    throw error;
  }
}

// Main development plan generation function - Goal-based format (no weeks)
export async function generateDevelopmentPlan(
  formData: DevelopmentPlanFormData,
  onProgressUpdate?: (currentStep: number, totalSteps: number) => Promise<void>
): Promise<DevelopmentPlanData> {
  try {
    const { goal, age, height, weight, gender, sport, language } = formData;
    
    console.log(`🎯 Generating goal-based development plan: goal=${goal}, sport=${sport}, language=${language}`);
    
    const isArabic = language === 'ar';
    const genderText = gender === 'male' ? (isArabic ? 'ذكر' : 'male') : (isArabic ? 'أنثى' : 'female');
    
    // Generate unique ID for this plan
    const planId = `dev_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Step 1: Generate goal-based plan
    if (onProgressUpdate) {
      await onProgressUpdate(1, 3);
    }
    
    const goalBasedPlan = await generateGoalBasedDevelopmentPlan(formData, genderText, isArabic);
    console.log(`✅ Goal analysis completed: ${goalBasedPlan.goalAnalysis?.length || 0} areas identified`);
    
    // Step 2: Find YouTube videos for all exercises
    if (onProgressUpdate) {
      await onProgressUpdate(2, 3);
    }
    
    const totalExercises = goalBasedPlan.exercises?.length || 0;
    console.log(`🔍 Finding YouTube videos for ${totalExercises} exercises...`);
    
    let videosFound = 0;
    if (goalBasedPlan.exercises) {
      for (const exercise of goalBasedPlan.exercises) {
        try {
          const videoUrl = await scrapeYouTubeForExercise(exercise.name, sport);
          if (videoUrl) {
            exercise.videoUrl = videoUrl;
            exercise.videoId = extractVideoId(videoUrl);
            videosFound++;
            console.log(`✅ Video found for "${exercise.name}": ${videoUrl}`);
          } else {
            console.log(`⚠️ No video found for "${exercise.name}"`);
          }
        } catch (error) {
          console.error(`❌ Error finding video for "${exercise.name}":`, error);
        }
      }
    }
    
    console.log(`📹 Found ${videosFound}/${totalExercises} videos`);
    
    // Step 3: Build final plan structure
    if (onProgressUpdate) {
      await onProgressUpdate(3, 3);
    }
    
    const finalPlan = {
      version: "1.0",
      id: planId,
      language: language,
      title: goalBasedPlan.title || {
        en: `${sport} Goal-Based Training Plan`,
        ar: `خطة التدريب القائمة على الأهداف - ${sport}`
      },
      sport: sport,
      goal: goal,
      gender: gender,
      duration: {
        type: "goal-based",
        description: isArabic ? 
          "خطة قائمة على تحليل الأهداف ونقاط الضعف" : 
          "Goal-based plan focusing on weakness analysis"
      },
      counts: {
        goals: goalBasedPlan.goalAnalysis?.length || 0,
        exercises: totalExercises,
        videos: videosFound
      },
      intro: {
        overview: goalBasedPlan.overview || `Goal-focused ${sport} training program`,
        structure: isArabic ? 
          "برنامج منظم حسب المجالات والأهداف المحددة" :
          "Organized by specific goal areas and targeted improvements"
      },
      goalAnalysis: goalBasedPlan.goalAnalysis || [],
      exercises: goalBasedPlan.exercises || []
    };
    
    console.log(`✅ Goal-based development plan completed: ${finalPlan.counts.goals} goals, ${finalPlan.counts.exercises} exercises, ${finalPlan.counts.videos} videos`);
    return {
      plan: JSON.stringify(finalPlan)
    };
  } catch (error) {
    console.error("Error generating goal-based development plan:", error);
    throw new Error(`Failed to generate goal-based development plan: ${error instanceof Error ? error.message : String(error)}`);
  }
}