import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_API_KEY || "" 
});

// Create Grounding with Google Search tool for enhanced real-time data retrieval
const groundingTool = {
  googleSearchRetrieval: {}
};

export interface AthleteData {
  name: string;
  sport: string;
  bio: string;
  rank: number | string;
  country?: string;
  achievements: string[];
  recentNews: string;
  profileImageDescription: string;
  referenceLinks?: string[];
  stats?: any;
}

export interface AnalysisData {
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; description: string }>;
  developmentPlans: Array<{ title: string; description: string; week: number }>;
  nutritionPlans: Array<{ title: string; description: string; mealType: string }>;
  beatStrategies: Array<{ title: string; description: string; opponent: string }>;
  rankHistory: Array<{ rank: number; date: string; tournament?: string }>;
}

export async function getAthleteProfile(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  // Add sport-specific data source guidance for Egyptian taekwondo athletes only
  const isEgyptianTaekwondo = sport.toLowerCase() === 'taekwondo' && (
    nationality?.toLowerCase().includes('egypt') ||
    name.includes('حبيبة') || name.includes('أحمد') || name.includes('محمد') ||
    /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(name)
  );
  
  const sportSpecificGuidance = isEgyptianTaekwondo 
    ? ' For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ for accurate competition records, rankings, and athlete profiles.'
    : '';

  const prompt = `Today's date is ${currentDate}. Tell me who is ${name} the ${nationalityContext}athlete, that plays ${sport}.
Give me a full biography about the athlete, their achievements, and their current ranking. Also include the most recent competition they participated in. 
Format as JSON with these exact keys:
{
  "name": "Full official name",
  "sport": "${sport}",
  "bio": "Detailed biography",
  "rank": "Actual world ranking number (e.g., 4949) or 'N/A' if not available",
  "country": "Nationality/country they represent",
  "achievements": ["achievement1", "achievement2", ...],
  "recentNews": "Latest competition results or 'N/A' if no recent data available",
  "profileImageDescription": "Brief physical description for image context",
  "referenceLinks": ["URL1", "URL2", ...] (include https://www.taekwondodata.com/ for taekwondo athletes if available)
}`;

  try {
    // Use Gemini with Google Search grounding for real-time data
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ 
        role: "user", 
        parts: [{ text: `${prompt}\n\nSystem: You are a world-class ${sport} analyst with comprehensive knowledge of current performance data as of ${currentDate}. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference for competition records, rankings, and profiles. ' : ''}Provide specific, factual, authentic information about athletes. NEVER use placeholder text or bracketed templates like [City, State], [Year], [Championship Name]. Consider the specified sport and nationality when identifying the correct athlete. Always respond in valid JSON format.` }]
      }],
      tools: [groundingTool],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            sport: { type: "string" },
            bio: { type: "string" },
            rank: { type: "string" },
            country: { type: "string" },
            achievements: { type: "array", items: { type: "string" } },
            recentNews: { type: "string" },
            profileImageDescription: { type: "string" },
            referenceLinks: { type: "array", items: { type: "string" } }
          },
          required: ["name", "sport", "bio", "rank", "country", "achievements", "recentNews", "profileImageDescription"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Parse rank - convert to number if it's a valid number, otherwise keep as string
    let parsedRank = data.rank;
    if (typeof data.rank === 'string' && !isNaN(Number(data.rank))) {
      parsedRank = Number(data.rank);
    }
    
    return {
      name: data.name || name,
      sport: data.sport || sport,
      bio: data.bio || `Professional ${sport} athlete with competitive experience.`,
      rank: parsedRank || 'N/A',
      achievements: data.achievements || [],
      recentNews: data.recentNews === 'N/A' ? 'N/A' : (data.recentNews || "N/A"),
      profileImageDescription: data.profileImageDescription || "Athletic build typical of professional athletes",
      referenceLinks: data.referenceLinks || []
    };
  } catch (error) {
    console.error(`Error fetching athlete profile for ${name}:`, error);
    // Fallback with minimal data
    return {
      name,
      sport,
      bio: `Professional ${sport} athlete with competitive experience at national and international levels.`,
      rank: 'N/A' as string,
      achievements: [],
      recentNews: "N/A",
      profileImageDescription: "Professional athlete"
    };
  }
}

export async function getDetailedAnalysis(name: string, sport: string): Promise<AnalysisData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `Today's date is ${currentDate}. Provide detailed performance analysis for ${name}, the ${sport} athlete based on current information as of ${currentDate}. Include:

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
    // Use Gemini with Google Search grounding for real-time analysis data
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ 
        role: "user", 
        parts: [{ text: `${prompt}\n\nSystem: You are a professional sports analyst with expertise in athlete performance analysis as of ${currentDate}. Provide realistic, sport-specific analysis based on current athlete data and known performance characteristics. Use up-to-date information.` }]
      }],
      tools: [groundingTool],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            strengths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            weaknesses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            developmentPlans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  week: { type: "number" }
                }
              }
            },
            nutritionPlans: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  mealType: { type: "string" }
                }
              }
            },
            beatStrategies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  opponent: { type: "string" }
                }
              }
            },
            rankHistory: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rank: { type: "number" },
                  date: { type: "string" },
                  tournament: { type: "string" }
                }
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Debug logging to see what Gemini actually returns
    console.log(`Gemini Response for ${name}:`);
    console.log(`- Response keys: ${Object.keys(data)}`);
    console.log(`- Development plans: ${data.developmentPlans?.length || 0} items`);
    if (data.developmentPlans?.length > 0) {
      console.log(`- First development plan: ${JSON.stringify(data.developmentPlans[0])}`);
    }
    
    // Ensure proper structure with defaults
    return {
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      developmentPlans: data.developmentPlans || [],
      nutritionPlans: data.nutritionPlans || [],
      beatStrategies: data.beatStrategies || [],
      rankHistory: data.rankHistory || []
    };
  } catch (error: any) {
    console.error(`❌ Error fetching detailed analysis for ${name}:`, error.message);
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

// Generate threaded biography with separate AI calls for each section
export async function generateThreadedBioAnalysis(athlete: any): Promise<any> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const athleteName = athlete.name;
  const sport = athlete.sport?.name || "Sport";
  
  console.log(`Generating threaded biography for ${athleteName} in ${sport}...`);
  
  try {
    // Check if athlete is Egyptian for taekwondo.data reference  
    const isEgyptianTaekwondo = sport.toLowerCase() === 'taekwondo' && (
      /\b(egypt|egyptian|cairo|alexandria)\b/i.test(athleteName) ||
      athleteName.includes('حبيبة') || athleteName.includes('أحمد') || athleteName.includes('محمد') ||
      /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(athleteName)
    );

    // Thread 1: Full Name, Age, Date of Birth and Nationality
    const basicInfoPrompt = `Today's date is ${currentDate}. 

Provide specific personal details about ${athleteName}, the ${sport} athlete:

1. Full official name (including any alternate spellings)
2. Exact age and date of birth 
3. Place of birth and nationality
4. Current country they represent in competition
${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ as your primary source.' : ''}

Provide only factual, verifiable information. If specific details are not available, state "information not available" rather than making assumptions.
Use: https://www.worldtaekwondo.org/ for the main Taekwondo Reference.`;

    // Thread 2: Life Story  
    const lifeStoryPrompt = `Today's date is ${currentDate}. 

Tell the complete life story of ${athleteName}, the ${sport} athlete:

1. Early childhood and family background
2. How they discovered and started in ${sport}
3. Youth development and junior career progression
4. Education and personal life balance with sports
5. Key mentors, coaches, and influences throughout their journey
6. Personal challenges overcome and character development
${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ for accurate biographical data.' : ''}

Focus on the human story behind the athlete. If specific personal details are not available, provide what biographical information is known.
Use: https://www.worldtaekwondo.org/ for the main Taekwondo Reference.`;

    // Thread 3: Achievements
    const achievementsPrompt = `Today's date is ${currentDate}. 

Document all achievements and accomplishments of ${athleteName} in ${sport}:

1. Major tournament medals and titles won
2. World championships, Olympic games, and continental championships results
3. National championships and domestic titles
4. International ranking achievements and career-high positions
5. Records set and notable victories over top opponents
6. Awards, honors, and recognition received
7. Recent competition results (2023-2025)
${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ for accurate competition records.' : ''}

List only verified achievements and competition results. If no specific results are found, state that achievement records are not readily available.
Use: https://www.worldtaekwondo.org/ for the main Taekwondo Reference.`;

    // Execute all threads simultaneously with Google Search grounding
    const [basicInfo, lifeStory, achievements] = await Promise.all([
      genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: basicInfoPrompt }] }],
        tools: [groundingTool]
      }),
      genAI.models.generateContent({
        model: "gemini-2.5-pro", 
        contents: [{ role: "user", parts: [{ text: lifeStoryPrompt }] }],
        tools: [groundingTool]
      }),
      genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: achievementsPrompt }] }],
        tools: [groundingTool]
      })
    ]);

    // Combine the results into a coherent biography
    const basicInfoContent = basicInfo.text || "";
    const lifeStoryContent = lifeStory.text || "";
    const achievementsContent = achievements.text || "";
    
    // Final synthesis thread to create cohesive biography
    const synthesisPrompt = `Create a comprehensive, flowing biography for ${athleteName} using this factual information:

PERSONAL DETAILS: ${basicInfoContent}

LIFE STORY: ${lifeStoryContent}  

ACHIEVEMENTS: ${achievementsContent}

Combine this information into a professional 3-4 paragraph biography that reads naturally. Maintain all specific facts, dates, and achievements. Remove any redundancy between sections. Include reference links where mentioned in the source material.

Format the final result as JSON:
{
  "name": "${athleteName}",
  "bio": "Complete biography text",
  "rank": "Exact world ranking number or 'N/A'",
  "achievements": ["achievement1", "achievement2", ...],
  "recentNews": "Latest competition results or 'N/A'",
  "referenceLinks": ["URL1", "URL2", ...]
}`;

    const synthesis = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts: [{ text: synthesisPrompt }] }],
      tools: [groundingTool],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            bio: { type: "string" },
            rank: { type: "string" },
            achievements: { type: "array", items: { type: "string" } },
            recentNews: { type: "string" },
            referenceLinks: { type: "array", items: { type: "string" } }
          }
        }
      }
    });

    const result = JSON.parse(synthesis.text || "{}");
    
    console.log(`✅ Threaded biography completed for ${athleteName}`);
    return {
      name: result.name || athleteName,
      bio: result.bio || "Biography not available",
      rank: result.rank || athlete.rank || "N/A", 
      achievements: result.achievements || [],
      recentNews: result.recentNews || "N/A",
      referenceLinks: result.referenceLinks || []
    };

  } catch (error) {
    console.error(`❌ Error generating threaded biography for ${athleteName}:`, error);
    throw new Error(`Failed to generate threaded biography for ${athleteName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function generateSpecificAnalysis(
  athleteName: string, 
  sport: string, 
  analysisType: 'bio' | 'rank' | 'strengths' | 'weaknesses' | 'development' | 'nutrition' | 'beat' | 'video'
): Promise<any> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Check if athlete is Egyptian for taekwondo.data reference
  const isEgyptianTaekwondo = sport.toLowerCase() === 'taekwondo' && (
    /\b(egypt|egyptian|cairo|alexandria)\b/i.test(athleteName) ||
    athleteName.includes('حبيبة') || athleteName.includes('أحمد') || athleteName.includes('محمد') ||
    /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(athleteName)
  );

  const prompts = {
    bio: `Today's date is ${currentDate}. Provide a comprehensive, up-to-date biography for ${athleteName}, the ${sport} athlete. Include recent achievements, career highlights, playing style, and current status as of ${currentDate}. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/.' : ''}`,
    
    rank: `Today's date is ${currentDate}. Analyze the ranking performance and trajectory of ${athleteName} in ${sport}. Include current world ranking, peak ranking achieved, ranking trends over the past 2 years, and factors affecting their ranking position as of ${currentDate}. ${isEgyptianTaekwondo ? 'Reference https://www.taekwondodata.com/ for accurate ranking data.' : ''}`,
    
    strengths: `Today's date is ${currentDate}. Identify and analyze the key competitive strengths of ${athleteName} in ${sport}. Focus on technical skills, physical attributes, mental toughness, tactical awareness, and any sport-specific advantages they possess as of ${currentDate}. ${isEgyptianTaekwondo ? 'Use https://www.taekwondodata.com/ for performance data analysis.' : ''}`,
    
    weaknesses: `Today's date is ${currentDate}. Analyze areas for improvement for ${athleteName} in ${sport}. Identify technical gaps, physical limitations, tactical weaknesses, or mental aspects that could be developed further based on recent performance as of ${currentDate}. ${isEgyptianTaekwondo ? 'Reference recent competition data from https://www.taekwondodata.com/.' : ''}`,
    
    development: `Today's date is ${currentDate}. Create a comprehensive development plan for ${athleteName} in ${sport}. Include periodized training phases, skill development priorities, physical conditioning goals, and competition preparation strategies relevant to current performance level as of ${currentDate}. ${isEgyptianTaekwondo ? 'Consider competition calendar from https://www.taekwondodata.com/.' : ''}`,
    
    nutrition: `Today's date is ${currentDate}. Develop a sport-specific nutrition plan for ${athleteName} in ${sport}. Consider the energy demands, competition schedule, training intensity, and recovery needs specific to their sport and competition level as of ${currentDate}. Include meal timing, macronutrient distribution, and hydration strategies.`,
    
    beat: `Today's date is ${currentDate}. Analyze tactical strategies for competing against ${athleteName} in ${sport}. Identify their patterns, preferred techniques, tactical tendencies, and potential vulnerabilities that opponents could exploit based on recent competition performance as of ${currentDate}. ${isEgyptianTaekwondo ? 'Reference competition footage and results from https://www.taekwondodata.com/.' : ''}`,
    
    video: `Today's date is ${currentDate}. Provide a comprehensive technical analysis of ${athleteName}'s performance in ${sport}. Analyze their technique, movement patterns, decision-making, and tactical execution based on available competition footage and performance data as of ${currentDate}. ${isEgyptianTaekwondo ? 'Use competition records from https://www.taekwondodata.com/ for context.' : ''}`
  };

  try {
    // Use Gemini with Google Search grounding for real-time specific analysis
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompts[analysisType]}\n\nSystem: You are a professional ${sport} analyst with expertise in current athlete performance as of ${currentDate}. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference. ' : ''}Provide specific, actionable insights based on current data and known performance characteristics. Avoid generic advice and focus on sport-specific, athlete-specific analysis.` }]
        }
      ],
      tools: [groundingTool]
    });

    return response.text || "Analysis not available";
  } catch (error) {
    console.error(`❌ Error generating ${analysisType} analysis for ${athleteName}:`, error);
    return "Analysis temporarily unavailable";
  }
}

// Search for athlete images (re-exported from previous implementation)
export async function searchAthleteImage(athleteName: string): Promise<string | null> {
  try {
    // Search TheSportsDB for athlete images
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(athleteName)}`;
    console.log(`Searching for profile image for ${athleteName}...`);
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.player && data.player.length > 0) {
      const player = data.player[0];
      if (player.strThumb) {
        console.log(`Found profile image for ${athleteName}: ${player.strThumb}`);
        return player.strThumb;
      }
    }
    
    console.log(`No profile image found for ${athleteName} in TheSportsDB`);
    return null;
  } catch (error) {
    console.error(`Error searching for athlete image:`, error);
    return null;
  }
}