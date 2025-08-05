import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AthleteData {
  name: string;
  sport: string;
  bio: string;
  rank: number;
  achievements: string[];
  recentNews: string;
  profileImageDescription: string;
}

export interface AnalysisData {
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; description: string }>;
  developmentPlans: Array<{ title: string; description: string; week: number }>;
  nutritionPlans: Array<{ title: string; description: string; mealType: string }>;
  beatStrategies: Array<{ title: string; description: string; opponent: string }>;
  rankHistory: Array<{ rank: number; date: string; tournament?: string }>;
}

export async function getAthleteProfile(name: string, sport: string): Promise<AthleteData> {
  const prompt = `Please provide comprehensive, up-to-date information about ${name}, the ${sport} athlete. Include:

1. Full name and current status (active/retired)
2. Detailed biography (500+ words) including career highlights, major achievements, playing style, and personal background
3. Current world ranking (if applicable) or historical peak ranking
4. Recent achievements and competitions (2024-2025)
5. Notable career statistics and records
6. Recent news or developments in their career
7. Brief description of their physical appearance for profile image context

Respond with accurate, factual information only. If the athlete is not well-known internationally, provide what information is available and indicate if they are a regional/national level competitor.

Format as JSON with these exact keys:
{
  "name": "Full official name",
  "sport": "${sport}",
  "bio": "Detailed biography",
  "rank": number (1-100, estimate if exact rank unknown),
  "achievements": ["achievement1", "achievement2", ...],
  "recentNews": "Latest developments or recent competition results",
  "profileImageDescription": "Brief physical description for image context"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a sports analytics expert with access to the most current athlete information. Provide accurate, factual data only. If information is uncertain, indicate that clearly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return {
      name: data.name || name,
      sport: data.sport || sport,
      bio: data.bio || `Professional ${sport} athlete with competitive experience.`,
      rank: data.rank || Math.floor(Math.random() * 50) + 1,
      achievements: data.achievements || [],
      recentNews: data.recentNews || "Recent competition data not available.",
      profileImageDescription: data.profileImageDescription || "Athletic build typical of professional athletes"
    };
  } catch (error) {
    console.error(`Error fetching athlete profile for ${name}:`, error);
    // Fallback with minimal data
    return {
      name,
      sport,
      bio: `Professional ${sport} athlete with competitive experience at national and international levels.`,
      rank: Math.floor(Math.random() * 50) + 1,
      achievements: [],
      recentNews: "Recent data unavailable.",
      profileImageDescription: "Professional athlete"
    };
  }
}

export async function getDetailedAnalysis(name: string, sport: string): Promise<AnalysisData> {
  const prompt = `Provide detailed performance analysis for ${name}, the ${sport} athlete. Include:

1. STRENGTHS: 5 specific technical/physical/mental strengths with detailed descriptions
2. WEAKNESSES: 3-4 areas for improvement with specific examples
3. DEVELOPMENT PLANS: 6 weekly training focuses (12-week program split into phases)
4. NUTRITION PLANS: 6 meal-specific nutrition recommendations
5. BEAT STRATEGIES: 4 tactical approaches against different opponent types
6. RANK HISTORY: 8-10 historical ranking points over the past 2 years with dates

Base this on real performance data, competition results, and known athletic characteristics. Be specific to the sport and athlete's known style.

Format as JSON with these exact keys:
{
  "strengths": [{"title": "Strength Name", "description": "Detailed description"}],
  "weaknesses": [{"title": "Weakness Name", "description": "Detailed description with examples"}],
  "developmentPlans": [{"title": "Phase Name", "description": "Training focus", "week": 1}],
  "nutritionPlans": [{"title": "Meal Name", "description": "Nutrition details", "mealType": "breakfast/lunch/dinner/snack"}],
  "beatStrategies": [{"title": "Strategy Name", "description": "Tactical approach", "opponent": "Opponent type"}],
  "rankHistory": [{"rank": number, "date": "YYYY-MM-DD", "tournament": "Tournament name if applicable"}]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system", 
          content: "You are a professional sports analyst with expertise in athlete performance analysis. Provide realistic, sport-specific analysis based on known athlete characteristics and general sport science principles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    
    // Ensure proper structure with defaults
    return {
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      developmentPlans: data.developmentPlans || [],
      nutritionPlans: data.nutritionPlans || [],
      beatStrategies: data.beatStrategies || [],
      rankHistory: data.rankHistory || []
    };
  } catch (error) {
    console.error(`Error fetching detailed analysis for ${name}:`, error);
    return {
      strengths: [],
      weaknesses: [],
      developmentPlans: [],
      nutritionPlans: [],
      beatStrategies: [],
      rankHistory: []
    };
  }
}

export async function generateSpecificAnalysis(
  athleteName: string, 
  sport: string, 
  analysisType: 'bio' | 'rank' | 'strengths' | 'weaknesses' | 'development' | 'nutrition' | 'beat' | 'video'
): Promise<any> {
  const prompts = {
    bio: `Provide a comprehensive, up-to-date biography for ${athleteName}, the ${sport} athlete. Include recent achievements, career highlights, playing style, and current status (2024-2025 season).`,
    
    rank: `Analyze ${athleteName}'s current ranking and performance trends in ${sport}. Include current world/national ranking, recent tournament results, and ranking progression over the past 2 years.`,
    
    strengths: `Identify and analyze the top 5 competitive strengths of ${athleteName} in ${sport}. Focus on technical skills, physical attributes, mental qualities, and tactical abilities that give them advantages.`,
    
    weaknesses: `Analyze areas for improvement in ${athleteName}'s ${sport} performance. Identify 3-4 specific weaknesses or challenges they face against top competition.`,
    
    development: `Create a comprehensive 12-week development plan for ${athleteName} in ${sport}. Include specific training phases, skill development focuses, and performance targets.`,
    
    nutrition: `Design a sport-specific nutrition plan for ${athleteName} as a ${sport} athlete. Include meal timing, macronutrient distribution, hydration strategies, and competition-day nutrition.`,
    
    beat: `Analyze tactical strategies ${athleteName} uses to defeat different types of opponents in ${sport}. Include specific game plans, technical approaches, and psychological tactics.`,
    
    video: `Provide detailed technical analysis of ${athleteName}'s ${sport} performance based on competition footage and biomechanical analysis. Focus on technique, efficiency, and areas for improvement.`
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a world-class ${sport} analyst with access to current performance data. Provide specific, actionable insights based on the latest information about this athlete.`
        },
        {
          role: "user",
          content: prompts[analysisType]
        }
      ],
      max_completion_tokens: 1500
    });

    return {
      content: response.choices[0].message.content || "Analysis unavailable.",
      timestamp: new Date().toISOString(),
      analysisType
    };
  } catch (error) {
    console.error(`Error generating ${analysisType} analysis for ${athleteName}:`, error);
    return {
      content: `Unable to generate ${analysisType} analysis at this time.`,
      timestamp: new Date().toISOString(),
      analysisType
    };
  }
}