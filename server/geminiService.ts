import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface NutritionPlanData {
  plan: string;
}

export async function generateNutritionPlan(
  name: string,
  age: number,
  gender: string,
  sport: string,
  nationality: string
): Promise<NutritionPlanData> {
  try {
    const prompt = `Create a comprehensive, personalized nutrition plan for an athlete with the following profile:

**Athlete Information:**
- Name: ${name}
- Age: ${age} years old
- Gender: ${gender}
- Sport: ${sport}
- Nationality: ${nationality}

**Requirements:**
1. Create meals that are primarily from ${nationality} cuisine and food culture
2. Adapt the nutrition plan specifically for ${sport} athletes
3. Consider the athlete's age (${age}) and gender (${gender}) for appropriate caloric and nutritional needs
4. Include pre-training, post-training, and recovery meal recommendations
5. Provide specific meal timing recommendations
6. Include hydration guidelines
7. Consider any sport-specific nutritional requirements (e.g., endurance sports need more carbs, strength sports need more protein)

**Format the response as a detailed nutrition plan with:**
- Daily caloric requirements
- Macronutrient breakdown (protein, carbs, fats)
- Sample meal plan for a typical training day
- Pre/post workout nutrition
- Traditional ${nationality} foods that support athletic performance
- Hydration schedule
- Recovery nutrition strategies
- Any supplements recommendations if appropriate

Make the plan practical, culturally appropriate, and specifically tailored to optimize performance in ${sport}.`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });

    const nutritionPlan = result.text || "Unable to generate nutrition plan";

    return {
      plan: nutritionPlan
    };
  } catch (error) {
    console.error("Error generating nutrition plan:", error);
    throw new Error(`Failed to generate nutrition plan: ${error instanceof Error ? error.message : String(error)}`);
  }
}