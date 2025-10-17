import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========================
// JSON PARSING UTILITIES
// ========================

/**
 * Robust JSON parser that handles malformed o3 responses
 * Attempts multiple cleaning strategies before failing
 */
function parseO3JsonResponse(rawResponse: string): any {
  let cleanedResponse = rawResponse.trim();
  
  // Step 1: Remove markdown code blocks
  if (cleanedResponse.includes('```json')) {
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  } else if (cleanedResponse.includes('```')) {
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
  }

  // Step 2: Extract JSON object (find first { to last })
  const jsonStart = cleanedResponse.indexOf('{');
  const jsonEnd = cleanedResponse.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
  }

  // Step 3: Try to parse as-is
  try {
    return JSON.parse(cleanedResponse);
  } catch (firstError) {
    console.warn('⚠️ [O3] First parse attempt failed, trying fixes...');
    
    // Step 4: Fix common issues
    let fixedResponse = cleanedResponse
      // Remove trailing commas before closing braces/brackets
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix unescaped quotes in strings (simple cases)
      .replace(/([^\\])"([^"]*)"([^:])/g, '$1\\"$2\\"$3')
      // Remove comments (single line and multi-line)
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Step 5: Try parsing again
    try {
      return JSON.parse(fixedResponse);
    } catch (secondError) {
      console.error('❌ [O3] JSON Parse Failed After Fixes');
      console.error('Raw response length:', rawResponse.length);
      console.error('Cleaned response preview:', cleanedResponse.substring(0, 500));
      console.error('First error:', (firstError as Error).message);
      console.error('Second error:', (secondError as Error).message);
      throw new Error(`Failed to parse o3 JSON response: ${(secondError as Error).message}`);
    }
  }
}

// ========================
// REFERENCE CODE: How to use o3 with Web Search
// ========================
/**
 * This service demonstrates how to use OpenAI's o3 model with web search capabilities.
 * 
 * Key features:
 * 1. Model: "o3" - Latest reasoning model from OpenAI
 * 2. Tools: [{ type: "web_search_preview" }] - Enables web search
 * 3. Use responses API instead of chat completions
 * 
 * Example usage:
 * ```typescript
 * const response = await openai.responses.create({
 *   model: "o3",
 *   input: "Your prompt here",
 *   tools: [{ type: "web_search_preview" }],
 *   max_output_tokens: 8000
 * });
 * const result = response.output_text;
 * ```
 */

// Interface for athlete biography data
export interface AthleteBioData {
  name: string;
  bio: string;
  playersStory?: string;
  currentRank: number | string;
  rank?: number | string;
  achievements?: Array<{
    achievement: string;
    medal: string;
  }>;
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
    [key: string]: any;
  };
}

// Interface for rank history data
export interface RankHistoryData {
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

// Interface for statistics data
export interface StatisticsData {
  player: {
    name: string;
    age: number | null;
    nationality: string;
    team: string | null;
    sport: string;
    position: string | null;
  };
  recent_season: {
    period: string;
    league?: string | null;
    team?: string | null;
    statistics: {
      common: {
        games_played: number;
        minutes_played: number;
        wins: number;
        losses: number;
      };
      sport_specific: {
        category: string;
        metrics: Array<{
          name: string;
          value: number | string;
          unit?: string | null;
        }>;
      };
    };
  };
  all_time: {
    career_span: string;
    statistics: {
      common: {
        total_games: number;
        total_minutes: number;
        total_wins: number;
        total_losses: number;
      };
      sport_specific: {
        category: string;
        metrics: Array<{
          name: string;
          value: number | string;
          unit?: string | null;
        }>;
      };
    };
  };
  highlights?: Array<{
    title: string;
    value: string;
    description: string;
    icon?: string;
  }>;
  summary?: {
    overall_rating: string;
    key_strengths: string[];
    notable_achievements: string[];
  };
  last_updated: string;
  data_quality: "high" | "medium" | "low";
  references?: Array<{
    source: string;
    data_points: string[];
    reliability: string;
  }>;
}

// ========================
// ATHLETE BIOGRAPHY GENERATION WITH O3-MINI
// ========================
export async function generateAthleteBiography(
  name: string,
  sport: string,
  nationality?: string,
  language: string = 'en',
  existingAthleteData?: any // All athlete data including rankings, competitive history, personal info, etc.
): Promise<AthleteBioData> {
  try {
    console.log(`📝 [O3-MINI] Generating biography for ${name} in ${sport}`);

    // Format existing data for the prompt
    const existingDataSection = existingAthleteData ? `

EXISTING VERIFIED DATA WE HAVE (Use this as authoritative source):
${existingAthleteData.rankings ? `
RANKINGS DATA (from BrowserUse - AUTHORITATIVE):
${JSON.stringify(existingAthleteData.rankings, null, 2)}
` : ''}
${existingAthleteData.competitiveHistory ? `
COMPETITIVE HISTORY (from BrowserUse - AUTHORITATIVE):
${JSON.stringify(existingAthleteData.competitiveHistory, null, 2)}
` : ''}
${existingAthleteData.age ? `Age: ${existingAthleteData.age}` : ''}
${existingAthleteData.dateOfBirth ? `Date of Birth: ${existingAthleteData.dateOfBirth}` : ''}
${existingAthleteData.weight ? `Weight: ${existingAthleteData.weight}` : ''}
${existingAthleteData.height ? `Height: ${existingAthleteData.height}` : ''}
${existingAthleteData.category ? `Category: ${existingAthleteData.category}` : ''}
${existingAthleteData.achievements && existingAthleteData.achievements.length > 0 ? `
Existing Achievements in Database:
${existingAthleteData.achievements.map((a: any) => typeof a === 'string' ? `- ${a}` : `- ${a.achievement || a}`).join('\n')}
` : ''}

CRITICAL: The rankings and competitive history data above are from official federation websites and are AUTHORITATIVE. Use them as the primary source of truth. Supplement with web search only for additional context, personal background, and recent news.
` : '';

    const prompt = `You are an expert sports biographer with access to comprehensive athlete data. Search the web extensively to create a detailed, accurate biography for this athlete.

ATHLETE INFORMATION:
Name: ${name}
Sport: ${sport}
Nationality: ${nationality || 'Unknown'}
Language: ${language}
${existingDataSection}

CRITICAL INSTRUCTIONS:
1. PRIMARY SOURCE: If EXISTING VERIFIED DATA is provided above (rankings, competitive history, personal info), use it as the AUTHORITATIVE SOURCE
2. Use the BrowserUse data for rankings and competitive history - it comes from official federation websites
3. SUPPLEMENT with web search: Find additional context, personal background stories, early career details, and recent news
4. Return ONLY valid JSON with no additional text
5. Language: Write the biography in ${language === 'ar' ? 'Arabic' : 'English'}
6. Combine verified data with web search to create a comprehensive, accurate biography

REQUIRED JSON STRUCTURE:
{
  "name": "${name}",
  "bio": "Comprehensive 200-300 word biography covering career journey, major achievements, and significance in ${sport}",
  "playersStory": "Detailed narrative (300-400 words) about the athlete's journey, challenges, breakthrough moments, and what makes them unique",
  "currentRank": "Current world ranking or 'N/A'",
  "rank": "Same as currentRank (for compatibility)",
  "achievements": [
    {
      "achievement": "Name of achievement or competition",
      "medal": "Gold/Silver/Bronze/Award/Participation"
    }
  ],
  "recentNews": [
    "Recent news item 1 (2024-2025)",
    "Recent news item 2",
    "Recent news item 3"
  ],
  "worldRank": "Current world ranking with context",
  "currentRecord": "Win-loss record or performance metrics",
  "personalInfo": {
    "age": ${language === 'ar' ? '"العمر بالأرقام أو null"' : 'age_number_or_null'},
    "dateOfBirth": "YYYY-MM-DD or null",
    "weight": "Weight with unit (kg/lbs) or null",
    "height": "Height with unit (cm/ft) or null",
    "position": "Playing position or specialization",
    "educationalBackground": "Schools, universities attended",
    "previousSports": ["Other sports practiced"],
    "yearsInCurrentSport": "Number of years or 'N/A'"
  }
}

SEARCH STRATEGY:
1. Search "${name} ${sport} ${nationality || ''}" for general information
2. Search "${name} achievements ${sport}" for accomplishments
3. Search "${name} recent news 2024 2025" for latest updates
4. Search "${name} biography career" for detailed background
5. Verify information from multiple credible sources

DATA QUALITY REQUIREMENTS:
- Achievements: List chronologically, most recent first (minimum 10-15 major achievements)
- Recent News: Must be from 2024-2025, real events only
- Personal Info: Verify from official sources
- Bio: Should tell a compelling, accurate story
- Language: ${language === 'ar' ? 'All text MUST be in fluent, natural Arabic' : 'All text in professional English'}

CRITICAL - NO LINKS OR CITATIONS:
Do NOT include any links, URLs, citations, or reference sources in your response. This includes:
- No markdown links like [text](url)
- No plain URLs like https://example.com
- No bracketed references like [1], [2]
- No parenthetical citations like (source.com)
- Provide clean text without any reference links or citations

Return ONLY the JSON object, no additional text.`;

    console.log(`🔍 [O3] Searching web for ${name}...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 16000,
      // Note: o3 doesn't support temperature parameter
    });

    const rawResponse = response.output_text.trim();
    console.log(`📚 [O3] Raw response length: ${rawResponse.length} characters`);

    // Clean and parse JSON response
    let cleanedResponse = rawResponse;
    
    // Remove markdown code blocks if present
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    // Find and extract JSON object
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const athleteData: AthleteBioData = parseO3JsonResponse(cleanedResponse);
    console.log(`✅ [O3] Successfully generated biography for ${name}`);

    return athleteData;
  } catch (error) {
    console.error(`❌ [O3] Error generating biography for ${name}:`, error);
    throw new Error(`Failed to generate athlete biography: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================
// RANK HISTORY GENERATION WITH O3-MINI
// ========================
export async function generateRankHistory(
  name: string,
  sport: string,
  nationality?: string,
  language: string = 'en'
): Promise<RankHistoryData> {
  try {
    console.log(`📊 [O3-MINI] Generating rank history for ${name} in ${sport}`);

    const prompt = `You are a sports analytics expert specializing in competitive history and ranking analysis. Use web search to find comprehensive ranking and competition data for this athlete.

ATHLETE INFORMATION:
Name: ${name}
Sport: ${sport}
Nationality: ${nationality || 'Unknown'}
Response Language: ${language}

CRITICAL INSTRUCTIONS:
1. MANDATORY: Use web search to find authentic ranking data from official sources
2. Search federation websites, Olympic databases, competition results
3. Return ONLY valid JSON with no additional text
4. Include detailed career phases with specific achievements
5. Provide analytical narrative about ranking progression

CRITICAL - ABSOLUTELY NO LINKS, URLs, OR CITATIONS:
- Do NOT include ANY links, URLs, citations, or reference sources ANYWHERE in the response
- ESPECIALLY in the "notes" field of key_achievements - provide ONLY clean descriptive text
- No markdown links: [text](url)
- No plain URLs: https://example.com or www.site.com
- No bracketed references: [1], [2], [source]
- No parenthetical citations: (source.com), ([website.org](https://...))
- All text must be clean without ANY reference indicators
- This applies to: ranking_system_overview, notes, analysis_narrative, and ALL text fields

REQUIRED JSON STRUCTURE:
{
  "success": true,
  "athlete_name": "${name}",
  "sport": "${sport}",
  "nationality": "${nationality || 'Unknown'}",
  "active_period": {
    "start_year": year_number,
    "end_year": "Present" or year_number
  },
  "ranking_system_overview": "Explanation of how rankings work in ${sport} (100-150 words in ${language === 'ar' ? 'Arabic' : 'English'})",
  "career_phases": [
    {
      "phase_name": "Phase name (e.g., 'Early Career', 'Peak Years', 'Olympic Cycle')",
      "period": "YYYY-YYYY",
      "key_achievements": [
        {
          "year": year_number,
          "event_name": "Competition or championship name",
          "event_tier": "Olympic/World Championship/Continental/National/Grand Prix",
          "result": "Gold Medal/1st Place/Top 8/etc.",
          "notes": "Additional context (ranking impact, significance)"
        }
      ]
    }
  ],
  "analysis_narrative": "Comprehensive 300-400 word analysis of the athlete's competitive journey, ranking progression, breakthrough moments, challenges faced, and overall career trajectory (in ${language === 'ar' ? 'Arabic' : 'English'})"
}

WEB SEARCH STRATEGY:
1. Search "${name} ${sport} world ranking history"
2. Search "${name} competition results ${sport}"
3. Search "${name} Olympic ${sport}" or "World Championship"
4. Search "${name} ${sport} career achievements timeline"
5. Search "World ${sport} Federation rankings ${name}"

DATA REQUIREMENTS:
- Career Phases: Minimum 3-5 distinct phases
- Key Achievements: At least 5-10 per phase
- Events: Include tier classification (Olympic > World > Continental > National)
- Analysis: Must explain ranking trajectory and significance
- Dates: Specific years and periods
- Language: ${language === 'ar' ? 'All narrative text in Arabic' : 'All narrative text in English'}

Return ONLY the JSON object.`;

    console.log(`🔍 [O3] Searching competition data for ${name}...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 16000,
    });

    const rawResponse = response.output_text.trim();
    console.log(`📊 [O3] Raw rank response length: ${rawResponse.length} characters`);

    // Clean and parse JSON
    let cleanedResponse = rawResponse;
    
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const rankData: RankHistoryData = parseO3JsonResponse(cleanedResponse);
    console.log(`✅ [O3] Successfully generated rank history for ${name}`);

    return rankData;
  } catch (error) {
    console.error(`❌ [O3] Error generating rank history for ${name}:`, error);
    throw new Error(`Failed to generate rank history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================
// STATISTICS GENERATION WITH O3-MINI  
// ========================
export async function generateAthleteStatistics(
  athleteName: string,
  sportName: string,
  athleteCountry?: string
): Promise<StatisticsData> {
  try {
    console.log(`🔢 [O3-MINI] Generating statistics for ${athleteName} in ${sportName}`);

    const prompt = `You are an advanced sports statistics generator specializing in comprehensive, deep statistical analysis. You MUST search the internet extensively to find detailed, authentic statistical data about this athlete.

ATHLETE TO ANALYZE:
Name: ${athleteName}
Sport: ${sportName}
Country: ${athleteCountry || 'Unknown'}

CRITICAL INSTRUCTIONS:
1. MANDATORY: Use your web search tool to find comprehensive statistical data from official sources
2. MANDATORY: Search federation websites, competition databases, news sources, statistical platforms
3. MANDATORY: Return only valid JSON with no extra text or explanations
4. CRITICAL: DO NOT include any source URLs, links, citations, or references in the response
5. CRITICAL: Use the EXACT JSON structure specified below
6. CRITICAL: Generate BOTH recent season AND all-time career statistics
7. CRITICAL: Include DEEP, granular metrics specific to ${sportName}

SEARCH FOR COMPREHENSIVE DATA:
- Official sport federation statistics and rankings
- Competition records and detailed performance metrics
- Career achievements and milestones
- Recent performance data (2024-2025 season)
- Historical career statistics
- Technical/tactical performance data
- Physical and biomechanical metrics
- Head-to-head records and matchup statistics

WEB SEARCH STRATEGY:
1. Search "${athleteName} ${sportName} statistics 2024 2025"
2. Search "${athleteName} career statistics ${sportName}"
3. Search "${athleteName} ${sportName} performance data"
4. Search "World ${sportName} Federation ${athleteName} stats"
5. Search "${athleteName} competition results metrics"

CRITICAL INSTRUCTIONS - COMPREHENSIVE STATISTICS:
You MUST generate comprehensive statistics in ALL cases. Do NOT return error responses.

GENERATION PRIORITY:
1. If web search finds specific data: Use authentic statistics
2. If web search finds basic info: Combine authentic data with reasonable estimates
3. If web search finds minimal info: Generate realistic statistics based on sport/nationality/level
4. If web search finds nothing: Create comprehensive statistics typical for the sport and athlete level

NEVER return error structure. Always generate full statistics following the JSON format below.

REQUIRED JSON STRUCTURE:
{
  "player": {
    "name": "${athleteName}",
    "age": number_or_null,
    "nationality": "${athleteCountry || 'Unknown'}",
    "team": "string_or_null",
    "sport": "${sportName}",
    "position": "string_or_null"
  },
  "recent_season": {
    "period": "2024/25 or current season",
    "league": "string_or_null",
    "team": "string_or_null",
    "statistics": {
      "common": {
        "games_played": number,
        "minutes_played": number,
        "wins": number,
        "losses": number
      },
      "sport_specific": {
        "category": "${sportName}",
        "metrics": [
          {
            "name": "Metric Name (Recent Season)",
            "value": number_or_string,
            "unit": "string_or_null"
          }
          // Include 15-25 deep, granular metrics for recent season
        ]
      }
    }
  },
  "all_time": {
    "career_span": "e.g., 2015-2025",
    "statistics": {
      "common": {
        "total_games": number,
        "total_minutes": number,
        "total_wins": number,
        "total_losses": number
      },
      "sport_specific": {
        "category": "${sportName}",
        "metrics": [
          {
            "name": "Career Metric Name",
            "value": number_or_string,
            "unit": "string_or_null"
          }
          // Include 15-25 comprehensive career metrics
        ]
      }
    }
  },
  "highlights": [
    {
      "title": "Top Statistical Highlight",
      "value": "Most impressive stat",
      "description": "Why this stands out",
      "icon": "star"
    },
    {
      "title": "Recent Achievement",
      "value": "Latest notable performance",
      "description": "Context and significance",
      "icon": "award"
    },
    {
      "title": "Career Milestone",
      "value": "Major career achievement",
      "description": "Historical significance",
      "icon": "trophy"
    }
  ],
  "summary": {
    "overall_rating": "Excellent|Very Good|Good|Average|Developing",
    "key_strengths": ["strength 1", "strength 2", "strength 3"],
    "notable_achievements": ["achievement 1", "achievement 2", "achievement 3"]
  },
  "last_updated": "2025-10-11T18:00:00Z",
  "data_quality": "high|medium|low",
  "references": [
    {
      "source": "Brief description of data source (NO URLs)",
      "data_points": ["Specific stats or facts used from this source"],
      "reliability": "high|medium|low"
    }
  ]
}

SPORT-SPECIFIC METRICS DEPTH EXAMPLES:

For TAEKWONDO:
Recent: Head Kicks %, Body Kicks %, Leg Kicks %, Punch Frequency, Penalty Rate, Points per Round, Counter-attack Success %, Stamina Index, Technical Accuracy %, Electronic Scoring Rate, Clinch Frequency, Distance Management Score, Kick Speed, Reaction Time, Round Win %, 2-0 Match Wins, Come-from-behind Wins, Tournament Placement Average

Career: Total Kicks Thrown, Career Head Kick %, Career Technical Points, Olympic Cycle Performance, World Championship Results, Continental Results, Injury Recovery Stats, Age Peak Performance, Style Evolution Index, Opponent Quality Rating, Venue Performance (Home vs Away), Season Consistency Rating

For BASKETBALL:
Recent: PPG, RPG, APG, FG%, 3P%, FT%, Steals, Blocks, Turnovers, PER, True Shooting %, Usage Rate, Assist/Turnover Ratio, Defensive Rating, Plus/Minus, Win Shares, VORP

Career: Total Points, Total Rebounds, Total Assists, Career FG%, All-Star Selections, MVP Awards, Championship Rings, Triple-Doubles, Career High Games, Playoff Performance

Return ONLY the JSON object with comprehensive statistics.`;

    console.log(`🔍 [O3] Searching statistics for ${athleteName}...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 16000,
    });

    const rawResponse = response.output_text.trim();
    console.log(`📊 [O3] Raw statistics response length: ${rawResponse.length} characters`);

    // Clean and parse JSON
    let cleanedResponse = rawResponse;
    
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const statsData: StatisticsData = parseO3JsonResponse(cleanedResponse);
    console.log(`✅ [O3] Successfully generated statistics for ${athleteName}`);

    return statsData;
  } catch (error) {
    console.error(`❌ [O3] Error generating statistics for ${athleteName}:`, error);
    throw new Error(`Failed to generate athlete statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================
// STRENGTHS ANALYSIS (o3 with web search)
// ========================
export async function generateAthleteStrengths(
  athleteName: string,
  sport: string,
  athleteData?: any,
  language: string = 'en'
): Promise<any> {
  try {
    const isArabic = language === 'ar';
    const languageInstruction = isArabic 
      ? '\n\nIMPORTANT LANGUAGE REQUIREMENT: You MUST respond in Arabic language. All text content in the JSON response including title, description, and evidence should be written in Arabic. Write naturally in Arabic with proper grammar and structure. Keep JSON field names in English, but translate all string values to Arabic.'
      : '';

    const prompt = `You are an expert ${sport} coach and analyst. Research and analyze the specific competitive strengths of athlete "${athleteName}" from ${athleteData?.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.${languageInstruction}

Use the following athlete information for personalized analysis:
- Name: ${athleteName}
- Sport: ${sport}
- Country: ${athleteData?.country || 'N/A'}
- Biography: ${athleteData?.bio || 'N/A'}
- Current Rank: ${athleteData?.rank || 'N/A'}
- Competition Record: ${athleteData?.competitionRecord || 'N/A'}
- Achievements: ${athleteData?.achievements?.join(', ') || 'N/A'}

WEB SEARCH STRATEGY:
1. Search "${athleteName} ${sport} strengths analysis"
2. Search "${athleteName} competition highlights ${sport}"
3. Search "${athleteName} technical skills ${sport}"
4. Search "${athleteName} recent matches performance"
5. Search "${athleteName} expert analysis coach commentary"

Provide 3-4 specific, evidence-based strengths based on:
- Technical skills unique to this athlete
- Tactical advantages in competition
- Physical attributes that give competitive edge
- Mental/psychological strengths shown in matches
- Signature techniques or fighting style elements

Return this exact JSON structure:
{
  "strengths": [
    {
      "title": "Specific strength name",
      "description": "Detailed analysis with evidence from competitions and expert observations",
      "rating": 95,
      "evidence": "Specific examples from matches or competitions",
      "impact": "high"
    }
  ]
}

Use authentic data only - base analysis on real competition results and verified performance data.

IMPORTANT: Do not include any links, URLs, citations, or reference sources in your response. Provide clean text without any reference links, citations, or bracketed/parenthetical references to websites.

Return ONLY the JSON object.`;

    console.log(`🔍 [O3] Searching strengths analysis for ${athleteName}...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 16000,
    });

    const rawResponse = response.output_text.trim();
    console.log(`💪 [O3] Raw strengths response length: ${rawResponse.length} characters`);

    // Clean and parse JSON
    let cleanedResponse = rawResponse;
    
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const strengthsData = parseO3JsonResponse(cleanedResponse);
    console.log(`✅ [O3] Successfully generated strengths for ${athleteName}`);

    return strengthsData;
  } catch (error) {
    console.error(`❌ [O3] Error generating strengths for ${athleteName}:`, error);
    throw new Error(`Failed to generate athlete strengths: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================
// WEAKNESSES ANALYSIS (o3 with web search)
// ========================
export async function generateAthleteWeaknesses(
  athleteName: string,
  sport: string,
  athleteData?: any,
  language: string = 'en'
): Promise<any> {
  try {
    const isArabic = language === 'ar';
    const languageInstruction = isArabic 
      ? '\n\nIMPORTANT LANGUAGE REQUIREMENT: You MUST respond in Arabic language. All text content in the JSON response including title, description, evidence, and improvement_timeline should be written in Arabic. Write naturally in Arabic with proper grammar and structure. Keep JSON field names in English, but translate all string values to Arabic.'
      : '';

    const prompt = `You are an expert ${sport} coach and performance analyst. Research and identify specific areas for improvement for athlete "${athleteName}" from ${athleteData?.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.${languageInstruction}

Use the following athlete information for personalized analysis:
- Name: ${athleteName}
- Sport: ${sport}
- Country: ${athleteData?.country || 'N/A'}
- Biography: ${athleteData?.bio || 'N/A'}
- Current Rank: ${athleteData?.rank || 'N/A'}
- Competition Record: ${athleteData?.competitionRecord || 'N/A'}
- Achievements: ${athleteData?.achievements?.join(', ') || 'N/A'}

WEB SEARCH STRATEGY:
1. Search "${athleteName} ${sport} weaknesses analysis"
2. Search "${athleteName} losses defeats ${sport}"
3. Search "${athleteName} areas for improvement"
4. Search "${athleteName} match analysis criticism"
5. Search "${athleteName} technique gaps ${sport}"

Provide 3-4 specific, evidence-based weaknesses or areas for improvement based on:
- Technical gaps or inconsistencies
- Tactical vulnerabilities in competition
- Physical limitations affecting performance
- Mental/psychological challenges
- Pattern analysis from lost matches

Return this exact JSON structure:
{
  "weaknesses": [
    {
      "title": "Specific weakness or area for improvement",
      "description": "Detailed analysis with evidence from competitions",
      "impact": "high",
      "improvement_timeline": "short-term",
      "evidence": "Specific examples from matches showing this weakness"
    }
  ]
}

Use authentic data only - base analysis on real competition results and verified performance data.

IMPORTANT: Do not include any links, URLs, citations, or reference sources in your response. Provide clean text without any reference links, citations, or bracketed/parenthetical references to websites.

Return ONLY the JSON object.`;

    console.log(`🔍 [O3] Searching weaknesses analysis for ${athleteName}...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 16000,
    });

    const rawResponse = response.output_text.trim();
    console.log(`📉 [O3] Raw weaknesses response length: ${rawResponse.length} characters`);

    // Clean and parse JSON
    let cleanedResponse = rawResponse;
    
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const weaknessesData = parseO3JsonResponse(cleanedResponse);
    console.log(`✅ [O3] Successfully generated weaknesses for ${athleteName}`);

    return weaknessesData;
  } catch (error) {
    console.error(`❌ [O3] Error generating weaknesses for ${athleteName}:`, error);
    throw new Error(`Failed to generate athlete weaknesses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================
// ATHLETE COMPARISON FUNCTIONS (o3 with web search)
// ========================

// Helper function to format athlete data for comparison
function formatAthleteDataForComparison(athleteData: any): string {
  if (!athleteData) return '';
  
  return `
EXISTING VERIFIED DATA (Use as authoritative source):
${athleteData.rankings ? `
RANKINGS DATA (from BrowserUse - AUTHORITATIVE):
${JSON.stringify(athleteData.rankings, null, 2)}
` : ''}
${athleteData.competitiveHistory ? `
COMPETITIVE HISTORY (from BrowserUse - AUTHORITATIVE):
${JSON.stringify(athleteData.competitiveHistory, null, 2)}
` : ''}
${athleteData.age ? `Age: ${athleteData.age}` : ''}
${athleteData.dateOfBirth ? `Date of Birth: ${athleteData.dateOfBirth}` : ''}
${athleteData.weight ? `Weight: ${athleteData.weight}` : ''}
${athleteData.height ? `Height: ${athleteData.height}` : ''}
${athleteData.category ? `Category: ${athleteData.category}` : ''}
${athleteData.achievements && athleteData.achievements.length > 0 ? `
Achievements:
${athleteData.achievements.map((a: any) => typeof a === 'string' ? `- ${a}` : `- ${a.achievement || a}`).join('\n')}
` : ''}
${athleteData.bio ? `Biography: ${athleteData.bio}` : ''}

CRITICAL: Rankings and competitive history data above are from official federation websites - use as primary source.`;
}

// 1. OVERVIEW COMPARISON
export async function generateOverviewComparison(
  athlete1Data: any,
  athlete2Data: any,
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' 
      ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' 
      : 'Generate all text content in English.';
    
    const athlete1DataSection = formatAthleteDataForComparison(athlete1Data);
    const athlete2DataSection = formatAthleteDataForComparison(athlete2Data);

    const prompt = `You are an expert ${sport} analyst. Find current ranking and basic information for these two athletes.

${languageInstruction}

ATHLETE 1: ${athlete1Data.name} from ${athlete1Data.country} (${sport})
${athlete1DataSection}

ATHLETE 2: ${athlete2Data.name} from ${athlete2Data.country} (${sport})
${athlete2DataSection}

MANDATORY: Use web search to find current World ${sport} rankings 2024-2025 and verify/supplement the BrowserUse data provided above.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- Do NOT include any text before or after the JSON
- Ensure all JSON strings are properly escaped
- Use double quotes for all strings
- Do NOT include any links, URLs, citations, or reference sources

Return JSON in this EXACT format:
{
  "athlete1": {
    "name": "${athlete1Data.name.replace(/"/g, '\\"')}",
    "country": "${athlete1Data.country}", 
    "rank": "Current world ranking from BrowserUse or web search",
    "category": "Weight/division category if applicable",
    "record": "Win-loss record or performance summary"
  },
  "athlete2": {
    "name": "${athlete2Data.name.replace(/"/g, '\\"')}",
    "country": "${athlete2Data.country}",
    "rank": "Current world ranking from BrowserUse or web search",
    "category": "Weight/division category if applicable", 
    "record": "Win-loss record or performance summary"
  },
  "overallAnalysis": {
    "summary": "Brief comparison highlighting ranking difference and significance"
  }
}`;

    console.log(`🔍 [O3] Generating overview comparison between ${athlete1Data.name} and ${athlete2Data.name}...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
    });

    const rawResponse = response.output_text.trim();
    
    // Parse JSON
    let cleanedResponse = rawResponse;
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsedData = parseO3JsonResponse(cleanedResponse);
    
    return {
      rawResponse: cleanedResponse,
      source: "o3 with Web Search",
      tabType: "overview"
    };
  } catch (error) {
    console.error(`❌ [O3] Error in overview comparison:`, error);
    throw error;
  }
}

// 2. STRENGTHS COMPARISON
export async function generateStrengthsComparison(
  athlete1Data: any,
  athlete2Data: any,
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' 
      ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' 
      : 'Generate all text content in English.';
    
    const athlete1DataSection = formatAthleteDataForComparison(athlete1Data);
    const athlete2DataSection = formatAthleteDataForComparison(athlete2Data);

    const prompt = `You are an expert ${sport} analyst. Analyze the specific strengths of these two athletes.

${languageInstruction}

ATHLETE 1: ${athlete1Data.name} (${athlete1Data.country}) in ${sport}
${athlete1DataSection}

ATHLETE 2: ${athlete2Data.name} (${athlete2Data.country}) in ${sport}
${athlete2DataSection}

MANDATORY: Search for technical skills, recent performances, signature techniques, and competitive advantages. Use BrowserUse data as foundation and supplement with web search.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- List at least 3-5 specific strengths for each athlete with evidence
- Do NOT include any links, URLs, citations, or reference sources

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
        "rating": 85,
        "evidence": "Recent examples from competitions"
      }
    ]
  },
  "comparison": "Overall strengths comparison analysis"
}`;

    console.log(`🔍 [O3] Generating strengths comparison...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 12000,
    });

    const rawResponse = response.output_text.trim();
    
    let cleanedResponse = rawResponse;
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsedData = parseO3JsonResponse(cleanedResponse);
    
    return {
      rawResponse: cleanedResponse,
      source: "o3 with Web Search",
      tabType: "strengths"
    };
  } catch (error) {
    console.error(`❌ [O3] Error in strengths comparison:`, error);
    throw error;
  }
}

// 3. WEAKNESSES COMPARISON
export async function generateWeaknessesComparison(
  athlete1Data: any,
  athlete2Data: any,
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' 
      ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' 
      : 'Generate all text content in English.';
    
    const athlete1DataSection = formatAthleteDataForComparison(athlete1Data);
    const athlete2DataSection = formatAthleteDataForComparison(athlete2Data);

    const prompt = `You are an expert ${sport} analyst. Analyze areas for improvement and weaknesses for these athletes.

${languageInstruction}

ATHLETE 1: ${athlete1Data.name} (${athlete1Data.country}) in ${sport}
${athlete1DataSection}

ATHLETE 2: ${athlete2Data.name} (${athlete2Data.country}) in ${sport}
${athlete2DataSection}

MANDATORY: Search for technical weaknesses, past struggles, and areas opponents have exploited. Use BrowserUse data to identify patterns in losses.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- NO line breaks or newlines inside string values
- Do NOT include any links, URLs, citations, or reference sources

{
  "weaknesses": {
    "athlete1": [
      {
        "title": "Area for improvement",
        "description": "Detailed explanation",
        "impact": "high",
        "exploitation": "How opponents can exploit this"
      }
    ],
    "athlete2": [
      {
        "title": "Area for improvement",
        "description": "Detailed explanation",
        "impact": "medium",
        "exploitation": "How opponents can exploit this"
      }
    ]
  },
  "tacticalAdvice": {
    "athlete1VsAthlete2": "How athlete1 can exploit athlete2's weaknesses",
    "athlete2VsAthlete1": "How athlete2 can exploit athlete1's weaknesses"
  }
}`;

    console.log(`🔍 [O3] Generating weaknesses comparison...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 12000,
    });

    const rawResponse = response.output_text.trim();
    
    let cleanedResponse = rawResponse;
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsedData = parseO3JsonResponse(cleanedResponse);
    
    return {
      rawResponse: cleanedResponse,
      source: "o3 with Web Search",
      tabType: "weaknesses"
    };
  } catch (error) {
    console.error(`❌ [O3] Error in weaknesses comparison:`, error);
    throw error;
  }
}

// 4. COMPETITION HISTORY COMPARISON
export async function generateCompetitionHistoryComparison(
  athlete1Data: any,
  athlete2Data: any,
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' 
      ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' 
      : 'Generate all text content in English.';
    
    const athlete1DataSection = formatAthleteDataForComparison(athlete1Data);
    const athlete2DataSection = formatAthleteDataForComparison(athlete2Data);

    const prompt = `You are an expert ${sport} analyst. Compare the competitive experience and achievements of these two athletes using their actual competition records.

${languageInstruction}

ATHLETE 1: ${athlete1Data.name} (${athlete1Data.country}) in ${sport}
${athlete1DataSection}

ATHLETE 2: ${athlete2Data.name} (${athlete2Data.country}) in ${sport}
${athlete2DataSection}

🚨 CRITICAL: The competitive history from BrowserUse above contains REAL competition results. You MUST:
1. Reference SPECIFIC competitions from their history (e.g., "Won 1st place at 2024 World Championship")
2. Compare their actual tournament placements and medal counts
3. Analyze their competitive trajectory based on real results shown above
4. Mention specific tournaments, dates, and results from the BrowserUse data

DO NOT make generic statements - use the actual competition names, dates, and placements provided in the competitive history data above.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- Do NOT include any links, URLs, citations, or reference sources
- Include specific competition references from the BrowserUse data in your analysis

Return ONLY pure JSON:
{
  "ranking": {
    "comparison": "Detailed comparison using SPECIFIC competitions from their history above (mention actual tournament names, dates, and results)",
    "athlete1Trajectory": "Ranking progression with SPECIFIC competition results and dates from the data above",
    "athlete2Trajectory": "Ranking progression with SPECIFIC competition results and dates from the data above"
  }
}`;

    console.log(`🔍 [O3] Generating competition history comparison...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 10000,
    });

    const rawResponse = response.output_text.trim();
    
    let cleanedResponse = rawResponse;
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsedData = parseO3JsonResponse(cleanedResponse);
    
    return {
      rawResponse: cleanedResponse,
      source: "o3 with Web Search",
      tabType: "competitionHistory"
    };
  } catch (error) {
    console.error(`❌ [O3] Error in competition history comparison:`, error);
    throw error;
  }
}

// 5. HEAD-TO-HEAD PREDICTION
export async function generateHeadToHeadComparison(
  athlete1Data: any,
  athlete2Data: any,
  sport: string,
  language: string = 'english'
): Promise<any> {
  try {
    const languageInstruction = language === 'arabic' 
      ? 'IMPORTANT: Generate all text content, field values, and analysis in Arabic language only. Do not use English except for athlete names and JSON keys.' 
      : 'Generate all text content in English.';
    
    const athlete1DataSection = formatAthleteDataForComparison(athlete1Data);
    const athlete2DataSection = formatAthleteDataForComparison(athlete2Data);

    const prompt = `You are an expert ${sport} analyst. Provide head-to-head prediction analysis for these athletes.

${languageInstruction}

ATHLETE 1: ${athlete1Data.name} (${athlete1Data.country}) in ${sport}
${athlete1DataSection}

ATHLETE 2: ${athlete2Data.name} (${athlete2Data.country}) in ${sport}
${athlete2DataSection}

MANDATORY: Use BrowserUse data (rankings, competitive history) as foundation. Search for previous meetings, fighting styles, recent form, and expert predictions.

CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON - no explanations, no markdown, no code blocks
- Do NOT include any links, URLs, citations, or reference sources

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
    }
  }
}`;

    console.log(`🔍 [O3] Generating head-to-head prediction...`);
    
    const response = await openai.responses.create({
      model: "o3",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 10000,
    });

    const rawResponse = response.output_text.trim();
    
    let cleanedResponse = rawResponse;
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (cleanedResponse.includes('```')) {
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    }

    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsedData = parseO3JsonResponse(cleanedResponse);
    
    return {
      rawResponse: cleanedResponse,
      source: "o3 with Web Search",
      tabType: "headToHead"
    };
  } catch (error) {
    console.error(`❌ [O3] Error in head-to-head comparison:`, error);
    throw error;
  }
}
