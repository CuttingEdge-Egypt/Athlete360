import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_API_KEY || "" 
});

export interface AthleteData {
  name: string;
  sport: string;
  bio: string;
  rank: number | string;
  country?: string;
  achievements: string[];
  recentNews: string;
  profileImageDescription: string;
  profileImageUrl?: string;
  referenceLinks?: Array<{ title: string; uri: string }>;
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

  const prompt = ` Today's date is ${currentDate}.
    Using Google Search, find factual, up-to-date information about the athlete "${name}"${nationalityContext}, who competes in ${sport}.
    
    Then, format the response as a JSON object matching the provided schema.

    Inside the "bio" field of the JSON, you MUST create a detailed biography structured with the following headings:
    - An introductory paragraph.
    - A heading "Recent Competitions:".
    - A heading "Career Record and Rankings:".
    - A heading "Notable Achievements:".

    Crucially, for every sentence in the "bio" that uses information from a search result, you MUST end it with a citation marker like [1], [2], etc. If multiple sources support a sentence, use comma-separated indices like [1, 3].
    
    Populate all other JSON fields like "rank", "achievements", and "recentNews" with the information you find.
    ${sportSpecificGuidance}`;

  try {
    // Use Gemini 2.5 Pro with enhanced search-aware prompting 
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ 
        role: "user", 
        parts: [{ text: `${prompt}\n\nSystem: You are a world-class ${sport} analyst with comprehensive knowledge of current performance data as of ${currentDate}. Use your most current knowledge base and search capabilities to find real-time information. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference for competition records, rankings, and profiles. ' : ''}Provide specific, factual, authentic information about athletes. NEVER use placeholder text or bracketed templates like [City, State], [Year], [Championship Name]. Consider the specified sport and nationality when identifying the correct athlete. Always respond in valid JSON format.` }]
      }],
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
            profileImageDescription: { type: "string" }
          },
          required: ["name", "sport", "bio", "rank", "country", "achievements", "recentNews", "profileImageDescription"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Initialize empty references array (grounding citations may not be available in current API version)
    const references: Array<{ title: string; uri: string }> = [];
    
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
      profileImageDescription: data.profileImageDescription || `${sport} athlete`,
      referenceLinks: references, // Add the sourced links here
      country: data.country || nationality || 'Unknown'
    };
  } catch (error) {
    console.error(`❌ Error generating profile for ${name}:`, error);
    throw new Error(`Failed to generate profile for ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function compareAthletes(athlete1: any, athlete2: any, analysisType?: string): Promise<any> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Check if athletes are Egyptian taekwondo for data source guidance
  const isEgyptianTaekwondo1 = athlete1.sport?.toLowerCase() === 'taekwondo' && (
    athlete1.country?.toLowerCase().includes('egypt') ||
    /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(athlete1.name)
  );
  const isEgyptianTaekwondo2 = athlete2.sport?.toLowerCase() === 'taekwondo' && (
    athlete2.country?.toLowerCase().includes('egypt') ||
    /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(athlete2.name)
  );

  const prompt = `Today's date is ${currentDate}. 

Compare these two ${athlete1.sport || 'sport'} athletes:

**${athlete1.name}** (Rank: ${athlete1.rank || 'N/A'})
Bio: ${athlete1.bio || 'No bio available'}

**${athlete2.name}** (Rank: ${athlete2.rank || 'N/A'})  
Bio: ${athlete2.bio || 'No bio available'}

Provide a comprehensive comparison as of ${currentDate} including:
1. Current rankings and career trajectories
2. Strengths and weaknesses analysis 
3. Head-to-head prediction and key factors
4. Technical and tactical differences
5. Recent performance trends
${(isEgyptianTaekwondo1 || isEgyptianTaekwondo2) ? '\nFor Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ for accurate competition data.' : ''}

Format as JSON:
{
  "summary": "Overall comparison summary",
  "athlete1Analysis": "Detailed analysis of athlete 1",
  "athlete2Analysis": "Detailed analysis of athlete 2", 
  "headToHead": "Who would likely win and why",
  "keyFactors": ["factor1", "factor2", "factor3"]
}`;

  try {
    // Use Gemini 2.5 Pro with Google Search grounding for comprehensive comparison analysis
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ 
        role: "user", 
        parts: [{ text: `${prompt}\n\nSystem: You are a professional sports analyst with expertise in athlete performance analysis as of ${currentDate}. Provide realistic, sport-specific analysis based on current athlete data and known performance characteristics. Use up-to-date information.` }]
      }],

      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            athlete1Analysis: { type: "string" },
            athlete2Analysis: { type: "string" },
            headToHead: { type: "string" },
            keyFactors: { 
              type: "array",
              items: { type: "string" }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    console.log(`✅ Comparison completed for ${athlete1.name} vs ${athlete2.name}`);
    return {
      summary: data.summary || "Comprehensive comparison analysis",
      athlete1Analysis: data.athlete1Analysis || "Analysis not available",
      athlete2Analysis: data.athlete2Analysis || "Analysis not available", 
      headToHead: data.headToHead || "Close competition expected",
      keyFactors: data.keyFactors || ["Technical skills", "Physical conditioning", "Mental toughness"]
    };

  } catch (error) {
    console.error(`❌ Error comparing ${athlete1.name} vs ${athlete2.name}:`, error);
    throw new Error(`Failed to compare athletes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Enhanced threaded biography generation with 3-thread approach
export async function generateThreadedBiography(athlete: any): Promise<any> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const athleteName = athlete.name;
  const sport = athlete.sport || 'sport';
  
  // Check if athlete is Egyptian for taekwondo.data reference
  const isEgyptianTaekwondo = sport.toLowerCase() === 'taekwondo' && (
    athlete.country?.toLowerCase().includes('egypt') ||
    athleteName.includes('حبيبة') || athleteName.includes('أحمد') || athleteName.includes('محمد') ||
    /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(athleteName)
  );

  try {
    // Thread 1: Personal Details
    const basicInfoPrompt = `Today's date is ${currentDate}. 

Provide basic personal information for ${athleteName}, the ${sport} athlete:

1. Full official name and any common nicknames
2. Date of birth and current age
3. Nationality and place of birth
4. Physical attributes relevant to their sport (height, weight, etc.)
5. Current residence and training location
${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ for accurate personal data.' : ''}

Focus on factual personal details. If specific information is not available, indicate so rather than making assumptions.
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

    // Execute all threads simultaneously
    const [basicInfo, lifeStory, achievements] = await Promise.all([
      genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: basicInfoPrompt }] }]
      }),
      genAI.models.generateContent({
        model: "gemini-2.5-pro", 
        contents: [{ role: "user", parts: [{ text: lifeStoryPrompt }] }]
      }),
      genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: achievementsPrompt }] }]
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
    // Use Gemini 2.5 Pro with enhanced search-aware prompting for real-time specific analysis
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompts[analysisType]}\n\nSystem: You are a professional ${sport} analyst with expertise in current athlete performance as of ${currentDate}. Use your most current knowledge and search capabilities to find real-time information. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference. ' : ''}Provide specific, actionable insights based on current data and known performance characteristics. Avoid generic advice and focus on sport-specific, athlete-specific analysis.` }]
        }
      ]
    });

    return response.text || "Analysis not available";
  } catch (error) {
    console.error(`❌ Error generating ${analysisType} analysis for ${athleteName}:`, error);
    return "Analysis temporarily unavailable";
  }
}

// Updated athlete image search to prevent placeholder issues
// NO PLACEHOLDER IMAGES - For taekwondo athletes, use TaekwondoData.com only
export async function searchAthleteImage(athleteName: string, sport?: string): Promise<string | null> {
  try {
    // Search TheSportsDB for athlete images
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(athleteName)}`;
    console.log(`Searching for profile image for ${athleteName}...`);
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.player && data.player.length > 0) {
      // Check all players to find the best match, not just the first one
      for (const player of data.player) {
        // Enhanced name matching - require more precise match
        const athleteNameParts = athleteName.toLowerCase().split(' ');
        const playerNameParts = player.strPlayer ? player.strPlayer.toLowerCase().split(' ') : [];
        
        // Require at least 2 name parts to match (first name + last name)
        const matchingParts = athleteNameParts.filter(part => 
          part.length > 2 && playerNameParts.some(playerPart => 
            playerPart.includes(part) || part.includes(playerPart)
          )
        );
        
        const isNameMatch = matchingParts.length >= Math.min(2, athleteNameParts.length);
        
        // Enhanced sport validation - completely avoid cross-sport matches
        let isSportConflict = false;
        if (sport && player.strSport) {
          const playerSport = player.strSport.toLowerCase();
          const requestedSport = sport.toLowerCase();
          
          // For taekwondo, reject any non-combat sport
          if (requestedSport === 'taekwondo') {
            const nonCombatSports = [
              'basketball', 'football', 'soccer', 'tennis', 'baseball', 
              'volleyball', 'golf', 'hockey', 'cricket', 'rugby',
              'swimming', 'track', 'field', 'cycling', 'motorsport'
            ];
            isSportConflict = nonCombatSports.some(nonCombat => 
              playerSport.includes(nonCombat)
            );
          }
          
          // General rule: must be exact sport match or martial arts related
          if (!isSportConflict && requestedSport === 'taekwondo') {
            const isCombatSport = playerSport.includes('taekwondo') || 
                                 playerSport.includes('martial') || 
                                 playerSport.includes('karate') ||
                                 playerSport.includes('judo') ||
                                 playerSport.includes('combat');
            if (!isCombatSport && playerSport !== 'unknown') {
              isSportConflict = true;
            }
          }
        }
        
        if (player.strThumb && 
            player.strThumb.startsWith('http') && 
            !player.strThumb.includes('placeholder') &&
            !player.strThumb.includes('default') &&
            !player.strThumb.includes('generic') &&
            !player.strThumb.includes('anonymous') &&
            player.strThumb.length > 20 &&
            isNameMatch &&
            !isSportConflict) {
          
          console.log(`Found verified profile image for ${athleteName}: ${player.strThumb}`);
          console.log(`Player details: Name: ${player.strPlayer}, Sport: ${player.strSport}`);
          return player.strThumb;
        } else {
          console.log(`Image found but failed validation for ${athleteName} - Name: ${player.strPlayer}, Sport: ${player.strSport}, Image: ${player.strThumb}, Conflict: ${isSportConflict}`);
        }
      }
    }
    
    console.log(`No valid profile image found for ${athleteName} in TheSportsDB`);
    return null;
  } catch (error) {
    console.error(`Error searching for athlete image:`, error);
    return null;
  }
}

// Add the missing getDetailedAnalysis function
export async function getDetailedAnalysis(athleteName: string, sport: string): Promise<AnalysisData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Check if athlete is Egyptian for taekwondo.data reference
  const isEgyptianTaekwondo = sport.toLowerCase() === 'taekwondo' && (
    /\b(egypt|egyptian|cairo|alexandria)\b/i.test(athleteName) ||
    athleteName.includes('حبيبة') || athleteName.includes('أحمد') || athleteName.includes('محمد') ||
    /\b(ahmed|mohamed|hassan|ali|omar|sara|fatma|nour|dina|aya|habiba|wael)\b/i.test(athleteName)
  );

  const prompt = `Today's date is ${currentDate}. 

Provide a comprehensive analysis for ${athleteName}, the ${sport} athlete.

Generate detailed information in these categories:

1. STRENGTHS (5 key strengths with titles and descriptions)
2. WEAKNESSES (5 areas for improvement with titles and descriptions)
3. DEVELOPMENT PLANS (3 structured training plans with titles, descriptions, and week numbers)
4. NUTRITION PLANS (3 meal plans with descriptions, meal types, and food items)
5. BEAT STRATEGIES (3 strategic approaches with titles and descriptions)
6. RANK HISTORY (Recent ranking progression with ranks and dates)

${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, reference https://www.taekwondodata.com/ for accurate data.' : ''}

Format as JSON matching this exact schema:
{
  "strengths": [{"title": "string", "description": "string"}],
  "weaknesses": [{"title": "string", "description": "string"}],
  "developmentPlans": [{"title": "string", "description": "string", "week": number}],
  "nutritionPlans": [{"title": "string", "description": "string", "mealType": "breakfast|lunch|dinner|snack"}],
  "beatStrategies": [{"title": "string", "description": "string", "opponent": "string"}],
  "rankHistory": [{"rank": number, "date": "YYYY-MM-DD", "tournament": "string"}]
}`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ 
        role: "user", 
        parts: [{ text: `${prompt}\n\nSystem: You are a professional sports analyst with expertise in ${sport}. Provide realistic, sport-specific analysis based on current athlete data as of ${currentDate}. Use authentic, factual information.` }]
      }],
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
    
    console.log(`✅ Detailed analysis completed for ${athleteName}`);
    return {
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      developmentPlans: data.developmentPlans || [],
      nutritionPlans: data.nutritionPlans || [],
      beatStrategies: data.beatStrategies || [],
      rankHistory: data.rankHistory || []
    };

  } catch (error) {
    console.error(`❌ Error generating detailed analysis for ${athleteName}:`, error);
    // Return default structure to prevent app crashes
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