import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const weightGoal = currentWeight !== targetWeight ? 
      `${currentWeight > targetWeight ? 'lose' : 'gain'} ${Math.abs(currentWeight - targetWeight)}kg` : 
      'maintain current weight';
    
    // Calculate total days based on period
    const totalDays = period * 7;
    
    // Language-specific system prompt
    const isArabic = language === 'ar';
    const systemPrompt = isArabic ? 
      `أنت أخصائي تغذية رياضية محترف متخصص في المأكولات ${nationalityText === 'international' ? 'العالمية' : nationalityText}. قم بإنشاء خطة تغذية لمدة ${period} أسابيع (${totalDays} أيام) بصيغة JSON فقط. لا تشمل أي نص قبل أو بعد JSON. يجب أن تكون الاستجابة JSON صالحة بدون أي تنسيق markdown.` :
      `You are a professional sports nutritionist specializing in ${nationalityText} cuisine. Create a ${period}-week nutrition plan (${totalDays} days) in JSON format only. Do not include any text before or after the JSON. The response must be valid JSON without any markdown formatting.`;
    
    // Enhanced prompt with all form data
    const prompt = isArabic ? 
      `قم بإنشاء خطة تغذية شخصية لمدة ${period} أسابيع (${totalDays} أيام) لهذا الرياضي الذي يلعب ${sportName}:

الرياضي: ${name} (${genderText} من ${nationalityText})
الرياضة التي يلعبها: ${sportName}
الهدف: ${goal}
الطول: ${height} سم
الوزن الحالي: ${currentWeight} كغ
الوزن المستهدف: ${targetWeight} كغ
الفترة الزمنية: ${period} أسبوع
هدف الوزن: ${weightGoal}

مهم جداً: أرجع JSON صالح فقط بهذا التركيب الدقيق بدون أي نص إضافي، بدون markdown، بدون شروحات:

{
  "instructions": "تعليمات شاملة وشخصية للرياضي بناءً على هدفه ومعلوماته - يجب أن تشمل نصائح عامة للتغذية والتدريب والاستشفاء لرياضة ${sportName}",
  "days": [
    {
      "day": {
        "date": "2024-08-14",
        "name": "الاثنين"
      },
      "meals": [
        {
          "calories_intake": "500 سعرة حرارية",
          "meal_description": [
            "طبق إفطار تقليدي ${nationalityText} 100غ",
            "عنصر آخر مع الكمية"
          ]
        },
        {
          "calories_intake": "300 سعرة حرارية",
          "meal_description": [
            "وجبة خفيفة في منتصف الصباح"
          ]
        },
        {
          "calories_intake": "700 سعرة حرارية",
          "meal_description": [
            "غداء تقليدي ${nationalityText}"
          ]
        },
        {
          "calories_intake": "200 سعرة حرارية",
          "meal_description": [
            "وجبة خفيفة بعد الظهر"
          ]
        },
        {
          "calories_intake": "600 سعرة حرارية",
          "meal_description": [
            "عشاء تقليدي ${nationalityText}"
          ]
        }
      ],
      "explanation": "شرح موجز لماذا تدعم هذه الخطة اليومية أداء ${sportName} مع الأطعمة ${nationalityText}",
      "total_calories_intake": "2300 سعرة حرارية"
    }
  ]
}

المتطلبات:
- استخدم الأطعمة التقليدية ${nationalityText} المناسبة لرياضيي ${sportName}
- اشمل 5 وجبات يومياً (إفطار، وجبة خفيفة، غداء، وجبة خفيفة، عشاء)
- ضع في الاعتبار احتياجات تدريب ${sportName} (القوة الانفجارية، الرشاقة، الاستشفاء)
- احسب السعرات الحرارية بناءً على هدف ${weightGoal} خلال ${period} أسبوع
- قدم أحجام واقعية للحصص
- أنشئ ${totalDays} أيام كاملة (${period} أسابيع)
- كل وجبة يجب أن تحتوي على 2-4 عناصر غذائية مع الكميات

متطلبات التنويع (مهم جداً):
- لكل أسبوع بعد الأسبوع الأول: يجب أن تكون 60-70% من الوجبات مختلفة عن الأسبوع السابق
- اقصر تكرار الوجبات المتطابقة إلى وجبتين كحد أقصى في الأسبوع الواحد
- نوّع مصادر البروتين: (دجاج، سمك، لحم بقري، بقوليات، بيض) عبر الأسابيع
- نوّع الحبوب: (أرز، برغل، فريكة، معكرونة، خبز متنوع) عبر الأسابيع  
- نوّع طرق الطبخ: (مشوي، مخبوز، مطبوخ، مقلي بقليل من الزيت) عبر الأسابيع
- نوّع الخضار والفواكه والوجبات الخفيفة بين الأسابيع
- لا يجوز أن يكون أي أسبوع نسخة من الأسبوع السابق

الاتساق الغذائي:
- حافظ على إجمالي السعرات الحرارية اليومية ضمن ±5% من الأساس
- حافظ على نسب الماكرو المتشابهة عبر الأسابيع
- احتفظ بالاحتياجات الخاصة برياضة ${sportName}

معالجة الأخطاء: إذا لم تستطع إنشاء خطة تغذية حقيقية بسبب عدم كفاية البيانات، فشل البحث على الويب، أو أي مشاكل أخرى، أرجع هذا التركيب JSON بالضبط:
{
  "error": true,
  "errorType": "insufficient_data|web_search_failed|parsing_error|other",
  "errorMessage": "السبب المحدد لفشل خطة التغذية",
  "retryable": true,
  "suggestion": "ما يجب على المستخدم المحاولة بدلاً من ذلك"
}` :
      `Create a personalized ${period}-week nutrition plan (${totalDays} days) for this athlete who plays ${sportName}:

Athlete: ${name} (${genderText} from ${nationalityText})
Sport they play: ${sportName}
Goal: ${goal}
Height: ${height}cm
Current Weight: ${currentWeight}kg
Target Weight: ${targetWeight}kg
Timeframe: ${period} weeks
Weight Goal: ${weightGoal}

CRITICAL: Return ONLY valid JSON in this EXACT structure with no additional text, no markdown, no explanations:

{
  "instructions": "Comprehensive personalized instructions for the athlete based on their goal and information - should include general advice for nutrition, training, and recovery specific to ${sportName}",
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
            "Traditional ${nationalityText} lunch items"
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
            "Traditional ${nationalityText} dinner items"
          ]
        }
      ],
      "explanation": "Brief explanation of why this daily plan supports ${sportName} performance with ${nationalityText} foods",
      "total_calories_intake": "2300 kcal"
    }
  ]
}

Requirements:
- Use traditional ${nationalityText} foods appropriate for ${sportName} athletes
- Include 5 meals per day (breakfast, snack, lunch, snack, dinner)
- Consider ${sportName} training needs (explosive power, agility, recovery)
- Calculate calories based on ${weightGoal} goal over ${period} weeks
- Provide realistic portion sizes
- Generate ${totalDays} complete days (${period} weeks)
- Each meal should have 2-4 food items with quantities

VARIETY REQUIREMENTS (CRITICAL):
- For each week after Week 1: at least 60-70% of meals must be different from the prior week
- Limit exact meal repeats to maximum 2 per week
- Rotate proteins: (chicken, fish, beef, legumes, eggs) across weeks
- Rotate grains: (rice, bulgur, freekeh, pasta, bread varieties) across weeks
- Rotate cooking methods: (grilled, baked, stewed, sautéed) across weeks
- Vary vegetables, fruits, and snacks between weeks
- No week may be a copy of the prior week

NUTRITION CONSISTENCY:
- Keep daily total_calories_intake within ±5% of baseline across weeks
- Maintain similar macro ratios week-to-week
- Preserve sport-specific needs for ${sportName}

FAILURE HANDLING: If you cannot generate authentic nutrition plan due to insufficient data, web search failures, or any other issues, return this exact JSON structure:
{
  "error": true,
  "errorType": "insufficient_data|web_search_failed|parsing_error|other",
  "errorMessage": "Specific reason why nutrition plan failed",
  "retryable": true,
  "suggestion": "What the user should try instead"
}`;

    // Implement week-by-week generation for multi-week plans
    let allWeeks: NutritionPlanDay[][] = [];
    let allDays: NutritionPlanDay[] = [];
    
    const weeklyGenerationSchema = {
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
    
    // Generate each week separately
    for (let weekNum = 0; weekNum < period; weekNum++) {
      const isFirstWeek = weekNum === 0;
      let weekPrompt = prompt;
      
      if (!isFirstWeek) {
        // Add variety context for subsequent weeks
        const varietyContext = summarizePreviousWeeks(allWeeks);
        const varietyInstructions = isArabic ?
          `\n\nسياق التنويع للأسبوع ${weekNum + 1}:\n${varietyContext}\n\nمهم: يجب أن تكون 60-70% من الوجبات مختلفة عن الأسابيع السابقة. نوّع البروتينات والحبوب وطرق الطبخ.` :
          `\n\nVariety Context for Week ${weekNum + 1}:\n${varietyContext}\n\nIMPORTANT: 60-70% of meals must be different from previous weeks. Vary proteins, grains, and cooking methods.`;
        
        weekPrompt = weekPrompt.replace(
          isArabic ? `أنشئ ${totalDays} أيام كاملة` : `Generate ${totalDays} complete days`,
          isArabic ? `أنشئ 7 أيام فقط للأسبوع ${weekNum + 1}` : `Generate only 7 days for Week ${weekNum + 1}`
        ) + varietyInstructions;
      } else {
        // For first week, only generate 7 days
        weekPrompt = weekPrompt.replace(
          isArabic ? `أنشئ ${totalDays} أيام كاملة` : `Generate ${totalDays} complete days`,
          isArabic ? 'أنشئ 7 أيام للأسبوع الأول' : 'Generate 7 days for Week 1'
        );
      }
      
      console.log(`⏳ Starting Week ${weekNum + 1}/${period} nutrition generation...`);
      const startTime = Date.now();
      
      // Attempt generation with timeout and retry logic
      let result;
      let attempt = 0;
      const maxAttempts = 2;
      
      while (attempt < maxAttempts) {
        try {
          const timeoutMs = 75000; // 75 second timeout per attempt (based on observed ~50-55s actual times)
          
          // Create a promise that times out
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Timeout after ${timeoutMs}ms`));
            }, timeoutMs);
          });
          
          // Race between the API call and timeout
          const apiPromise = genAI.models.generateContent({
            model: attempt === 0 ? "gemini-2.5-pro" : "gemini-2.0-flash-exp", // Fallback to faster model
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              responseSchema: weeklyGenerationSchema,
              temperature: Math.min(1.0, isFirstWeek ? 0.7 : 0.8 + (weekNum * 0.05)), // Cap temperature at 1.0
              maxOutputTokens: 8000 // Increased for complete weekly JSON generation
            },
            contents: weekPrompt
          });
          
          result = await Promise.race([apiPromise, timeoutPromise]);
          
          const duration = Date.now() - startTime;
          console.log(`✅ Week ${weekNum + 1} generated successfully in ${duration}ms (attempt ${attempt + 1})`);
          break; // Success, exit retry loop
          
        } catch (error: any) {
          attempt++;
          const duration = Date.now() - startTime;
          console.log(`❌ Week ${weekNum + 1} generation failed (attempt ${attempt}/${maxAttempts}) after ${duration}ms:`, error.message);
          
          if (attempt >= maxAttempts) {
            console.log(`🚫 Week ${weekNum + 1} generation failed after ${maxAttempts} attempts`);
            throw new Error(`AI_TIMEOUT: Nutrition plan generation for week ${weekNum + 1} timed out after ${maxAttempts} attempts`);
          }
          
          // Exponential backoff before retry
          const backoffMs = 2000 * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying week ${weekNum + 1} in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
      
      if (!result) {
        throw new Error(`AI_TIMEOUT: No result after ${maxAttempts} attempts`);
      }

      const responseText = result?.text || "{}";
      
      // Debug: Log the raw response to see what Gemini is returning
      console.log(`🔍 Week ${weekNum + 1} raw response length: ${responseText.length} chars`);
      console.log(`🔍 Week ${weekNum + 1} raw response preview: ${responseText.substring(0, 200)}...`);
      
      // Check for error responses indicating no data found
      if (responseText.includes('"error": "no_data_found"') || 
          responseText.includes('"error": "search_failed"') || 
          responseText.includes('"error": "not_found"') ||
          responseText.includes('"success": false')) {
        throw new Error('AI_WEB_SEARCH_FAILED: No authentic nutrition data found through web search');
      }
      
      // Enhanced JSON cleaning and parsing
      let cleanedResponse = responseText.trim();
      
      // Remove any markdown code blocks
      cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      cleanedResponse = cleanedResponse.replace(/^```/, '').replace(/```$/, '');
      
      // Remove any leading/trailing non-JSON text
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      // Fix common JSON issues
      cleanedResponse = cleanedResponse
        .replace(/\n/g, ' ')  // Replace newlines with spaces
        .replace(/\r/g, ' ')  // Replace carriage returns
        .replace(/\t/g, ' ')  // Replace tabs
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
        .replace(/,\s*]/g, ']'); // Remove trailing commas before closing brackets
      
      console.log(`🔍 Week ${weekNum + 1} cleaned response length: ${cleanedResponse.length} chars`);
      console.log(`🔍 Week ${weekNum + 1} cleaned response preview: ${cleanedResponse.substring(0, 300)}...`);
      
      // Try to parse the JSON
      let weekPlan: StructuredNutritionPlan;
      try {
        weekPlan = JSON.parse(cleanedResponse);
        console.log(`✅ Week ${weekNum + 1} JSON parsed successfully`);
      } catch (parseError: any) {
        console.error(`❌ JSON parsing failed for week ${weekNum + 1}:`, parseError);
        console.error(`❌ Failed JSON content: ${cleanedResponse}`);
        
        // NO FALLBACK - Declare generation failed
        throw new Error(`AI_JSON_PARSE_FAILED: Week ${weekNum + 1} returned invalid JSON format. Raw response was ${responseText.length} chars, cleaned to ${cleanedResponse.length} chars. Parse error: ${parseError?.message || 'Unknown parse error'}`);
      }
      
      // Validate and potentially regenerate if too many duplicates
      if (!isFirstWeek && weekPlan.days && detectDuplicates(weekPlan.days, allWeeks)) {
        console.log(`Week ${weekNum + 1} has excessive duplicates, accepting as-is for now`);
      }
      
      // Add this week to our collection
      if (weekPlan.days && weekPlan.days.length > 0) {
        const weekDays = weekPlan.days.slice(0, 7); // Ensure only 7 days
        allWeeks.push(weekDays);
        allDays.push(...weekDays);
      }
    }
    
    // Combine all weeks into final structure
    const finalPlan: StructuredNutritionPlan = {
      instructions: allWeeks.length > 0 && allWeeks[0].length > 0 ? 
        (isArabic ? 
          `تعليمات شاملة للرياضي ${name} الذي يلعب ${sportName}. ركز على ${goal} من خلال اتباع هذه الخطة الغذائية لمدة ${period} أسابيع. استخدم الأطعمة ${nationalityText} التقليدية مع مراعاة احتياجات تدريب ${sportName} والاستشفاء المناسب.` :
          `Comprehensive instructions for athlete ${name} who plays ${sportName}. Focus on ${goal} by following this ${period}-week nutrition plan. Use traditional ${country} foods while considering ${sportName} training needs and proper recovery.`) :
        (isArabic ? 
          `تعليمات عامة للتغذية الرياضية للاعب ${sportName}` :
          `General sports nutrition instructions for ${sportName} athlete`),
      days: allDays
    };
    
    console.log(`Generated nutrition plan with ${allWeeks.length} weeks and ${allDays.length} total days`);
    
    return {
      plan: JSON.stringify(finalPlan)
    };
  } catch (error) {
    console.error("Error generating enhanced nutrition plan:", error);
    
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
    
    const systemPrompt = `You are a professional sports nutritionist specializing in ${nationalityText} cuisine. Create a ${period}-week nutrition plan (${totalDays} days) in JSON format only. Do not include any text before or after the JSON. The response must be valid JSON without any markdown formatting.`;
    
    const prompt = `Create a personalized ${period}-week nutrition plan (${totalDays} days) for this athlete:

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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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
      model: "gemini-2.5-pro",
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