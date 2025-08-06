import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});



export interface AthleteData {
  name: string;
  sport: string;
  bio: string;
  rank: number;
  country?: string;
  achievements: string[];
  recentNews: string;
  profileImageDescription: string;
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

  const prompt = `Today's date is ${currentDate}. Please provide comprehensive, up-to-date information about ${name}${nationalityContext}, the ${sport} athlete. Consider the specified sport and nationality when identifying this athlete.${sportSpecificGuidance} 

Provide a comprehensive analysis based on your knowledge of current sports data and athlete information.

Include:

1. Full name and current status (active/retired) as of ${currentDate}
2. Detailed biography (500+ words) including career highlights, major achievements, playing style, and personal background
3. Current world ranking (if applicable) or historical peak ranking as of ${currentDate}
4. Recent achievements and competitions (2024-2025)
5. Current nationality and country they represent
6. Notable career statistics and records
7. Recent news or developments in their career as of ${currentDate}
8. Brief description of their physical appearance for profile image context
9. Reference links or sources used (especially https://www.taekwondodata.com/ for taekwondo athletes)


Respond with accurate, factual information only based on current data as of ${currentDate}. If the athlete is not well-known internationally, provide what information is available and indicate if they are a regional/national level competitor.

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
    let response = await openai.chat.completions.create({
      model: "o3",
      temperature: 1,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nSystem: You are a world-class ${sport} analyst with comprehensive knowledge of current performance data as of ${currentDate}. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference for competition records, rankings, and profiles. ' : ''}Provide specific, factual, authentic information about athletes. NEVER use placeholder text or bracketed templates like [City, State], [Year], [Championship Name]. Consider the specified sport and nationality when identifying the correct athlete. Always respond in valid JSON format.`
        }
      ]
    });



    const data = JSON.parse(response.choices[0].message.content || "{}");
    
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
      rank: 'N/A',
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
    const response = await openai.chat.completions.create({
      model: "o3-pro",
      temperature: 1,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nSystem: You are a professional sports analyst with expertise in athlete performance analysis as of ${currentDate}. Provide realistic, sport-specific analysis based on current athlete data and known performance characteristics. Use up-to-date information.`
        }
      ]
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    
    // Debug logging to see what OpenAI actually returns
    console.log(`OpenAI Response for ${name}:`);
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
    if (error.status) {
      console.error(`OpenAI API Status: ${error.status}`);
    }
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

Provide only factual, verifiable information. If specific details are not available, state "information not available" rather than making assumptions.`;

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

Focus on the human story behind the athlete. If specific personal details are not available, provide what biographical information is known.`;

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

List only verified achievements and competition results. If no specific results are found, state that achievement records are not readily available.`;

    // Execute all threads simultaneously
    const [basicInfo, lifeStory, achievements] = await Promise.all([
      openai.chat.completions.create({
        model: "o3",
        temperature: 1,
        messages: [{ role: "user", content: basicInfoPrompt }]
      }),
      openai.chat.completions.create({
        model: "o3", 
        temperature: 1,
        messages: [{ role: "user", content: lifeStoryPrompt }]
      }),
      openai.chat.completions.create({
        model: "o3",
        temperature: 1, 
        messages: [{ role: "user", content: achievementsPrompt }]
      })
    ]);

    // Combine the results into a coherent biography
    const basicInfoContent = basicInfo.choices[0].message.content || "";
    const lifeStoryContent = lifeStory.choices[0].message.content || "";
    const achievementsContent = achievements.choices[0].message.content || "";
    
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

    const synthesis = await openai.chat.completions.create({
      model: "o3-pro",
      temperature: 1,
      messages: [{ role: "user", content: synthesisPrompt }]
    });

    const result = JSON.parse(synthesis.choices[0].message.content || "{}");
    
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
    throw new Error(`Failed to generate threaded biography for ${athleteName}: ${error.message}`);
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
    bio: `Today's date is ${currentDate}. Provide a comprehensive, up-to-date biography for ${athleteName}, the ${sport} athlete. Include recent achievements, career highlights, playing style, and current status as of ${currentDate}. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference source and include this reference link in your response. ' : ''}Include reference links or source URLs where possible for verification.`,
    
    rank: `Today's date is ${currentDate}. Analyze ${athleteName}'s current ranking and performance trends in ${sport} as of ${currentDate}. Include current world/national ranking, recent tournament results, and ranking progression over the past 2 years.`,
    
    strengths: `Today's date is ${currentDate}. Identify and analyze the top 5 competitive strengths of ${athleteName} in ${sport} based on current performance data. Focus on technical skills, physical attributes, mental qualities, and tactical abilities that give them advantages.`,
    
    weaknesses: `Today's date is ${currentDate}. Analyze areas for improvement in ${athleteName}'s ${sport} performance based on recent competition data. Identify 3-4 specific weaknesses or challenges they face against top competition.`,
    
    development: `Today's date is ${currentDate}. Create a comprehensive 12-week development plan for ${athleteName} in ${sport} based on current performance level. Include specific training phases, skill development focuses, and performance targets.`,
    
    nutrition: `Today's date is ${currentDate}. Design a sport-specific nutrition plan for ${athleteName} as a ${sport} athlete based on current sports science. Include meal timing, macronutrient distribution, hydration strategies, and competition-day nutrition.`,
    
    beat: `Today's date is ${currentDate}. Analyze tactical strategies ${athleteName} uses to defeat different types of opponents in ${sport} based on recent matches. Include specific game plans, technical approaches, and psychological tactics.`,
    
    video: `Today's date is ${currentDate}. Provide detailed technical analysis of ${athleteName}'s ${sport} performance based on recent competition footage and biomechanical analysis. Focus on technique, efficiency, and areas for improvement.`
  };

  try {
    const response = await openai.chat.completions.create({
      model: "o3",
      temperature: 1,
      messages: [
        {
          role: "user",
          content: `${prompts[analysisType]}\n\nSystem: You are a world-class ${sport} analyst with comprehensive knowledge of current performance data as of ${currentDate}. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference source. ' : ''}Provide specific, actionable insights based on the latest information about this athlete. Use current data and recent performance metrics.`
        }
      ]
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

// Search for athlete profile image using TheSportsDB API
export async function searchAthleteImage(athleteName: string, sport: string): Promise<string | null> {
  try {
    // First try searching by athlete name in TheSportsDB
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(athleteName)}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.log(`TheSportsDB search failed for ${athleteName}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.player && data.player.length > 0) {
      // Find the best match - exact name match preferred
      const exactMatch = data.player.find((player: any) => 
        player.strPlayer?.toLowerCase() === athleteName.toLowerCase()
      );
      
      const player = exactMatch || data.player[0];
      
      // Validate that the sport matches or is related (skip if completely different sport)
      const playerSport = player.strSport?.toLowerCase() || '';
      const requestedSport = sport.toLowerCase();
      
      // Reject if the player is clearly from a different sport (especially basketball/football when we want other sports)
      const incompatibleSports = ['basketball', 'football', 'soccer', 'american football', 'baseball'];
      const isIncompatibleSport = incompatibleSports.some(incompatible => 
        playerSport.includes(incompatible) && !requestedSport.includes(incompatible)
      );
      
      if (isIncompatibleSport) {
        console.log(`Rejecting ${player.strPlayer} image - sport mismatch: ${playerSport} vs ${requestedSport}`);
        return null;
      }
      
      // Return the player image if available and sport-appropriate
      if (player.strThumb) {
        console.log(`Found profile image for ${athleteName}: ${player.strThumb}`);
        return player.strThumb;
      }
      
      if (player.strCutout) {
        console.log(`Found cutout image for ${athleteName}: ${player.strCutout}`);
        return player.strCutout;
      }
      
      if (player.strRender) {
        console.log(`Found render image for ${athleteName}: ${player.strRender}`);
        return player.strRender;
      }
    }
    
    console.log(`No profile image found for ${athleteName} in TheSportsDB`);
    return null;
  } catch (error) {
    console.error(`Error searching for ${athleteName} image:`, error);
    return null;
  }
}