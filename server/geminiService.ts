import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NutritionPlanData {
  plan: string;
}

export interface StructuredNutritionPlan {
  dailyCalories: number;
  macronutrients: {
    protein: string;
    carbs: string;
    fats: string;
  };
  mealPlan: {
    breakfast: {
      time: string;
      meal: string;
      calories: number;
    };
    lunch: {
      time: string;
      meal: string;
      calories: number;
    };
    dinner: {
      time: string;
      meal: string;
      calories: number;
    };
    snacks: {
      time: string;
      meal: string;
      calories: number;
    }[];
  };
  preWorkout: {
    timing: string;
    foods: string[];
    hydration: string;
  };
  postWorkout: {
    timing: string;
    foods: string[];
    hydration: string;
  };
  culturalFoods: string[];
  hydrationSchedule: string[];
  recovery: {
    foods: string[];
    timing: string[];
  };
  supplements: string[];
  notes: string;
}

export async function generateNutritionPlan(
  name: string,
  age: number,
  gender: string,
  sport: string,
  nationality: string
): Promise<NutritionPlanData> {
  try {
    const systemPrompt = `You are a professional sports nutritionist. Create a comprehensive nutrition plan in JSON format only. Do not include any text before or after the JSON. The response must be valid JSON.`;

    const prompt = `Create a comprehensive personalized nutrition plan for this athlete:

Athlete: ${name} (${age} years old ${gender} from ${nationality})
Sport: ${sport}

Return ONLY valid JSON in this exact structure (no additional text):
{
  "dailyCalories": number,
  "macronutrients": {
    "protein": "percentage and grams",
    "carbs": "percentage and grams", 
    "fats": "percentage and grams"
  },
  "mealPlan": {
    "breakfast": {
      "time": "time range",
      "meal": "detailed meal with ${nationality} foods",
      "calories": number
    },
    "lunch": {
      "time": "time range",
      "meal": "detailed meal with ${nationality} foods",
      "calories": number
    },
    "dinner": {
      "time": "time range", 
      "meal": "detailed meal with ${nationality} foods",
      "calories": number
    },
    "snacks": [
      {
        "time": "time",
        "meal": "snack details",
        "calories": number
      }
    ]
  },
  "preWorkout": {
    "timing": "when to eat before training",
    "foods": ["food1", "food2", "food3"],
    "hydration": "hydration guidance"
  },
  "postWorkout": {
    "timing": "when to eat after training",
    "foods": ["food1", "food2", "food3"], 
    "hydration": "hydration guidance"
  },
  "culturalFoods": ["traditional ${nationality} foods for athletes"],
  "hydrationSchedule": ["hydration timing throughout day"],
  "recovery": {
    "foods": ["recovery foods"],
    "timing": ["when to consume recovery foods"]
  },
  "supplements": ["recommended supplements if appropriate"],
  "notes": "additional important notes for ${sport} performance"
}

Make it culturally appropriate for ${nationality} cuisine and optimized for ${sport} performance.`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
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
        dailyCalories: 2500,
        macronutrients: {
          protein: "25% (156g)",
          carbs: "50% (313g)", 
          fats: "25% (69g)"
        },
        mealPlan: {
          breakfast: {
            time: "7:00-8:00 AM",
            meal: "Traditional breakfast with local ingredients",
            calories: 500
          },
          lunch: {
            time: "12:00-1:00 PM", 
            meal: "Balanced lunch with cultural foods",
            calories: 700
          },
          dinner: {
            time: "6:00-7:00 PM",
            meal: "Nutritious dinner with traditional elements",
            calories: 600
          },
          snacks: [{
            time: "3:00 PM",
            meal: "Healthy snack",
            calories: 200
          }]
        },
        preWorkout: {
          timing: "1-2 hours before training",
          foods: ["Light carbohydrates", "Easily digestible foods"],
          hydration: "16-20 oz water"
        },
        postWorkout: {
          timing: "Within 30 minutes after training",
          foods: ["Protein", "Carbohydrates", "Recovery foods"],
          hydration: "24 oz water per pound lost"
        },
        culturalFoods: [`Traditional ${nationality} foods for athletic performance`],
        hydrationSchedule: ["Morning: 16 oz", "Pre-workout: 8 oz", "During workout: 6-8 oz every 15-20 min"],
        recovery: {
          foods: ["Anti-inflammatory foods", "Protein-rich options"],
          timing: ["Post-workout", "Before bed"]
        },
        supplements: ["As recommended by sports nutritionist"],
        notes: `Nutrition plan tailored for ${sport} performance and ${nationality} cultural preferences`
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