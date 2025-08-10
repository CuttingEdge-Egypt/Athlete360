import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AthleteData {
  name: string;
  bio: string;
  rank: number | string;
  achievements: string[];
  recentNews: string[];
  worldRank?: string;
  currentRecord?: string;
}

// Simple function to get enhanced taekwondo data
async function getEnhancedTaekwondoData(name: string, nationality?: string): Promise<{ worldRank: string; currentRecord: string }> {
  try {
    return { worldRank: "N/A", currentRecord: "N/A" };
  } catch (error) {
    console.error("Error fetching enhanced taekwondo data:", error);
    return { worldRank: "N/A", currentRecord: "N/A" };
  }
}

export async function generateAthleteBiography(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  const isTaekwondo = sport.toLowerCase() === 'taekwondo';
  
  const prompt = `Today's date is ${currentDate}.
    
    Search the web for current, accurate information about the athlete "${name}"${nationalityContext} who competes in ${sport}. ${isTaekwondo ? 'For taekwondo athletes, search https://www.taekwondodata.com/ for accurate competition records, rankings, and profiles. ' : ''}
    
    Create a detailed biography with the following structure:

    **Player's Overall Intro**
    A comprehensive introductory section about who they are, their background, and their standing in ${sport}.

    **Achievements**  
    A detailed section describing their major career achievements, medals, titles, and accolades with specific years and competitions.

    **Recent Competitions**
    Detailed information about their recent competition results, 2024-2025 season performance, and current form.

    **Impact on the Sport and Competitions**
    A section about their influence on ${sport}, their competitive style, what they're known for, and their contributions to the sport.

    Make the biography comprehensive and detailed with each section clearly marked. Include specific competition names, years, achievements, and performance details where available.

    IMPORTANT: Only mention information that is 100% accurate and verifiable from web search. Do not include any links, URLs, citations, or references.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after your knowledge cutoff. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert sports biographer. You must search the web for current, accurate information about athletes. Focus on finding real competition results, rankings, and biographical details. Always respond in valid JSON format."
        },
        {
          role: "user",
          content: `${prompt}

Respond in this exact JSON format:
{
  "name": "athlete's full name",
  "bio": "detailed biography with web search data, no links or citations",
  "rank": "current world ranking or N/A", 
  "achievements": ["array of key achievements"],
  "recentNews": ["array of recent news or competition results"]
}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_completion_tokens: 8000
    });

    console.log("Full OpenAI Response:", JSON.stringify(response, null, 2));
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const athleteData = JSON.parse(content) as AthleteData;
    
    if (!athleteData.name || !athleteData.bio) {
      throw new Error("Missing required fields in OpenAI response");
    }

    athleteData.achievements = athleteData.achievements || [];
    athleteData.recentNews = athleteData.recentNews || [];

    if (typeof athleteData.rank === 'string' && !isNaN(Number(athleteData.rank)) && athleteData.rank !== 'N/A') {
      athleteData.rank = Number(athleteData.rank);
    }

    if (isTaekwondo) {
      console.log(`Enhancing taekwondo data for ${name}...`);
      const enhancedData = await getEnhancedTaekwondoData(name, nationality);
      athleteData.worldRank = enhancedData.worldRank;
      athleteData.currentRecord = enhancedData.currentRecord;
    }

    return athleteData;
  } catch (error) {
    console.error(`❌ Error generating OpenAI profile for ${name}:`, error);
    throw new Error(`Failed to generate OpenAI profile for ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function refreshAthleteBiographyWithSearch(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  const isTaekwondo = sport.toLowerCase() === 'taekwondo';
  
  const prompt = `Today's date is ${currentDate}.
    
    Search the web for current, accurate information about the athlete "${name}"${nationalityContext} who competes in ${sport}. ${isTaekwondo ? 'For taekwondo athletes, search https://www.taekwondodata.com/ for accurate competition records, rankings, and profiles. ' : ''}
    
    Create a detailed biography with the following structure:

    **Player's Overall Intro**
    A comprehensive introductory section about who they are, their background, and their standing in ${sport}.

    **Achievements**  
    A detailed section describing their major career achievements, medals, titles, and accolades with specific years and competitions.

    **Recent Competitions**
    Detailed information about their recent competition results, 2024-2025 season performance, and current form.

    **Impact on the Sport and Competitions**
    A section about their influence on ${sport}, their competitive style, what they're known for, and their contributions to the sport.

    Make the biography comprehensive and detailed with each section clearly marked. Include specific competition names, years, achievements, and performance details where available.

    IMPORTANT: Only mention information that is 100% accurate and verifiable from web search. Do not include any links, URLs, citations, or references.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after your knowledge cutoff. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert sports biographer. You must search the web for current, accurate information about athletes. Focus on finding real competition results, rankings, and biographical details. Always respond in valid JSON format."
        },
        {
          role: "user",
          content: `${prompt}

Respond in this exact JSON format:
{
  "name": "athlete's full name",
  "bio": "detailed biography with web search data, no links or citations",
  "rank": "current world ranking or N/A", 
  "achievements": ["array of key achievements"],
  "recentNews": ["array of recent news or competition results"]
}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_completion_tokens: 8000
    });

    console.log("Full OpenAI Refresh Response:", JSON.stringify(response, null, 2));
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI refresh");
    }

    const athleteData = JSON.parse(content) as AthleteData;
    
    if (!athleteData.name || !athleteData.bio) {
      throw new Error("Missing required fields in OpenAI refresh response");
    }

    athleteData.achievements = athleteData.achievements || [];
    athleteData.recentNews = athleteData.recentNews || [];

    if (typeof athleteData.rank === 'string' && !isNaN(Number(athleteData.rank)) && athleteData.rank !== 'N/A') {
      athleteData.rank = Number(athleteData.rank);
    }

    return athleteData;
  } catch (error) {
    console.error(`❌ Error refreshing OpenAI profile for ${name}:`, error);
    throw new Error(`Failed to refresh OpenAI profile for ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Analysis service functions with GPT-5 and temperature 1.0
export interface AnalysisData {
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; description: string }>;
  developmentPlans: Array<{ title: string; description: string; week: number }>;
  nutritionPlans: Array<{ title: string; description: string; mealType: string }>;
  beatStrategies: Array<{ title: string; description: string; opponent: string }>;
  rankHistory: Array<{ rank: number; date: string; tournament?: string }>;
}

export async function getAthleteProfile(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  return generateAthleteBiography(name, sport, nationality);
}

export async function getDetailedAnalysis(name: string, sport: string, analysisType: string): Promise<AnalysisData> {
  const prompt = `Create detailed ${analysisType} analysis for athlete "${name}" who competes in ${sport}. Provide comprehensive insights based on typical performance patterns in ${sport}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after your knowledge cutoff. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a professional sports analyst specializing in ${sport}. Provide detailed, actionable analysis.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_completion_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    return JSON.parse(content) as AnalysisData;
  } catch (error) {
    console.error(`❌ Error generating ${analysisType} analysis:`, error);
    throw new Error(`Failed to generate ${analysisType} analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getSpecificAnalysis(name: string, sport: string, analysisType: string): Promise<any> {
  const analysisPrompts = {
    strengths: `Analyze the competitive strengths of ${name} in ${sport}. Focus on technical skills, physical attributes, and tactical advantages.`,
    weaknesses: `Identify areas for improvement for ${name} in ${sport}. Focus on technical gaps, physical limitations, and tactical weaknesses.`,
    developmentPlan: `Create a comprehensive development plan for ${name} in ${sport}. Include training phases, skill development, and competition strategy.`,
    nutritionPlan: `Design a sport-specific nutrition plan for ${name} in ${sport}. Include meal timing, macronutrient distribution, and competition nutrition.`,
    beatStrategies: `Develop strategic approaches for ${name} to succeed in ${sport} competitions. Focus on tactical preparation and competitive advantages.`,
    videoAnalysis: `Provide technical analysis recommendations for ${name} in ${sport}. Focus on movement patterns, technique refinement, and performance optimization.`
  };

  const prompt = analysisPrompts[analysisType as keyof typeof analysisPrompts] || `Provide detailed analysis for ${name} in ${sport}.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after your knowledge cutoff. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a professional sports analyst specializing in ${sport}. Provide detailed, actionable analysis in JSON format.`
        },
        {
          role: "user",
          content: `${prompt}

Respond in JSON format with relevant fields for ${analysisType} analysis.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_completion_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error generating ${analysisType} analysis:`, error);
    throw new Error(`Failed to generate ${analysisType} analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function compareAthletes(athlete1: string, athlete2: string, sport: string): Promise<any> {
  const prompt = `Compare athletes "${athlete1}" and "${athlete2}" who both compete in ${sport}. Provide comprehensive comparison including strengths, weaknesses, head-to-head predictions, and competitive analysis.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after your knowledge cutoff. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a professional sports analyst specializing in ${sport}. Provide detailed comparative analysis between athletes.`
        },
        {
          role: "user",
          content: `${prompt}

Respond in JSON format with comparison data, predictions, and analysis.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_completion_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error comparing athletes:`, error);
    throw new Error(`Failed to compare athletes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Image search functions - simplified versions
export async function searchTaekwondoDataProfilePicture(name: string, nationality?: string): Promise<string | null> {
  // For taekwondo athletes, return null to use default avatar
  // This maintains the policy of not using misleading placeholder images
  console.log(`Searching for taekwondo image for ${name} from ${nationality || 'unknown country'}`);
  return null;
}

export async function searchAthleteImage(name: string, sport: string): Promise<string | null> {
  // Return null to use default avatar - maintains authentic data policy
  console.log(`Searching for ${sport} athlete image for ${name}`);
  return null;
}

// Alias functions for backward compatibility
export const generateSpecificAnalysis = getSpecificAnalysis;
export const generateThreadedBiography = generateAthleteBiography;