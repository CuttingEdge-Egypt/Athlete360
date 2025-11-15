import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import { DevelopmentPlanV1, developmentPlanV1Schema, Exercise, Video } from '../shared/schema.js';
import { cleanJsonResponse } from './jsonUtils.js';
import { enforceUppercaseSurname } from './taekwondoUtils.js';

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        console.log(`[RETRY] ${operationName} succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[RETRY] ${operationName} failed on attempt ${attempt + 1}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[RETRY] ${operationName} failed after ${maxRetries + 1} attempts`);
  throw lastError;
}

// Initialize Gemini API clients
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
const googleGenAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Initialize Gemini 2.5 Pro model with web search capabilities
const model = googleGenAI.getGenerativeModel({ 
  model: "gemini-2.5-pro",
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 9000, // Increased for complex analyses (dual-analysis, rank history)
    // Note: responseMimeType removed when using tools
  },
});

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
  personalInfo?: {
    age?: number | string;
    dateOfBirth?: string;
    weight?: string;
    height?: string;
    position?: string;
    educationalBackground?: string;
    previousSports?: string[];
    yearsInCurrentSport?: string;
    [key: string]: any; // Allow additional fields
  };
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
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let dayNum = 0; dayNum < 7; dayNum++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + dayNum);
    
    // Timezone-safe date formatting to avoid UTC shifts
    const year = dayDate.getFullYear();
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    const dayDateStr = `${year}-${month}-${day}`;
    
    // Get the actual day of the week (0 = Sunday, 1 = Monday, etc.)
    const actualDayOfWeek = dayDate.getDay();

    weekDays.push({
      day: {
        date: dayDateStr,
        name: dayNames[actualDayOfWeek] // Use actual day of week instead of dayNum
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

⚠️ مهم جداً: استخدم التواريخ المحددة بالضبط كما هو مذكور أدناه - لا تغير التواريخ!

مهم جداً: أرجع JSON صالح فقط بهذا التركيب الدقيق مع التواريخ المحددة:

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

⚠️ CRITICAL: Use EXACT dates as specified below - DO NOT change the dates!
Week ${weekNumber} MUST include these exact dates: ${weekDays.map(d => `${d.day.name} ${d.day.date}`).join(', ')}

CRITICAL: Return ONLY valid JSON in this EXACT structure with the EXACT dates provided:

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

    // Enforce correct dates: overwrite AI-generated dates with our pre-calculated ones
    console.log(`🔧 Enforcing correct dates for Week ${weekNumber}...`);
    for (let i = 0; i < Math.min(weekPlan.days.length, weekDays.length); i++) {
      const expectedDay = weekDays[i];
      const actualDay = weekPlan.days[i];
      
      if (actualDay.day.date !== expectedDay.day.date || actualDay.day.name !== expectedDay.day.name) {
        console.log(`⚠️  Date mismatch detected: Expected ${expectedDay.day.name} ${expectedDay.day.date}, got ${actualDay.day.name} ${actualDay.day.date}`);
        console.log(`🔧 Correcting to: ${expectedDay.day.name} ${expectedDay.day.date}`);
        
        // Overwrite with correct date and name
        weekPlan.days[i].day.date = expectedDay.day.date;
        weekPlan.days[i].day.name = expectedDay.day.name;
      }
    }
    
    console.log(`✅ Week ${weekNumber} validated: ${weekPlan.days.length} days`);
    return weekPlan;

  } catch (error) {
    console.error(`❌ Error generating Week ${weekNumber}:`, error);
    throw error;
  }
}

export async function generateEnhancedNutritionPlan(
  formData: NutritionPlanFormData,
  onProgressUpdate?: (currentWeek: number, totalWeeks: number) => Promise<void>
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
    
    // Get current date for accurate nutrition plan scheduling - ALWAYS start from TODAY
    const today = new Date();
    // Reset time to start of day to ensure consistent date calculations
    today.setHours(0, 0, 0, 0);
    
    // Timezone-safe date formatting to avoid UTC shifts
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDateStr = `${year}-${month}-${day}`;
    
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
      
      // Update progress if callback provided
      if (onProgressUpdate) {
        await onProgressUpdate(weekNum - 1, period);
      }
      
      // Calculate start date for this week - Week 1 starts TODAY
      const weekStartDate = new Date(today);
      weekStartDate.setDate(today.getDate() + (weekNum - 1) * 7);
      
      
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
    
    // Final assembly validation
    const expectedTotalDays = period * 7;
    if (allDays.length !== expectedTotalDays) {
      console.error(`❌ Final plan validation failed: Expected ${expectedTotalDays} days but got ${allDays.length} days`);
      throw new Error(`AI_ASSEMBLY_FAILED: Expected ${expectedTotalDays} days but got ${allDays.length} days`);
    }
    
    // Verify dates form a contiguous sequence starting from today
    for (let i = 0; i < allDays.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + i);
      
      // Timezone-safe expected date formatting
      const expectedYear = expectedDate.getFullYear();
      const expectedMonth = String(expectedDate.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(expectedDate.getDate()).padStart(2, '0');
      const expectedDateStr = `${expectedYear}-${expectedMonth}-${expectedDay}`;
      
      if (allDays[i].day.date !== expectedDateStr) {
        console.error(`❌ Date sequence validation failed: Day ${i+1} expected ${expectedDateStr} but got ${allDays[i].day.date}`);
        throw new Error(`AI_DATE_SEQUENCE_FAILED: Day ${i+1} has incorrect date ${allDays[i].day.date}, expected ${expectedDateStr}`);
      }
    }
    
    const finalPlan: StructuredNutritionPlan = {
      instructions: overallInstructions,
      days: allDays
    };
    
    console.log(`📊 Final plan validated: ${finalPlan.days.length} total days across ${period} weeks, starting from ${currentDateStr}`);
    
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
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' : 'Generate all text content in English.';
    
    const prompt = `You are an expert ${sport} analyst with Google search capabilities. Find current ranking and basic information for these two athletes.

${languageInstruction}

ATHLETES TO ANALYZE:
Athlete 1: ${athlete1.name} from ${athlete1.country} (${sport})
Athlete 2: ${athlete2.name} from ${athlete2.country} (${sport})

MANDATORY: Use Google search to find current World ${sport} rankings 2024-2025.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- Do NOT include any text before or after the JSON
- Ensure all JSON strings are properly escaped (especially for athlete names with special characters)
- Use double quotes for all strings

Return JSON in this EXACT format:
{
  "athlete1": {
    "name": "${athlete1.name.replace(/"/g, '\\"')}",
    "country": "${athlete1.country}", 
    "rank": "Current world ranking from search",
    "profileImageUrl": "${athlete1.profileImageUrl || ''}"
  },
  "athlete2": {
    "name": "${athlete2.name.replace(/"/g, '\\"')}",
    "country": "${athlete2.country}",
    "rank": "Current world ranking from search", 
    "profileImageUrl": "${athlete2.profileImageUrl || ''}"
  },
  "overallAnalysis": {
    "summary": "Brief comparison summary based on rankings and recent form",
    "betterAthlete": "athlete1 or athlete2 or even",
    "reasonsWhy": ["Reason 1", "Reason 2"],
    "closeness": "clear-difference or somewhat-close or very-close"
  }
}`;

    let result;
    try {
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 3072,
              tools: [{ googleSearch: {} }]
            }
          });
          
          const text = res.text || "";
          const cleaned = cleanJsonResponse(text);
          
          // Validate that we got valid JSON, not an error
          if (cleaned === '{"error": "parsing_failed"}') {
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Overview Comparison'
      );
    } catch (retryError) {
      // All retries exhausted, return fallback structure
      console.error('[OVERVIEW] All retries failed, using fallback structure:', retryError);
      const fallbackStructure = {
        athlete1: {
          name: athlete1.name,
          country: athlete1.country,
          rank: "Data unavailable",
          profileImageUrl: athlete1.profileImageUrl || ""
        },
        athlete2: {
          name: athlete2.name,
          country: athlete2.country,
          rank: "Data unavailable",
          profileImageUrl: athlete2.profileImageUrl || ""
        },
        overallAnalysis: {
          summary: "Unable to retrieve comparison data at this time. Please try again.",
          betterAthlete: "even",
          reasonsWhy: ["Analysis could not be completed"],
          closeness: "even"
        }
      };
      return {
        rawResponse: JSON.stringify(fallbackStructure),
        source: "Gemini-2.5-pro",
        tabType: "overview"
      };
    }

    const responseText = result.text;
    console.log(`[OVERVIEW] Raw AI response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    return {
      rawResponse: result.cleaned,
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
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' : 'Generate all text content in English.';
    
    const prompt = `You are an expert ${sport} analyst. Analyze the specific strengths of these two athletes using Google search.

${languageInstruction}

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for technical skills, recent performances, signature techniques, and competitive advantages.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- Do NOT include any text before or after the JSON
- Ensure all JSON strings are properly escaped
- List at least 3-5 specific strengths for each athlete with evidence

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
    ]
  }
}`;

    let result;
    try {
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 3072,
              tools: [{ googleSearch: {} }]
            }
          });
          
          const text = res.text || "";
          const cleaned = cleanJsonResponse(text);
          
          // Validate that we got valid JSON, not an error
          if (cleaned === '{"error": "parsing_failed"}') {
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Strengths Comparison'
      );
    } catch (retryError) {
      // All retries exhausted, return fallback structure
      console.error('[STRENGTHS] All retries failed, using fallback structure:', retryError);
      const fallbackStructure = {
        strengths: {
          athlete1: [
            {
              title: "Data Unavailable",
              description: "Unable to analyze strengths at this time. Please try again.",
              rating: 50,
              evidence: "Analysis in progress"
            }
          ],
          athlete2: [
            {
              title: "Data Unavailable",
              description: "Unable to analyze strengths at this time. Please try again.",
              rating: 50,
              evidence: "Analysis in progress"
            }
          ]
        }
      };
      return {
        rawResponse: JSON.stringify(fallbackStructure),
        source: "Gemini-2.5-pro",
        tabType: "strengths"
      };
    }

    const responseText = result.text;
    console.log(`[STRENGTHS] Raw AI response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    return {
      rawResponse: result.cleaned,
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
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' : 'Generate all text content in English.';
    
    const prompt = `You are an expert ${sport} analyst. Analyze areas for improvement and weaknesses for these athletes using Google search.

${languageInstruction}

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for technical weaknesses, past struggles, and areas opponents have exploited.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- Do NOT include any text before or after the JSON
- Ensure all JSON strings are properly escaped
- NO line breaks or newlines inside string values

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
    ]
  }
}`;

    let result;
    try {
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 3072,
              tools: [{ googleSearch: {} }]
            }
          });
          
          const text = res.text || "";
          const cleaned = cleanJsonResponse(text);
          
          // Validate that we got valid JSON, not an error
          if (cleaned === '{"error": "parsing_failed"}') {
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Weaknesses Comparison'
      );
    } catch (retryError) {
      // All retries exhausted, return fallback structure
      console.error('[WEAKNESSES] All retries failed, using fallback structure:', retryError);
      const fallbackStructure = {
        weaknesses: {
          athlete1: [
            {
              title: "Data Unavailable",
              description: "Unable to analyze weaknesses at this time. Please try again.",
              impact: "low",
              exploitation: "Analysis in progress"
            }
          ],
          athlete2: [
            {
              title: "Data Unavailable",
              description: "Unable to analyze weaknesses at this time. Please try again.",
              impact: "low",
              exploitation: "Analysis in progress"
            }
          ]
        }
      };
      return {
        rawResponse: JSON.stringify(fallbackStructure),
        source: "Gemini-2.5-pro",
        tabType: "weaknesses"
      };
    }

    const responseText = result.text;
    console.log(`[WEAKNESSES] Raw AI response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    return {
      rawResponse: result.cleaned,
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
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' : 'Generate all text content in English.';
    
    const prompt = `You are an expert ${sport} analyst. Research the competition history and achievements of these athletes using Google search.

${languageInstruction}

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for major tournament wins, career milestones, ranking progression, and recent competition results.

Return ONLY pure JSON:
{
  "ranking": {
    "comparison": "Current ranking analysis from search",
    "athlete1Trajectory": "Recent ranking progression and trajectory",
    "athlete2Trajectory": "Recent ranking progression and trajectory"
  }
}`;

    let result;
    try {
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 3072,
              tools: [{ googleSearch: {} }]
            }
          });
          
          const text = res.text || "";
          const cleaned = cleanJsonResponse(text);
          
          // Validate that we got valid JSON, not an error
          if (cleaned === '{"error": "parsing_failed"}') {
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Competition History Comparison'
      );
    } catch (retryError) {
      // All retries exhausted, return fallback structure
      console.error('[COMPETITION] All retries failed, using fallback structure:', retryError);
      const fallbackStructure = {
        ranking: {
          comparison: "Unable to retrieve ranking data at this time.",
          athlete1Trajectory: "Data unavailable",
          athlete2Trajectory: "Data unavailable"
        }
      };
      return {
        rawResponse: JSON.stringify(fallbackStructure),
        source: "Gemini-2.5-pro",
        tabType: "competition-history"
      };
    }

    const responseText = result.text;
    console.log(`[COMPETITION] Raw AI response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    return {
      rawResponse: result.cleaned,
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
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' : 'Generate all text content in English.';
    
    const prompt = `You are an expert ${sport} analyst. Provide head-to-head prediction analysis for these athletes using Google search.

${languageInstruction}

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for previous meetings, fighting styles, recent form, and expert predictions.

Return ONLY pure JSON:
{
  "headToHead": {
    "prediction": "athlete1 or athlete2",
    "confidence": 75,
    "reasoning": "Comprehensive prediction based on all analysis including previous predictions",
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

    let result;
    try {
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 4096,
              tools: [{ googleSearch: {} }]
            }
          });
          
          const text = res.text || "";
          const cleaned = cleanJsonResponse(text);
          
          // Validate that we got valid JSON, not an error
          if (cleaned === '{"error": "parsing_failed"}') {
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Head-to-Head Comparison'
      );
    } catch (retryError) {
      // All retries exhausted, return fallback structure
      console.error('[HEAD-TO-HEAD] All retries failed, using fallback structure:', retryError);
      const fallbackStructure = {
        headToHead: {
          prediction: "even",
          confidence: 0,
          reasoning: "Unable to generate head-to-head prediction at this time. Please try again.",
          keyFactors: ["Analysis could not be completed"],
          scenario: "Prediction data unavailable",
          tacticalAdvice: {
            forAthlete1: "Tactical analysis unavailable",
            forAthlete2: "Tactical analysis unavailable"
          },
          historicalContext: "Data unavailable",
          expertPredictions: "No predictions available"
        }
      };
      return {
        rawResponse: JSON.stringify(fallbackStructure),
        source: "Gemini-2.5-pro",
        tabType: "head-to-head"
      };
    }

    const responseText = result.text;
    console.log(`[HEAD-TO-HEAD] Raw AI response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    return {
      rawResponse: result.cleaned,
      source: "Gemini-2.5-pro",
      tabType: "head-to-head"
    };
  } catch (error) {
    console.error("Error generating head-to-head comparison:", error);
    throw new Error(`Failed to generate head-to-head: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 6. Details Tab - Comprehensive technical analysis
// 6. Statistics Tab - Comprehensive statistical comparison
export async function generateStatisticsComparison(
  athlete1: { name: string; country: string; profileImageUrl?: string },
  athlete2: { name: string; country: string; profileImageUrl?: string },
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' : 'Generate all text content in English.';
    
    const prompt = `You are an expert ${sport} statistical analyst. Compare comprehensive statistical data for these two athletes using Google search.

${languageInstruction}

ATHLETES: ${athlete1.name} (${athlete1.country}) vs ${athlete2.name} (${athlete2.country}) in ${sport}

MANDATORY: Search for detailed statistics including:
- Recent season performance (2024-2025)
- Career totals and averages
- Win/loss records
- Competition results
- Sport-specific metrics
- Performance trends

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks  
- Do NOT include any text before or after the JSON
- Ensure all JSON strings are properly escaped
- NO line breaks or newlines inside string values

Return JSON:
{
  "statistics": {
    "athlete1": {
      "name": "${athlete1.name}",
      "recentSeason": {
        "period": "2024-2025 or latest",
        "gamesPlayed": number,
        "wins": number,
        "losses": number,
        "winRate": "percentage",
        "sportSpecific": [
          {
            "metric": "Metric name",
            "value": "Value with unit",
            "description": "Context"
          }
        ]
      },
      "careerTotals": {
        "totalCompetitions": number,
        "totalWins": number,
        "totalLosses": number,
        "careerWinRate": "percentage",
        "majorTitles": ["List of titles"],
        "peakRanking": "Highest ranking achieved"
      },
      "keyMetrics": [
        {
          "name": "Important metric",
          "value": "Value",
          "ranking": "How it compares (e.g., Top 10%)"
        }
      ]
    },
    "athlete2": {
      "name": "${athlete2.name}",
      "recentSeason": {
        "period": "2024-2025 or latest",
        "gamesPlayed": number,
        "wins": number,
        "losses": number,
        "winRate": "percentage",
        "sportSpecific": [
          {
            "metric": "Metric name",
            "value": "Value with unit",
            "description": "Context"
          }
        ]
      },
      "careerTotals": {
        "totalCompetitions": number,
        "totalWins": number,
        "totalLosses": number,
        "careerWinRate": "percentage",
        "majorTitles": ["List of titles"],
        "peakRanking": "Highest ranking achieved"
      },
      "keyMetrics": [
        {
          "name": "Important metric",
          "value": "Value",
          "ranking": "How it compares (e.g., Top 10%)"
        }
      ]
    },
    "comparison": {
      "recentForm": "Who has better recent statistics",
      "careerAchievements": "Who has better career numbers",
      "headToHeadIfAvailable": "Direct matchup results if found",
      "summary": "Statistical comparison summary"
    }
  }
}`;

    let result;
    try {
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 4096,
              tools: [{ googleSearch: {} }]
            }
          });
          
          const text = res.text || "";
          const cleaned = cleanJsonResponse(text);
          
          // Validate that we got valid JSON, not an error
          if (cleaned === '{"error": "parsing_failed"}') {
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Statistics Comparison'
      );
    } catch (retryError) {
      // All retries exhausted, return fallback structure
      console.error('[STATISTICS] All retries failed, using fallback structure:', retryError);
      const fallbackStructure = {
        statistics: {
          athlete1: {
            name: athlete1.name,
            recentSeason: {
              period: "Data unavailable",
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              winRate: "N/A",
              sportSpecific: []
            },
            careerTotals: {
              totalCompetitions: 0,
              totalWins: 0,
              totalLosses: 0,
              careerWinRate: "N/A",
              majorTitles: [],
              peakRanking: "N/A"
            },
            keyMetrics: []
          },
          athlete2: {
            name: athlete2.name,
            recentSeason: {
              period: "Data unavailable",
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              winRate: "N/A",
              sportSpecific: []
            },
            careerTotals: {
              totalCompetitions: 0,
              totalWins: 0,
              totalLosses: 0,
              careerWinRate: "N/A",
              majorTitles: [],
              peakRanking: "N/A"
            },
            keyMetrics: []
          },
          comparison: {
            recentForm: "Unable to compare",
            careerAchievements: "Unable to compare",
            headToHeadIfAvailable: "No data available",
            summary: "Statistical analysis could not be completed at this time. Please try again."
          }
        }
      };
      return {
        rawResponse: JSON.stringify(fallbackStructure),
        source: "Gemini-2.5-pro",
        tabType: "statistics"
      };
    }

    const responseText = result.text;
    console.log(`[STATISTICS] Raw AI response (first 500 chars): ${responseText.substring(0, 500)}`);
    
    return {
      rawResponse: result.cleaned,
      source: "Gemini-2.5-pro",
      tabType: "statistics"
    };
  } catch (error) {
    console.error("Error generating statistics comparison:", error);
    throw new Error(`Failed to generate statistics: ${error instanceof Error ? error.message : String(error)}`);
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
  nationality?: string,
  language: string = 'en'
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
    
    // Language-specific instructions
    const isArabic = language === 'ar';
    const languageInstruction = isArabic 
      ? `IMPORTANT LANGUAGE REQUIREMENT: You MUST respond in Arabic language. All text content in the JSON response including ranking_system_overview, analysis_narrative, phase_name, and notes should be written in Arabic. Write naturally in Arabic with proper grammar and structure.

**التعليمات:**

1. **حلل، لا تسرد فقط:** لا تكتف بسرد إنجازات الرياضي. هدفك الأساسي هو إنشاء سردية تشرح **تأثير** هذه الإنجازات على ترتيب الرياضي ومكانته في رياضته.
2. **اشرح "السبب":** استخدم نظرة عامة على نظام التصنيف لتوضيح *لماذا* أدت نتائج معينة إلى تغييرات كبيرة في الترتيب. اشرح كيف يوفر الفوز في الأحداث الكبرى دفعات نقاط كبيرة مقارنة بالأحداث الأقل مستوى.
3. **استنتج المسار:** بناءً على النتائج، استنتج المسار المحتمل لترتيب الرياضي. استخدم عبارات مثل "هذا ربما دفعهم إلى أفضل 50" أو "هذا كان سيرسخ موقعهم بين النخبة" أو "هذا الأداء وضع ترتيبهم الأولي في المستوى الكبير".
4. **اتبع التسلسل الزمني:** هيكل تحليلك زمنياً باستخدام مراحل مهنية. خصص قسماً لكل مرحلة، واشرح التقدم خلال تلك الفترة.
5. **حافظ على نبرة مهنية:** اكتب التحليل بطريقة واضحة ومهنية وثاقبة، كما هو متوقع من صحفي رياضي أو محلل.`
      : `**Instructions:**

1. **Analyze, Don't Just List:** Do not simply list the athlete's achievements. Your primary goal is to create a narrative that explains the **impact** of these achievements on the athlete's ranking and standing within their sport.
2. **Explain the "Why":** Use the ranking_system_overview to explain *why* certain results led to significant changes in rank. Explain how winning major events provides substantial point boosts compared to lower-tier events.
3. **Infer the Trajectory:** Based on the results, infer the athlete's likely ranking trajectory. Use phrases like "this likely propelled them into the top 50," "this would have solidified their position among the elite," or "this performance established their initial senior ranking."
4. **Follow the Chronology:** Structure your analysis chronologically using career phases. Dedicate a section to each phase, explaining the progression during that period.
5. **Maintain a Professional Tone:** Write the analysis in a clear, professional, and insightful manner, as would be expected from a sports journalist or analyst.`;
    
    const prompt = `As an expert sports analyst, your task is to generate a comprehensive rank history analysis for athlete "${athleteName}" from ${nationality || 'unknown nationality'} in ${sport}.

**CURRENT DATE CONTEXT**: Today is ${formattedCurrentDate}. Use this as your reference point for determining what is "current" and "recent" in your analysis.

${languageInstruction}

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
export async function generateAthleteBiography(name: string, sport: string, nationality?: string, language: string = 'en'): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  // Language-specific instructions
  const isArabic = language === 'ar';
  const languageInstruction = isArabic 
    ? `IMPORTANT LANGUAGE REQUIREMENT: You MUST respond in Arabic language. All text content in the JSON response including bio, playersStory, achievement descriptions, and recent news should be written in Arabic. Write naturally in Arabic with proper grammar and structure.

    Structure the biography with these Arabic headings:
    - فقرة تعريفية (must include information about any previous sports they played and how long they have been competing in ${sport})
    - قصة اللاعب الشاملة وما يُعرف به في ${sport}
    - عنوان "المنافسات الأخيرة:"
    - عنوان "السجل المهني والتصنيفات:"
    - عنوان "الإنجازات البارزة:"`
    : `Create a detailed biography structured with the following headings:
    - An introductory paragraph (must include information about any previous sports they played and how long they have been competing in ${sport})
    - Players' overall story and what they're known for in ${sport}
    - A heading "Recent Competitions:"
    - A heading "Career Record and Rankings:"
    - A heading "Notable Achievements:"`;

  const medalTypes = isArabic 
    ? '"ذهبية" | "فضية" | "برونزية" | "مشاركة"'
    : '"Gold" | "Silver" | "Bronze" | "Participation"';

  const prompt = `Today's date is ${currentDate}.
    
    Using Google search, find factual, up-to-date information about the athlete "${name}"${nationalityContext}, who competes in ${sport}.
    
    ${languageInstruction}

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
    - personalInfo: object containing detailed personal information:
      * age: current age (as number or "N/A")
      * dateOfBirth: date of birth (as string like "June 6, 2004" or "N/A")
      * weight: weight in kg (as string like "75 kg" or "N/A")
      * height: height in cm (as string like "180 cm" or "N/A")
      * position: playing position for team sports (as string or "N/A" for individual sports)
      * educationalBackground: education details (university, school, or "N/A")
      * previousSports: sports played before current sport (array of strings or empty array)
      * yearsInCurrentSport: how many years playing current sport (as string like "8 years" or "N/A")
    
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
          "medal": ${medalTypes}
        }
      ],
      "recentNews": ["array of recent news or competition results"],
      "personalInfo": {
        "age": "current age as number or N/A",
        "dateOfBirth": "date of birth as string or N/A",
        "weight": "weight in kg as string or N/A",
        "height": "height in cm as string or N/A", 
        "position": "playing position for team sports or N/A",
        "educationalBackground": "education details or N/A",
        "previousSports": ["array of previous sports or empty array"],
        "yearsInCurrentSport": "years in current sport as string or N/A"
      }
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
        throw new Error('PLAYER_NOT_FOUND');
      }
      
      if (athleteData.success === false) {
        throw new Error('PLAYER_NOT_FOUND');
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
          throw new Error('PLAYER_NOT_FOUND');
        }
        
        if (athleteData.success === false) {
          throw new Error('PLAYER_NOT_FOUND');
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

// Generate plan outline with goal analysis (first chunk - small)
async function generatePlanOutline(
  formData: DevelopmentPlanFormData,
  genderText: string,
  isArabic: boolean
): Promise<any> {
  const { goal, age, height, weight, sport } = formData;
  
  const systemPrompt = isArabic ? 
    `أنت خبير تدريب رياضي متخصص في تحليل الأهداف. حلل هدف الرياضي وحدد المجالات الرئيسية للتحسين فقط. لا تنشئ تمارين بعد، فقط حدد المجالات.` :
    `You are a professional sports training expert specialized in goal analysis. Analyze the athlete's goal and identify the main areas for improvement only. Don't create exercises yet, just identify the areas.`;

  // Schema for outline only
  const outlineSchema = {
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
      goalAreas: {
        type: "array",
        minItems: 2,
        maxItems: 4, // Allow 2-4 goal areas
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            area: { type: "string" },
            description: { type: "string" },
            priority: { type: "number" }
          },
          required: ["id", "area", "description", "priority"]
        }
      }
    },
    required: ["title", "overview", "goalAreas"]
  };

  const prompt = isArabic ?
    `حلل الهدف وحدد المجالات الرئيسية للتحسين:

- الرياضة: ${sport}
- الهدف: ${goal}
- العمر: ${age} سنة
- الجنس: ${genderText}

المطلوب:
1. حلل الهدف "${goal}" وحدد 2-4 مجالات رئيسية للتحسين
2. لكل مجال، اعط وصف مختصر وأولوية (1-4)
3. أنشئ عنوان جذاب وملخص للخطة
4. أعط كل مجال معرف فريد (goalId)

أرجع JSON صالح فقط.` :
    `Analyze the goal and identify main improvement areas:

- Sport: ${sport}
- Goal: ${goal}
- Age: ${age} years
- Gender: ${genderText}

Requirements:
1. Analyze the goal "${goal}" and identify 2-4 main improvement areas
2. For each area, provide brief description and priority (1-4)
3. Create an engaging title and overview for the plan
4. Give each area a unique goalId

Return ONLY valid JSON.`;

  try {
    console.log(`⏳ Generating plan outline...`);
    const start = Date.now();
    
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: outlineSchema,
        temperature: 0.2,
        maxOutputTokens: 4096  // Increased tokens for outline generation
      },
      contents: prompt
    });

    const duration = Date.now() - start;
    console.log(`✅ Plan outline generated in ${duration}ms`);

    // Check for truncation and retry with simpler prompt if needed
    const finishReason = (result as any)?.response?.candidates?.[0]?.finishReason || 
                        (result as any)?.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.error(`⚠️ Plan outline was truncated, retrying with simpler prompt...`);
      
      // Retry with much simpler prompt and smaller schema
      const simplePrompt = isArabic ?
        `حلل هدف "${goal}" في رياضة ${sport}. حدد 2-3 مجالات للتحسين فقط. أرجع JSON مختصر.` :
        `Analyze "${goal}" for ${sport}. Identify 2-3 improvement areas only. Return concise JSON.`;
        
      const simpleSchema = {
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
          goalAreas: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                area: { type: "string" },
                description: { type: "string" },
                priority: { type: "number" }
              }
            }
          }
        }
      };
      
      const retryResult = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: "You are a sports trainer. Be concise.",
          responseMimeType: "application/json",
          responseSchema: simpleSchema,
          temperature: 0.1,
          maxOutputTokens: 2048
        },
        contents: simplePrompt
      });
      
      const retryFinishReason = (retryResult as any)?.response?.candidates?.[0]?.finishReason || 
                              (retryResult as any)?.candidates?.[0]?.finishReason;
      if (retryFinishReason === "MAX_TOKENS") {
        console.error(`⚠️ Even simple plan outline was truncated`);
        throw new Error(`Plan outline response was truncated`);
      }
      
      const retryResponseText = retryResult?.text || "";
      if (!retryResponseText) {
        throw new Error(`Empty response for simplified plan outline`);
      }
      
      return JSON.parse(retryResponseText);
    }

    const responseText = result?.text || "";
    if (!responseText) {
      throw new Error(`Empty response for plan outline`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error(`❌ Error generating plan outline:`, error);
    throw error;
  }
}

// Generate exercises for a specific goal area (per-goal chunk)
async function generateGoalExercises(
  goalArea: any,
  formData: DevelopmentPlanFormData,
  genderText: string,
  isArabic: boolean
): Promise<any[]> {
  const { goal, age, sport } = formData;
  
  const systemPrompt = isArabic ? 
    `أنت خبير تدريب رياضي. أنشئ 3 تمارين مخصصة للمجال المحدد فقط.` :
    `You are a sports training expert. Create 3 targeted exercises for the specified area only.`;

  // Schema for exercises in one goal area
  const exercisesSchema = {
    type: "object",
    properties: {
      exercises: {
        type: "array",
        minItems: 3,
        maxItems: 3, // Exactly 3 exercises per area
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
    required: ["exercises"]
  };

  const prompt = isArabic ?
    `أنشئ 3 تمارين مخصصة للمجال: "${goalArea.area}"

- الوصف: ${goalArea.description}
- الرياضة: ${sport}
- الهدف العام: ${goal}
- العمر: ${age} سنة
- الجنس: ${genderText}

المطلوب:
1. أنشئ 3 تمارين مخصصة بالضبط لهذا المجال
2. كل تمرين يجب أن يكون له اسم واضح ومحدد لسهولة العثور على فيديو تعليمي له
3. اكتب كل شيء بالعربية: اسم التمرين، الوصف، الفئات (tags)، المعدات (equipment)، ومعلومات الشدة
4. ادرج معلومات الشدة والراحة والمعدات بالعربية
5. أعط كل تمرين معرف فريد

أرجع JSON صالح فقط مع كل المحتوى بالعربية.` :
    `Create 3 targeted exercises for area: "${goalArea.area}"

- Description: ${goalArea.description}
- Sport: ${sport}
- Overall Goal: ${goal}
- Age: ${age} years
- Gender: ${genderText}

Requirements:
1. Create exactly 3 targeted exercises for this area
2. Each exercise must have a clear, specific name for easy video tutorial discovery
3. Write everything in English: exercise name, description, tags, equipment, and intensity information
4. Include intensity, rest, and equipment information in English
5. Give each exercise a unique exerciseId

Return ONLY valid JSON with all content in English.`;

  try {
    console.log(`⏳ Generating exercises for goal area: ${goalArea.area}`);
    const start = Date.now();
    
    // Try with standard token limit first
    let result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: exercisesSchema,
        temperature: 0.3,
        maxOutputTokens: 5500  // Increased from 3072 to prevent truncation
      },
      contents: prompt
    });

    const duration = Date.now() - start;
    console.log(`✅ Exercises for "${goalArea.area}" generated in ${duration}ms`);

    // Check for truncation
    let finishReason = (result as any)?.response?.candidates?.[0]?.finishReason || 
                        (result as any)?.candidates?.[0]?.finishReason;
    
    // Retry with higher token limit if truncated
    if (finishReason === "MAX_TOKENS") {
      console.warn(`⚠️ Exercises for "${goalArea.area}" were truncated, retrying with higher token limit...`);
      
      result = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: exercisesSchema,
          temperature: 0.3,
          maxOutputTokens: 8000  // Higher limit for retry
        },
        contents: prompt
      });
      
      finishReason = (result as any)?.response?.candidates?.[0]?.finishReason || 
                      (result as any)?.candidates?.[0]?.finishReason;
      
      if (finishReason === "MAX_TOKENS") {
        console.error(`❌ Exercises for "${goalArea.area}" still truncated after retry`);
        throw new Error(`Exercises response was truncated for area: ${goalArea.area} even after retry`);
      }
      
      console.log(`✅ Retry successful for "${goalArea.area}"`);
    }

    const responseText = result?.text || "";
    if (!responseText) {
      throw new Error(`Empty response for exercises in area: ${goalArea.area}`);
    }

    const data = JSON.parse(responseText);
    
    // Add targetArea to each exercise and ensure goalId consistency
    const exercises = data.exercises.map((exercise: any) => ({
      ...exercise,
      targetArea: goalArea.area,
      goalId: goalArea.id
    }));

    console.log(`📊 Generated ${exercises.length} exercises for "${goalArea.area}"`);
    return exercises;
  } catch (error) {
    console.error(`❌ Error generating exercises for "${goalArea.area}":`, error);
    throw error;
  }
}

// Main chunked development plan generation function
async function generateGoalBasedDevelopmentPlan(
  formData: DevelopmentPlanFormData,
  genderText: string,
  isArabic: boolean,
  onProgressUpdate?: (currentStep: number, totalSteps: number) => Promise<void>
): Promise<any> {
  try {
    // Step 1: Generate plan outline (small API call)
    if (onProgressUpdate) await onProgressUpdate(10, 100);
    
    const outline = await generatePlanOutline(formData, genderText, isArabic);
    console.log(`✅ Plan outline completed: ${outline.goalAreas?.length || 0} areas identified`);
    
    // Step 2: Generate exercises for each goal area (chunked API calls)
    const allExercises: any[] = [];
    const goalAnalysis: any[] = [];
    const totalAreas = outline.goalAreas?.length || 0;
    
    for (let i = 0; i < totalAreas; i++) {
      const goalArea = outline.goalAreas[i];
      
      if (onProgressUpdate) await onProgressUpdate(20 + i * 20, 100); // Progress 20,40,60,80 based on areas
      
      try {
        const exercises = await generateGoalExercises(goalArea, formData, genderText, isArabic);
        
        // Build goal analysis entry
        goalAnalysis.push({
          area: goalArea.area,
          description: goalArea.description,
          priority: goalArea.priority,
          id: goalArea.id,
          exercises: exercises
        });
        
        // Add to flat exercises list for compatibility
        allExercises.push(...exercises);
        
        console.log(`✅ Completed exercises for area "${goalArea.area}": ${exercises.length} exercises`);
      } catch (error) {
        console.error(`❌ Failed to generate exercises for "${goalArea.area}":`, error);
        // Continue with other areas, mark this one as failed
        goalAnalysis.push({
          area: goalArea.area,
          description: goalArea.description,
          priority: goalArea.priority,
          id: goalArea.id,
          exercises: [],
          error: `Failed to generate exercises: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    if (onProgressUpdate) await onProgressUpdate(91, 100);
    
    // Assemble final plan structure
    const plan = {
      title: outline.title,
      overview: outline.overview,
      goalAnalysis: goalAnalysis,
      exercises: allExercises // Flat list for backward compatibility
    };
    
    console.log(`✅ Chunked goal-based plan completed: ${goalAnalysis.length} areas, ${allExercises.length} total exercises`);
    return plan;
    
  } catch (error) {
    console.error(`❌ Error in chunked goal-based plan generation:`, error);
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
    
    // Step 1: Generate goal-based plan using chunked approach
    const goalBasedPlan = await generateGoalBasedDevelopmentPlan(formData, genderText, isArabic, onProgressUpdate);
    console.log(`✅ Goal analysis completed: ${goalBasedPlan.goalAnalysis?.length || 0} areas identified`);
    
    // Step 2: Find YouTube videos for all exercises
    // Note: progress for chunked generation is handled inside generateGoalBasedDevelopmentPlan
    
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
      await onProgressUpdate(99, 100);
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

// Personal info extraction using Gemini 2.5 Pro with web search
export async function getAthletePersonalInfoGemini(name: string, sport: string, nationality?: string): Promise<PersonalInfo> {
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  const isTaekwondo = sport.toLowerCase().includes('taekwondo');
  
  const prompt = `Search the web for factual personal information about the athlete "${name}"${nationalityContext} who competes in ${sport}.

    Extract ONLY the following personal information if available:
    - Age (current age)
    - Date of birth  
    - Height
    - Category (EXACT category/division the athlete competes in from official sport federation websites)
    - Position (only for team sports like football, basketball, volleyball, handball, etc.)
    - Club (only for team sports - the team/club the athlete currently plays for)
    - Educational background (school, university - NOT including club/team names)
    - Years competing in current sport
    - Previous sports (if any)${isTaekwondo ? '\n    - Official name (For Taekwondo: EXACT name format as listed in World Taekwondo rankings at worldtkd.simplycompete.com)' : ''}

    CATEGORY EXTRACTION - CRITICAL:
    For individual sports with categories (Taekwondo, Boxing, Judo, Wrestling, Fencing, etc.), extract the EXACT category format as used by official sport federations:
    - Taekwondo: Weight categories with gender prefix (e.g., "M-58 kg", "W-49 kg", "M-68 kg", "W-67 kg")
    - Boxing/Judo: Weight categories (e.g., "M-54kg", "W-49kg", "-60kg", "+100kg")
    - Fencing: Weapon type (e.g., "Sabre", "Foil", "Épée")
    - Wrestling: Weight class (e.g., "57kg", "65kg", "86kg")
    - Athletics: Event specialization (e.g., "100m", "Marathon", "High Jump")
    
    ${isTaekwondo ? `
    FOR TAEKWONDO ATHLETES - CRITICAL WEIGHT CATEGORY CLASSIFICATION:
    
    **WORLD RANKINGS (World Kyorugi Rankings / World Senior Division):**
    Men's Weight Divisions: M-54 kg, M-58 kg, M-63 kg, M-68 kg, M-74 kg, M-80 kg, M-87 kg, M+87 kg
    Women's Weight Divisions: W-46 kg, W-49 kg, W-53 kg, W-57 kg, W-62 kg, W-67 kg, W-73 kg, W+73 kg
    
    **OLYMPIC RANKINGS (Olympic Kyorugi Rankings / Olympic Senior Division):**
    Men's Weight Divisions: M-58 kg, M-68 kg, M-80 kg, M+80 kg
    Women's Weight Divisions: W-49 kg, W-57 kg, W-67 kg, W+67 kg
    
    **CRITICAL INSTRUCTIONS:**
    1. Search the official World Taekwondo website (worldtkd.simplycompete.com) to determine which ranking the athlete appears in
    2. If the athlete competes in Olympic rankings, use OLYMPIC weight divisions (M+80 kg for heavyweights)
    3. If the athlete competes in World rankings, use WORLD weight divisions (M+87 kg for heavyweights)
    4. The category you return MUST match the ranking type the athlete is found in
    5. Examples:
       - If athlete appears in "Olympic Kyorugi Rankings" at +80kg → return "M+80 kg"
       - If athlete appears in "World Kyorugi Rankings" at +87kg → return "M+87 kg"
       - If athlete appears in World rankings but you only find weight info (e.g., 85kg) → classify to correct World division (M-87 kg or M+87 kg)
    
    FOR TAEKWONDO ATHLETES - CRITICAL DATABASE NAME FORMAT:
    - Search the official World Taekwondo website (worldtkd.simplycompete.com) or rankings databases
    - Extract the EXACT name format as listed in their ranking system
    - The official name format is critical for accurate database lookups
    - CRITICAL: Ensure the LAST NAME is in ALL CAPS (e.g., "Seif EISSA" not "Seif Eissa")
    - Example formats: "Mohamed KHALIL JENDOUBI", "Vito DELL'AQUILA", "Moataz Bellah ASEM ATA ABU SREE'", "Seif EISSA"
    - Include ALL parts of the name exactly as shown in the official ranking database
    - This may include middle names, family names, and specific capitalization
    - The SURNAME (last name/family name) MUST be in ALL CAPITAL LETTERS
    - If found on the official website, use that EXACT format for "official_name"
    - If not found, use "N/A"` : ''}
    
    IMPORTANT:
    - Extract the PRIMARY category the athlete competes in
    - Use the EXACT format from official ranking/federation websites
    - For sports without categories (e.g., team sports, some individual sports), use "N/A"
    - Search official sport federation websites to get the precise category format

    CRITICAL REQUIREMENTS:
    - Search thoroughly across multiple sources for factual personal information
    - Use "N/A" only for information that genuinely cannot be found after extensive search
    - Prioritize finding any available personal details over strict verification
    - Only respond with {"error": "no_personal_info_found"} if absolutely no personal information exists
    - **COUNTRY VERIFICATION**: If the athlete is found but competes for a DIFFERENT country than specified, respond with {"error": "country_mismatch", "correct_country": "COUNTRY_NAME"}
    - Include partial information when available (e.g., approximate age, category, etc.)
    - Position and Club fields are ONLY for team sports - use "N/A" for individual sports
    - Keep educational background separate from club information
    
    Athlete details:
    - Name: ${name}
    - Sport: ${sport}
    - Nationality: ${nationality || "Unknown"}

    Format the response as a JSON object with these exact fields:
    {
      "age": "string or N/A",
      "dateOfBirth": "string or N/A", 
      "height": "string or N/A",
      "category": "string or N/A",${isTaekwondo ? '\n      "official_name": "string or N/A",' : ''}
      "position": "string or N/A",
      "club": "string or N/A",
      "educationalBackground": "string or N/A",
      "yearsInCurrentSport": "string or N/A",
      "previousSports": ["array of sports or empty array"]
    }`;

  try {
    console.log(`🔍 Searching for personal info for ${name} using gemini-flash-latest with web search...`);
    
    const result = await genAI.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        temperature: 0.7, // Less restrictive than 0.1, but more factual than 1.0
        maxOutputTokens: 8000, // Increased tokens for comprehensive personal info extraction
        tools: [{ googleSearch: {} }] // Enable web search
      }
    });

    let responseText = result.text || "";
    if (!responseText) {
      console.log(`⚠️ Empty response from Gemini for ${name}, treating as no personal info found`);
      throw new Error('PERSONAL_INFO_NOT_FOUND');
    }

    console.log(`📋 Gemini response for ${name}:`, responseText.substring(0, 200) + '...');

    // Clean and parse JSON response (since we can't use responseMimeType with tools)
    responseText = cleanJsonResponse(responseText);
    const parsedResult = JSON.parse(responseText);
    
    // Check for error responses
    if (parsedResult.error === 'no_personal_info_found') {
      throw new Error('PERSONAL_INFO_NOT_FOUND');
    }
    
    // Check for country mismatch
    if (parsedResult.error === 'country_mismatch') {
      throw new Error(`COUNTRY_MISMATCH:${parsedResult.correct_country || 'Unknown'}`);
    }
    
    // Clean up age format - remove date references
    let cleanAge = parsedResult.age;
    if (cleanAge && cleanAge !== "N/A") {
      cleanAge = cleanAge.replace(/\s*\(as of.*?\)/gi, '').trim();
      cleanAge = cleanAge.replace(/\s*as of.*$/gi, '').trim();
    }
    
    // Post-process official_name for Taekwondo to ensure uppercase surname
    let officialName: string | undefined = undefined;
    if (isTaekwondo && parsedResult.official_name && parsedResult.official_name !== "N/A") {
      officialName = enforceUppercaseSurname(parsedResult.official_name);
      console.log(`📝 Post-processed official_name: "${parsedResult.official_name}" → "${officialName}"`);
    }
    
    return {
      age: cleanAge === "N/A" ? undefined : cleanAge,
      dateOfBirth: parsedResult.dateOfBirth === "N/A" ? undefined : parsedResult.dateOfBirth,
      height: parsedResult.height === "N/A" ? undefined : parsedResult.height,
      category: parsedResult.category === "N/A" ? undefined : parsedResult.category,
      official_name: officialName,
      position: parsedResult.position === "N/A" ? undefined : parsedResult.position,
      club: parsedResult.club === "N/A" ? undefined : parsedResult.club,
      educationalBackground: parsedResult.educationalBackground === "N/A" ? undefined : parsedResult.educationalBackground,
      yearsInCurrentSport: parsedResult.yearsInCurrentSport === "N/A" ? undefined : parsedResult.yearsInCurrentSport,
      previousSports: Array.isArray(parsedResult.previousSports) ? parsedResult.previousSports : []
    };
  } catch (error) {
    console.error(`❌ Error getting personal info for ${name} with Gemini:`, error);
    
    // CRITICAL: Rethrow COUNTRY_MISMATCH errors immediately so routes.ts can handle them
    if (error instanceof Error && error.message.startsWith('COUNTRY_MISMATCH:')) {
      throw error;
    }
    
    if (error instanceof Error && error.message.includes('PERSONAL_INFO_NOT_FOUND')) {
      throw error;
    }
    
    // Handle quota/rate limit errors gracefully - treat as no personal info found
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      console.log(`⚠️ Gemini API quota exceeded for ${name}, treating as no personal info found`);
      throw new Error('PERSONAL_INFO_NOT_FOUND');
    }
    
    // Handle other API errors that suggest unavailability
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('rate limit')) {
        console.log(`⚠️ Gemini API unavailable for ${name}, treating as no personal info found`);
        throw new Error('PERSONAL_INFO_NOT_FOUND');
      }
    }
    
    throw new Error(`Failed to generate personal info for ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// PersonalInfo interface to match the expected type
interface PersonalInfo {
  age?: string;
  dateOfBirth?: string;
  height?: string;
  category?: string;
  official_name?: string;
  position?: string;
  club?: string;
  educationalBackground?: string;
  yearsInCurrentSport?: string;
  previousSports?: string[];
}

// Fast Gemini-based image search with web search capabilities
export async function searchAthleteImagesWithGemini(
  name: string,
  sport: string,
  country: string,
  details?: string
): Promise<string | null> {
  try {
    console.log(`🔍 Starting Gemini-2.5-pro image search for ${name} (${sport}, ${country})`);
    
    // Build comprehensive search prompt
    const athleteInfo = `Name: ${name}\nCountry: ${country}\nSport: ${sport}`;
    const detailsText = details ? `\nDetails: ${details}` : '';
    
    const prompt = `You are an expert image researcher. Use web search to find 3-5 DIRECT downloadable image URLs for this athlete:

${athleteInfo}${detailsText}

SEARCH STRATEGY:
1. Search for "${name} ${sport} ${country}" to find recent athlete photos
2. Look for official sports federation websites and Olympic databases  
3. Check Wikipedia Commons and government sports websites
4. Find news articles and sports reporting sites

CRITICAL REQUIREMENTS:
1. Return ONLY direct image URLs that end in .jpg, .png, .webp, .gif
2. Focus on accessible, non-restrictive sources like:
   - Wikipedia Commons images (upload.wikimedia.org)
   - Official Olympic/sports federation sites
   - TheSportsDB.com athlete photos
   - Major news outlets with public images
   - Government and official sports websites

3. AVOID restrictive sources:
   - Social media platforms (Instagram, Facebook, Twitter)
   - Stock photo sites requiring subscriptions  
   - Private or protected team websites

4. Use web search to find current, accessible images

Return ONLY a JSON array of image URLs in this exact format:
["https://url1.jpg", "https://url2.png", "https://url3.webp"]`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 2000,
        tools: [{ googleSearch: {} }]
      }
    });

    let responseText = result.text || "";
    if (!responseText) {
      return null;
    }

    // Clean and parse JSON response
    responseText = cleanJsonResponse(responseText);
    
    let imageUrls: string[] = [];
    try {
      imageUrls = JSON.parse(responseText);
      if (!Array.isArray(imageUrls)) {
        // Try to extract URLs from text if not array
        const urlRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi;
        imageUrls = responseText.match(urlRegex) || [];
      }
    } catch (parseError) {
      // Fallback: extract URLs from text
      const urlRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi;
      imageUrls = responseText.match(urlRegex) || [];
    }

    if (imageUrls.length === 0) {
      console.log(`❌ No image URLs found for ${name}`);
      return null;
    }

    console.log(`🎯 Gemini found ${imageUrls.length} image URLs for ${name}`);
    
    // Try to download the first working image
    const downloadedPath = await downloadImageFromUrl(imageUrls[0], name);
    
    if (downloadedPath) {
      console.log(`✅ Successfully downloaded image for ${name}: ${downloadedPath}`);
      return downloadedPath;
    } else {
      console.log(`❌ Failed to download image for ${name}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Gemini image search failed for ${name}:`, error);
    return null;
  }
}

// Helper function to download image from URL
async function downloadImageFromUrl(url: string, athleteName: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      // timeout: 30000, // Note: timeout not supported in node-fetch RequestInit
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Determine file extension
    let ext = 'jpg';
    if (contentType.includes('png') || url.toLowerCase().endsWith('.png')) {
      ext = 'png';
    } else if (contentType.includes('webp') || url.toLowerCase().endsWith('.webp')) {
      ext = 'webp';
    } else if (contentType.includes('gif') || url.toLowerCase().endsWith('.gif')) {
      ext = 'gif';
    }

    // Create filename
    const cleanName = athleteName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const filename = `${cleanName}_${timestamp}.${ext}`;
    const filepath = `attached_assets/athlete_images/${filename}`;

    // Ensure directory exists
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save image
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);

    return `/${filepath}`;
    
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error);
    return null;
  }
}

/**
 * Generate competitive history analysis for Taekwondo athletes (Competition events only)
 * Uses JSON mode for structured output
 */
async function generateTaekwondoCompetitiveAnalysis(
  athleteName: string,
  competitionHistoryData: any[],
  athleteData?: any,
  language: string = 'en'
): Promise<any> {
  const languageInstruction = language === 'ar' 
    ? 'Generate ALL content in Arabic language. Use professional Arabic sports terminology.'
    : 'Generate ALL content in English language.';

  const prompt = `You are a professional Taekwondo analyst specializing in competitive history analysis.

${languageInstruction}

Analyze the competitive history for ${athleteName}, a Taekwondo athlete.

**Competition History Data:**
${JSON.stringify(competitionHistoryData, null, 2)}

${athleteData ? `**Additional Athlete Information:**
${JSON.stringify(athleteData, null, 2)}` : ''}

**Task:**
Generate a comprehensive competitive history analysis:
1. **Career Overview**: Summarize competitive journey and key milestones
2. **Peak Performance Periods**: Identify best performance phases
3. **Competition Analysis**: Performance across different tiers (Grand Prix, World Championships, Olympics)
4. **Progression Patterns**: Trends and improvements
5. **Notable Achievements**: Significant accomplishments
6. **Recent Form**: Current performance status

**CRITICAL REQUIREMENTS:**
- Provide evidence-based insights using the provided data
- Structure in clear, professional paragraphs
- Return ONLY valid JSON
- ${languageInstruction}

Return your analysis in this JSON format:
{
  "athlete_name": "${athleteName}",
  "sport": "Taekwondo",
  "active_period": {
    "start_year": 2018,
    "end_year": "current"
  },
  "career_overview": "Comprehensive career summary",
  "peak_performance_periods": [
    {
      "period": "Time period",
      "description": "Analysis of this peak period",
      "key_results": ["Notable results"]
    }
  ],
  "competition_analysis": {
    "grand_prix": "Grand Prix performance analysis",
    "world_championships": "World Championship analysis", 
    "olympic_games": "Olympic performance (if applicable)",
    "continental_events": "Continental competition analysis"
  },
  "progression_patterns": "Career progression analysis",
  "notable_achievements": [
    {
      "achievement": "Achievement description",
      "significance": "Significance explanation"
    }
  ],
  "recent_form": "Recent performance analysis",
  "insights": ["Key insight 1", "Key insight 2"]
}`;

  const responseSchema = {
    type: "object",
    properties: {
      athlete_name: { type: "string" },
      sport: { type: "string" },
      active_period: {
        type: "object",
        properties: {
          start_year: { type: ["number", "string"] },
          end_year: { type: ["number", "string"] }
        },
        required: ["start_year", "end_year"]
      },
      career_overview: { type: "string" },
      peak_performance_periods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            period: { type: "string" },
            description: { type: "string" },
            key_results: { type: "array", items: { type: "string" } }
          },
          required: ["period", "description", "key_results"]
        }
      },
      competition_analysis: {
        type: "object",
        properties: {
          grand_prix: { type: "string" },
          world_championships: { type: "string" },
          olympic_games: { type: "string" },
          continental_events: { type: "string" }
        }
      },
      progression_patterns: { type: "string" },
      notable_achievements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            achievement: { type: "string" },
            significance: { type: "string" }
          }
        }
      },
      recent_form: { type: "string" },
      insights: { type: "array", items: { type: "string" } }
    },
    required: ["athlete_name", "sport", "career_overview"]
  };

  console.log(`⏳ [PARALLEL] Generating competitive history analysis for ${athleteName}...`);
  
  const result = await retryWithBackoff(
    async () => {
      const res = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.3,
          maxOutputTokens: 8000
        },
        contents: prompt
      });
      
      const text = res?.text || "{}";
      let cleaned = text.trim();
      cleaned = cleaned.replace(/```json\s*/, '').replace(/```\s*$/, '');
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
      cleaned = repairJsonString(cleaned);
      
      try {
        JSON.parse(cleaned);
      } catch (e) {
        console.error('❌ Invalid JSON response from Gemini (competitive analysis)');
        throw new Error('JSON parsing failed, will retry');
      }
      
      return { text, cleaned };
    },
    2,
    1000,
    'Competitive History Analysis'
  );

  const analysisData = JSON.parse(result.cleaned);
  console.log(`✅ [PARALLEL] Competitive history analysis complete for ${athleteName}`);
  return analysisData;
}

/**
 * Generate rank history analysis for Taekwondo athletes with web search
 * Uses web search mode for contextual information
 */
async function generateTaekwondoRankAnalysis(
  athleteName: string,
  rankHistoryData: any[],
  athleteData?: any,
  language: string = 'en'
): Promise<any> {
  const languageInstruction = language === 'ar' 
    ? 'Generate ALL content in Arabic language. Use professional Arabic sports terminology.'
    : 'Generate ALL content in English language.';

  const prompt = `You are a professional Taekwondo analyst specializing in ranking progression analysis.

${languageInstruction}

Analyze the ranking progression for ${athleteName}, a Taekwondo athlete.

**Rank History Data (Month-by-Month Rankings):**
${JSON.stringify(rankHistoryData, null, 2)}

${athleteData ? `**Additional Athlete Information:**
${JSON.stringify(athleteData, null, 2)}` : ''}

**Task:**
**IMPORTANT: Use web search to find contextual information about this athlete's career events, club changes, coaching changes, injuries, or significant life events that correlate with ranking changes.**

Analyze the ranking progression over time and identify what caused changes:
1. **Ranking Overview**: Summary of ranking journey (highest rank, current rank, volatility)
2. **Progression Timeline**: Limit to TOP 5 most significant periods of change
3. **Contextual Analysis**: What happened during ranking changes? Use web search to find key factors (club/coach changes, major wins/losses, injuries)
4. **Consistency Analysis**: Brief summary of ranking stability
5. **Category Performance**: If athlete competed in multiple weight categories, analyze performance in each category
6. **Trends and Predictions**: Concise outlook (2-3 sentences)

**CRITICAL REQUIREMENTS:**
- Use web search to enrich rank history analysis with real-world context
- Do NOT include URLs, links, or citations in your response
- Keep responses CONCISE - limit timeline to 5 items, paragraphs to 3-4 sentences max
- Provide evidence-based insights using the provided data
- Return ONLY valid JSON - no markdown, no extra text
- ${languageInstruction}

Return your analysis in this JSON format:
{
  "athlete_name": "${athleteName}",
  "sport": "Taekwondo",
  "ranking_overview": {
    "highest_rank": 1,
    "current_rank": 5,
    "rank_range": "Best: 1, Worst: 25",
    "volatility": "High/Medium/Low"
  },
  "progression_timeline": [
    {
      "period": "Jan 2023 - Jun 2023",
      "rank_change": "Improved from 15 to 8",
      "context": "Brief: What caused this change",
      "significance": "Brief: Why this period was important"
    }
  ],
  "contextual_factors": {
    "key_factor": "Most important factor affecting rankings (brief 1-2 sentences)"
  },
  "consistency_analysis": "Brief stability summary (1-2 sentences)",
  "category_performance": "Brief performance across categories (1-2 sentences if applicable)",
  "trends_and_outlook": "Brief outlook (1-2 sentences)",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
}`;

  console.log(`⏳ [PARALLEL] Generating rank history analysis with web search for ${athleteName}...`);
  
  const result = await retryWithBackoff(
    async () => {
      const res = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          temperature: 0.3,
          maxOutputTokens: 9000, // Increased to prevent truncation
          tools: [{ googleSearch: {} }] // Enable web search
        },
        contents: prompt
      });
      
      // DIAGNOSTIC LOGGING
      console.log('🔍 [DIAGNOSTIC] Gemini response metadata:');
      console.log('   - finishReason:', res?.candidates?.[0]?.finishReason || 'N/A');
      console.log('   - usageMetadata:', JSON.stringify(res?.usageMetadata || {}, null, 2));
      console.log('   - Response length:', res?.text?.length || 0, 'characters');
      
      const text = res?.text || "{}";
      console.log('📄 [DIAGNOSTIC] Full raw response:', text);
      
      let cleaned = text.trim();
      cleaned = cleaned.replace(/```json\s*/, '').replace(/```\s*$/, '');
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
      // REMOVED: repairJsonString was CORRUPTING valid JSON by adding extra quotes
      
      try {
        JSON.parse(cleaned);
        console.log('✅ [DIAGNOSTIC] JSON parsing succeeded!');
      } catch (e) {
        console.error('❌ Invalid JSON response from Gemini (rank analysis)');
        console.error('📄 Raw response (first 1000 chars):', text.substring(0, 1000));
        console.error('🔧 Cleaned response (first 1000 chars):', cleaned.substring(0, 1000));
        throw new Error('JSON parsing failed, will retry');
      }
      
      return { text, cleaned };
    },
    2,
    1000,
    'Rank History Analysis'
  );

  const analysisData = JSON.parse(result.cleaned);
  console.log(`✅ [PARALLEL] Rank history analysis complete for ${athleteName}`);
  return analysisData;
}

/**
 * Generate BOTH competitive history AND rank history analysis for Taekwondo athletes
 * This function coordinates parallel execution of both analyses
 */
export async function generateTaekwondoHistoryAnalysis(
  athleteName: string,
  competitionHistoryData: any[],
  rankHistoryData: any[],
  athleteData?: any,
  language: string = 'en'
): Promise<{ competitiveAnalysis: any; rankAnalysis: any }> {
  console.log(`🥋 Starting PARALLEL Taekwondo history analysis for ${athleteName}...`);
  const startTime = Date.now();
  
  // Run both analyses in parallel using Promise.allSettled
  const [competitiveResult, rankResult] = await Promise.allSettled([
    generateTaekwondoCompetitiveAnalysis(athleteName, competitionHistoryData, athleteData, language),
    generateTaekwondoRankAnalysis(athleteName, rankHistoryData, athleteData, language)
  ]);

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`⏱️ Parallel execution completed in ${elapsedTime}s`);

  // Process results and handle partial failures
  let competitiveAnalysis: any = null;
  let rankAnalysis: any = null;
  const errors: string[] = [];

  if (competitiveResult.status === 'fulfilled') {
    competitiveAnalysis = competitiveResult.value;
    console.log(`✅ Competitive analysis succeeded`);
  } else {
    const error = competitiveResult.reason instanceof Error ? competitiveResult.reason.message : String(competitiveResult.reason);
    console.error(`❌ Competitive analysis failed: ${error}`);
    errors.push(`Competitive analysis failed: ${error}`);
  }

  if (rankResult.status === 'fulfilled') {
    rankAnalysis = rankResult.value;
    console.log(`✅ Rank analysis succeeded`);
  } else {
    const error = rankResult.reason instanceof Error ? rankResult.reason.message : String(rankResult.reason);
    console.error(`❌ Rank analysis failed: ${error}`);
    errors.push(`Rank analysis failed: ${error}`);
  }

  // If both failed, throw error
  if (!competitiveAnalysis && !rankAnalysis) {
    throw new Error(`Both analyses failed: ${errors.join('; ')}`);
  }

  // Return combined result with partial failure metadata
  const result: { competitiveAnalysis: any; rankAnalysis: any; partialFailure?: boolean; errors?: string[] } = {
    competitiveAnalysis: competitiveAnalysis || {
      athlete_name: athleteName,
      sport: 'Taekwondo',
      career_overview: 'Analysis unavailable due to generation error',
      error: true
    },
    rankAnalysis: rankAnalysis || {
      athlete_name: athleteName,
      sport: 'Taekwondo',
      ranking_overview: {
        highest_rank: 'N/A',
        current_rank: 'N/A',
        rank_range: 'N/A',
        volatility: 'N/A'
      },
      error: true
    }
  };

  if (errors.length > 0) {
    result.partialFailure = true;
    result.errors = errors;
    console.log(`⚠️ Partial success: ${errors.length} analysis failed`);
  } else {
    console.log(`✅ Full success: Both analyses completed in ${elapsedTime}s`);
  }

  return result;
}


/**
 * Generate professional competitive history analysis from BrowserUse data
 * This function receives the competitive history data and generates a professional analysis
 */
export async function generateCompetitiveHistoryAnalysis(
  athleteName: string,
  sport: string,
  competitiveHistoryData: any,
  athleteData?: any,
  language: string = 'en'
): Promise<any> {
  try {
    const languageInstruction = language === 'ar' 
      ? 'Generate ALL content in Arabic language. Use professional Arabic sports terminology.'
      : 'Generate ALL content in English language.';

    const prompt = `You are a professional sports analyst specializing in competitive history and career progression analysis.

${languageInstruction}

Analyze the competitive history and career progression of ${athleteName}, a ${sport} athlete.

**Competitive History Data:**
${JSON.stringify(competitiveHistoryData, null, 2)}

${athleteData ? `**Additional Athlete Information:**
${JSON.stringify(athleteData, null, 2)}` : ''}

**Task:**
Generate a comprehensive competitive history analysis with the following structure:

1. **Career Overview**: Summarize the athlete's competitive journey and key milestones
2. **Peak Performance Periods**: Identify and analyze the athlete's best performance phases
3. **Competition Analysis**: Analyze performance across different competition tiers (Grand Prix, World Championships, Olympics, etc.)
4. **Progression Patterns**: Identify trends, improvements, and significant changes in performance
5. **Notable Achievements**: Highlight the most significant accomplishments and breakthrough moments
6. **Recent Form**: Analyze current performance and recent competition results

**CRITICAL REQUIREMENTS:**
- Use ONLY the provided data for your analysis
- Do NOT include any citations, URLs, links, or references in your response
- Do NOT use markdown link syntax like [text](url) or bare URLs
- Provide evidence-based insights using the competition results provided
- Structure your analysis in clear, professional paragraphs
- Focus on patterns, trends, and meaningful insights
- Return ONLY valid JSON - no markdown, no code blocks, no explanations
- ${languageInstruction}

Return your analysis in this JSON format:
{
  "athlete_name": "${athleteName}",
  "sport": "${sport}",
  "active_period": {
    "start_year": 2018,
    "end_year": "current"
  },
  "career_overview": "Comprehensive career summary",
  "peak_performance_periods": [
    {
      "period": "Time period",
      "description": "Analysis of this peak period",
      "key_results": ["Notable results from this period"]
    }
  ],
  "competition_analysis": {
    "grand_prix": "Analysis of Grand Prix performance",
    "world_championships": "Analysis of World Championship performance", 
    "olympic_games": "Analysis of Olympic performance (if applicable)",
    "continental_events": "Analysis of continental competition performance"
  },
  "progression_patterns": "Analysis of career progression and trends",
  "notable_achievements": [
    {
      "achievement": "Achievement description",
      "significance": "Why this achievement is significant"
    }
  ],
  "recent_form": "Analysis of recent performance and current status",
  "insights": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ]
}

IMPORTANT: For active_period, determine the start_year from the earliest competition in the data, and end_year should be "current" if the athlete competed in 2024-2025, otherwise use the last competition year.`;

    // Response schema to enforce proper JSON structure
    const responseSchema = {
      type: "object",
      properties: {
        athlete_name: { type: "string" },
        sport: { type: "string" },
        active_period: {
          type: "object",
          properties: {
            start_year: { type: ["number", "string"] },
            end_year: { type: ["number", "string"] }
          },
          required: ["start_year", "end_year"]
        },
        career_overview: { type: "string" },
        peak_performance_periods: {
          type: "array",
          items: {
            type: "object",
            properties: {
              period: { type: "string" },
              description: { type: "string" },
              key_results: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["period", "description", "key_results"]
          }
        },
        competition_analysis: {
          type: "object",
          properties: {
            grand_prix: { type: "string" },
            world_championships: { type: "string" },
            olympic_games: { type: "string" },
            continental_events: { type: "string" }
          }
        },
        progression_patterns: { type: "string" },
        notable_achievements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              achievement: { type: "string" },
              significance: { type: "string" }
            },
            required: ["achievement", "significance"]
          }
        },
        recent_form: { type: "string" },
        insights: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["athlete_name", "sport", "active_period", "career_overview"]
    };

    let result;
    try {
      console.log(`⏳ Generating competitive history analysis for ${athleteName}...`);
      
      result = await retryWithBackoff(
        async () => {
          const res = await genAI.models.generateContent({
            model: "gemini-2.5-pro",
            config: {
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.3,
              maxOutputTokens: 8000
            },
            contents: prompt
          });
          
          const text = res?.text || "{}";
          
          // Clean and parse the JSON response
          let cleaned = text.trim();
          cleaned = cleaned.replace(/```json\s*/, '').replace(/```\s*$/, '');
          cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
          cleaned = repairJsonString(cleaned);
          
          // Validate it's proper JSON
          try {
            JSON.parse(cleaned);
          } catch (e) {
            console.error('❌ Invalid JSON response from Gemini (competitive history)');
            throw new Error('JSON parsing failed, will retry');
          }
          
          return { text, cleaned };
        },
        2, // max 2 retries (3 total attempts)
        1000, // 1 second base delay
        'Competitive History Analysis'
      );
    } catch (retryError) {
      console.error('[COMPETITIVE_HISTORY] All retries failed:', retryError);
      throw new Error('Failed to generate competitive history analysis after multiple attempts');
    }

    const analysisData = JSON.parse(result.cleaned);
    
    console.log(`✅ Gemini competitive history analysis generated for ${athleteName}`);
    return analysisData;

  } catch (error) {
    console.error(`❌ Gemini competitive history analysis failed for ${athleteName}:`, error);
    throw error;
  }
}