/**
 * ============================================================================
 * ATHLETE360 - CENTRALIZED PROMPTS FILE
 * ============================================================================
 * This file contains ALL AI prompts used throughout the Athlete360 platform.
 * Organized by service and purpose for easy maintenance and modification.
 */

// SportConfig interface is defined in videoAnalysisService.ts
// Import it when needed or define it inline here
interface SportConfig {
  name: string;
  primaryActions: string[];
  scoringEvents: string[];
  violationsEvents: string[];
  hasRounds: boolean;
  timeFormat: string;
  analysisTerms: {
    action: string;
    violation: string;
    scoring: string;
  };
}

// ============================================================================
// OPENAI SERVICE PROMPTS
// ============================================================================

/**
 * Image Search Prompt - Find athlete images
 * Used in: server/openaiService.ts
 */
export const getImageSearchPrompt = (name: string, sport: string, nationality: string, age?: string, height?: string, weight?: string) => {
  const nationalityDesc = nationality ? ` from ${nationality}` : '';
  const ageDesc = age ? `, age ${age}` : '';
  const physicalDesc = height || weight ? `, ${height || ''}${height && weight ? ', ' : ''}${weight || ''}` : '';
  
  return `Professional sports portrait of ${name}, a ${sport} athlete${nationalityDesc}.${ageDesc}${physicalDesc} 
  
Search for high-quality, professional images from official sources (sports federations, Olympic committees, verified news outlets).
CRITICAL: Only return DIRECT downloadable image URLs (ending in .jpg, .jpeg, .png, .webp).
DO NOT include:
- Social media URLs (Facebook, Instagram, Twitter, LinkedIn)
- URLs requiring authentication
- Thumbnail or preview URLs
- URLs from image hosting sites (imgur, flickr)

Return ONLY valid JSON in this format:
{
  "images": [
    {
      "url": "direct_downloadable_url",
      "source": "official source name",
      "description": "brief description"
    }
  ]
}`;
};

/**
 * Athlete Biography Prompt - Generate comprehensive biography
 * Used in: server/openaiService.ts
 */
export const getBiographyPrompt = (currentDate: string, athleteName: string, sport: string, nationality?: string, language: string = 'english') => {
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  const languageInstruction = language === 'arabic' 
    ? 'Write the entire response in Arabic (العربية). Use proper Arabic terminology.'
    : 'Write the response in English.';

  return `Today's date is ${currentDate}.

You are a professional sports biographer specializing in ${sport}. Search the internet extensively and create a comprehensive, engaging biography for athlete "${athleteName}"${nationalityContext}.

${languageInstruction}

Your biography must include:
1. **Early Life & Background**: Birthplace, family, early sports involvement, how they discovered ${sport}
2. **Career Journey**: Training progression, breakthrough moments, key competitions
3. **Major Achievements**: Olympic medals, World Championships, national titles, records
4. **Playing Style & Strengths**: Technical abilities, signature moves, tactical approach
5. **Recent Form**: Current season performance, latest competitions, ranking
6. **Personal Story**: Challenges overcome, inspirations, memorable moments
7. **Impact & Legacy**: Influence on the sport, role model status, future goals

Writing requirements:
- Write in an engaging, narrative style that tells a compelling story
- Use specific details, dates, and accomplishments
- Include direct quotes from interviews when available
- Maintain chronological flow from early career to present
- Be factual and cite recent information
- Write 4-6 detailed paragraphs (800-1200 words)

Search extensively to ensure accuracy and currency of information.`;
};

/**
 * Athlete Personal Info Extraction Prompt
 * Used in: server/openaiService.ts
 */
export const getPersonalInfoPrompt = (currentDate: string, athleteName: string, sport: string, nationality?: string) => {
  const nationalityContext = nationality ? ` from ${nationality}` : '';

  return `Today's date is ${currentDate}.

Search the internet to find detailed personal information about athlete "${athleteName}"${nationalityContext} who competes in ${sport}.

Extract ONLY factual information from reliable sources. Return ONLY valid JSON in this EXACT format:

{
  "age": number or "Unknown",
  "dateOfBirth": "YYYY-MM-DD" or "Unknown",
  "weight": "XX kg" or "Unknown",
  "height": "XXX cm" or "Unknown",
  "position": "specific position/role" or "Unknown",
  "educationalBackground": "detailed education history" or "Unknown",
  "previousSports": ["sport1", "sport2"] or [],
  "yearsInCurrentSport": "X years" or "Unknown"
}

CRITICAL RULES:
- Use "Unknown" for any field where reliable information cannot be found
- For age: calculate from date of birth if only birthdate is available
- For weight/height: use metric units (kg, cm)
- For previousSports: only include sports they competed in before their current sport
- For yearsInCurrentSport: calculate based on when they started competing professionally
- Search multiple sources to verify accuracy
- Return ONLY valid JSON, no additional text`;
};

/**
 * Strengths Analysis Prompt
 * Used in: server/openaiService.ts
 */
export const getStrengthsPrompt = (sport: string, athleteName: string, athleteData: any) => {
  return `As a professional ${sport} analyst, provide detailed analysis for athlete "${athleteName}".

Current Information:
- Rank: ${athleteData?.currentRank || athleteData?.rank || 'Unknown'}
- Nationality: ${athleteData?.country || 'Unknown'}
- Recent Achievements: ${athleteData?.achievements?.join(', ') || 'None provided'}

Search the internet extensively to find:
1. **Technical Skills**: Specific techniques they excel at
2. **Physical Attributes**: Speed, power, endurance, flexibility
3. **Mental Game**: Psychological strengths, competition mindset
4. **Tactical Abilities**: Strategic thinking, adaptability
5. **Recent Performance**: Current form, recent victories
6. **Competitive Advantages**: What makes them stand out

Provide specific examples and evidence from recent competitions. Be detailed and analytical.`;
};

/**
 * Development Plan Prompt
 * Used in: server/openaiService.ts
 */
export const getDevelopmentPlanPrompt = (sport: string, athleteName: string, athleteData: any, goal?: string) => {
  return `You are an expert ${sport} coach and performance analyst. Create a detailed development plan for athlete "${athleteName}" from ${athleteData?.country || 'unknown country'}.

Current Status:
- World Rank: ${athleteData?.currentRank || athleteData?.rank || 'Unknown'}
- Known Strengths: ${athleteData?.strengths || 'To be assessed'}
- Known Weaknesses: ${athleteData?.weaknesses || 'To be assessed'}
- Goal: ${goal || 'Improve overall performance and ranking'}

Create a comprehensive development plan that includes:

1. **Performance Assessment**
   - Current level analysis
   - Gap analysis between current and target performance

2. **Technical Development** (40% focus)
   - Specific techniques to improve
   - Training drills and exercises
   - Skill progression timeline

3. **Physical Conditioning** (30% focus)
   - Strength training program
   - Endurance development
   - Flexibility and mobility work
   - Injury prevention strategies

4. **Tactical Training** (20% focus)
   - Competition strategy development
   - Opponent analysis methods
   - Adaptability training

5. **Mental & Psychological** (10% focus)
   - Mental toughness training
   - Pressure management
   - Visualization techniques
   - Competition mindset development

6. **Timeline & Milestones**
   - Short-term goals (1-3 months)
   - Medium-term goals (3-6 months)
   - Long-term goals (6-12 months)
   - Key performance indicators

Provide specific, actionable recommendations with clear progression paths.`;
};

/**
 * Rank History Analysis Prompt
 * Used in: server/openaiService.ts
 */
export const getRankHistoryPrompt = (athleteName: string, nationality: string, sport: string) => {
  return `Search the OFFICIAL SPORT FEDERATION WEBSITES for authentic ranking progression data for athlete "${athleteName}" from ${nationality || 'unknown nationality'} in ${sport}.

CRITICAL SEARCH REQUIREMENTS:
1. Find the official ${sport} federation website
2. Navigate to their ranking/results section
3. Extract historical ranking data across multiple years
4. Identify major competition results that affected rankings
5. Look for Olympic rankings, World Championships, Continental Championships

Your analysis must include:

1. **Ranking System Overview**
   - How the ${sport} ranking system works
   - Types of rankings (World, Olympic, Continental, National)
   - Point system and ranking calculation method

2. **Career Phases** (Divide career into 3-4 phases)
   For each phase provide:
   - Phase name and time period
   - Key achievements during this phase
   - Ranking progression
   - Notable competitions and results
   - Impact on overall career trajectory

3. **Detailed Competition Timeline**
   - Major tournaments participated in
   - Results and placement
   - Ranking before and after each major event
   - Competition tier (Olympic, World, Continental, National)

4. **Analysis Narrative**
   - Career trajectory story
   - Breakthrough moments
   - Challenges and comebacks
   - Current form and future outlook
   - Comparison to historical performance

Return comprehensive JSON with verified, authentic ranking data from official sources.`;
};

/**
 * Athlete Comparison Overview Prompt (GPT)
 * Used in: server/openaiService.ts
 */
export const getComparisonOverviewPromptGPT = (sport: string, athlete1Name: string, athlete2Name: string, athlete1Data: any, athlete2Data: any) => {
  return `You are an expert ${sport} analyst and coach with advanced web search capabilities. You MUST search the internet extensively to find current, authentic information about these two athletes and create a comprehensive comparison.

Athlete 1: ${athlete1Name}
- Current Rank: ${athlete1Data?.currentRank || athlete1Data?.rank || 'Unknown'}
- Nationality: ${athlete1Data?.country || 'Unknown'}
- Known Achievements: ${athlete1Data?.achievements?.join(', ') || 'Search required'}

Athlete 2: ${athlete2Name}
- Current Rank: ${athlete2Data?.currentRank || athlete2Data?.rank || 'Unknown'}
- Nationality: ${athlete2Data?.country || 'Unknown'}
- Known Achievements: ${athlete2Data?.achievements?.join(', ') || 'Search required'}

MANDATORY WEB SEARCH REQUIREMENTS:
1. Search official ${sport} federation rankings
2. Find recent competition results (last 12 months)
3. Verify current world rankings from multiple sources
4. Find head-to-head matchup history if exists
5. Search for expert analyst opinions and predictions

Your comparison must include:

1. **Current Status Overview**
   - Verified current world rankings
   - Recent form and performance
   - Active competition schedule

2. **Career Comparison**
   - Major achievements and titles
   - Career trajectory
   - Peak performance periods

3. **Technical Comparison**
   - Playing style differences
   - Technical strengths of each
   - Tactical approaches

4. **Head-to-Head Analysis** (if applicable)
   - Previous encounters
   - Win/loss record
   - Performance patterns in matchups

5. **Overall Assessment**
   - Who has the edge and why
   - Key factors in their rivalry
   - Future outlook for both

Provide detailed, factual analysis based on extensive web research.`;
};

/**
 * Statistics Comparison Prompt
 * Used in: server/openaiService.ts
 */
export const getStatisticsPrompt = (sport: string, athlete1Name: string, athlete2Name: string, athlete1Data: any, athlete2Data: any, currentDate: string) => {
  return `You are an advanced sports statistics generator specializing in comprehensive, deep statistical analysis. You MUST search the internet extensively to find detailed, authentic statistical data about this athlete.

Today's date: ${currentDate}

Athletes to Compare:
1. ${athlete1Name} (${athlete1Data?.country || 'Unknown'})
2. ${athlete2Name} (${athlete2Data?.country || 'Unknown'})

Sport: ${sport}

MANDATORY DATA SOURCES:
- Official ${sport} federation statistics
- Tournament result databases
- Sports statistics websites (ESPN, official sport sites)
- Competition history records
- Performance tracking databases

Find and compare the following statistics:

**Recent Season Statistics** (Last 12 months)
- Competitions entered
- Win-loss record
- Tournament results
- Ranking progression
- Points earned

**Career Statistics** (All-time)
- Total competitions
- Career win percentage
- Major titles won
- Total medals/awards
- Years active
- Best ranking achieved

**${sport}-Specific Metrics**
- Technical performance indicators
- Success rates in key actions
- Average scores/points
- Performance under pressure
- Head-to-head record (if applicable)

**Recent Form** (Last 3 months)
- Latest competition results
- Performance trend
- Notable victories
- Current ranking

Return detailed, verified statistics in structured JSON format with sources cited.`;
};

// ============================================================================
// GEMINI SERVICE PROMPTS (Nutrition & Athlete Analysis)
// ============================================================================

/**
 * Nutrition Plan Generation Prompt (Single Week)
 * Used in: server/geminiService.ts
 */
export const getNutritionWeekPrompt = (params: {
  weekNumber: number;
  name: string;
  genderText: string;
  nationalityText: string;
  sportName: string;
  goal: string;
  height: number;
  currentWeight: number;
  targetWeight: number;
  period: number;
  weekDays: any[];
  dayNames: string[];
  varietyContext: string;
  isArabic: boolean;
}) => {
  const {
    weekNumber,
    name,
    genderText,
    nationalityText,
    sportName,
    goal,
    height,
    currentWeight,
    targetWeight,
    period,
    weekDays,
    dayNames,
    varietyContext,
    isArabic
  } = params;

  if (isArabic) {
    return `قم بإنشاء خطة غذائية للأسبوع رقم ${weekNumber} (7 أيام):

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
- احسب السعرات حسب الهدف: ${goal}`;
  }

  return `Create a nutrition plan for Week ${weekNumber} (7 days):

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
  "instructions": "Week ${weekNumber} meal plan designed for ${sportName} athlete",
  "days": [
    {
      "day": {
        "date": "${weekDays[0].day.date}",
        "name": "${weekDays[0].day.name}"
      },
      "meals": [
        {
          "calories_intake": "500 calories",
          "meal_description": ["Specific ${nationalityText} foods with portions"]
        },
        {
          "calories_intake": "400 calories",
          "meal_description": ["Mid-morning snack details"]
        },
        {
          "calories_intake": "700 calories",
          "meal_description": ["Lunch details"]
        },
        {
          "calories_intake": "300 calories",
          "meal_description": ["Afternoon snack"]
        },
        {
          "calories_intake": "600 calories",
          "meal_description": ["Dinner details"]
        }
      ],
      "explanation": "Why this day supports ${sportName} performance and ${goal}",
      "total_calories_intake": "2500 calories"
    }
  ]
}

Requirements for Week ${weekNumber}:
- 7 complete days (${dayNames.join(', ')})
- 5 meals per day optimized for ${sportName}
- Use diverse ${nationalityText} cuisine
- Calculate calories based on goal: ${goal}
- Ensure adequate protein for recovery
- Include hydration guidelines
- Time meals around training schedule`;
};

/**
 * Gemini Comparison Overview Prompt
 * Used in: server/geminiService.ts
 */
export const getComparisonOverviewPromptGemini = (sport: string, athlete1Name: string, athlete2Name: string) => {
  return `You are an expert ${sport} analyst with Google search capabilities. Find current ranking and basic information for these two athletes.

Athlete 1: ${athlete1Name}
Athlete 2: ${athlete2Name}

Use Google search to find:
1. Current world ranking for both athletes
2. Nationality and age
3. Recent major achievements (last 12 months)
4. Current form and competition status
5. Brief playing style description

Return structured data comparing both athletes with verified current information.

MANDATORY: Use Google search to find the most recent and accurate information.`;
};

/**
 * Gemini Strengths Comparison Prompt
 * Used in: server/geminiService.ts
 */
export const getStrengthsComparisonPromptGemini = (sport: string, athlete1Name: string, athlete2Name: string) => {
  return `You are an expert ${sport} analyst. Analyze the specific strengths of these two athletes using Google search.

Athlete 1: ${athlete1Name}
Athlete 2: ${athlete2Name}

For EACH athlete, identify:
1. **Technical Strengths**: Specific skills they excel at
2. **Physical Attributes**: Speed, power, endurance advantages
3. **Mental Game**: Psychological strengths
4. **Tactical Abilities**: Strategic advantages
5. **Recent Performance**: Current form highlights

Use Google search to find recent analyst opinions, competition results, and expert commentary.

Provide detailed, evidence-based analysis of each athlete's strengths.`;
};

/**
 * Gemini Weaknesses Analysis Prompt
 * Used in: server/geminiService.ts
 */
export const getWeaknessesComparisonPromptGemini = (sport: string, athlete1Name: string, athlete2Name: string) => {
  return `You are an expert ${sport} analyst. Analyze areas for improvement and weaknesses for these athletes using Google search.

Athlete 1: ${athlete1Name}
Athlete 2: ${athlete2Name}

For EACH athlete, identify:
1. **Technical Weaknesses**: Skills that need improvement
2. **Physical Limitations**: Areas of physical disadvantage
3. **Mental Vulnerabilities**: Psychological challenges
4. **Tactical Gaps**: Strategic weaknesses
5. **Exploitable Patterns**: How opponents can take advantage

Use Google search to find:
- Expert analyst commentary
- Loss patterns in recent matches
- Areas opponents have successfully exploited
- Training focus areas mentioned in interviews

Provide constructive, detailed analysis of weaknesses and improvement areas.`;
};

/**
 * Gemini Competition History Prompt
 * Used in: server/geminiService.ts
 */
export const getCompetitionHistoryPromptGemini = (sport: string, athlete1Name: string, athlete2Name: string) => {
  return `You are an expert ${sport} analyst. Research the competition history and achievements of these athletes using Google search.

Athlete 1: ${athlete1Name}
Athlete 2: ${athlete2Name}

For EACH athlete, find and compare:

1. **Career Timeline**
   - Professional debut year
   - Career span and activity status
   - Ranking progression over time

2. **Major Achievements**
   - Olympic medals (if applicable)
   - World Championship results
   - Continental Championship results
   - National titles
   - Other major tournament wins

3. **Recent Competition Results** (Last 24 months)
   - Tournament participations
   - Results and placements
   - Notable victories
   - Performance trends

4. **Head-to-Head Record** (if they've competed)
   - Total encounters
   - Win-loss record
   - Venues and dates of matches
   - Score patterns

Use Google search to verify all information from official sources and sports databases.`;
};

/**
 * Gemini Head-to-Head Prediction Prompt
 * Used in: server/geminiService.ts
 */
export const getHeadToHeadPromptGemini = (sport: string, athlete1Name: string, athlete2Name: string) => {
  return `You are an expert ${sport} analyst. Provide head-to-head prediction analysis for these athletes using Google search.

Athlete 1: ${athlete1Name}
Athlete 2: ${athlete2Name}

Your analysis must include:

1. **Matchup Overview**
   - Style matchup analysis
   - Key factors that will determine the outcome
   - Historical context (if they've met before)

2. **Advantage Assessment**
   - Technical advantages for each athlete
   - Physical matchup considerations
   - Tactical edge analysis
   - Mental game comparison

3. **Scenario Analysis**
   - Best case scenario for each athlete
   - Most likely outcome
   - X-factors that could change the result

4. **Prediction**
   - Predicted winner with confidence level
   - Expected score/result pattern
   - Key moments to watch

5. **Tactical Recommendations**
   - Strategy for Athlete 1 to win
   - Strategy for Athlete 2 to win
   - Critical decisions during competition

Use Google search to gather recent form, expert predictions, and relevant matchup data.`;
};

/**
 * Gemini Personal Info Extraction Prompt
 * Used in: server/geminiService.ts
 */
export const getPersonalInfoPromptGemini = (name: string, sport: string, nationality?: string, currentDate?: string) => {
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  const dateContext = currentDate ? `Today's date is ${currentDate}.\n\n` : '';

  return `${dateContext}Search the web for factual personal information about the athlete "${name}"${nationalityContext} who competes in ${sport}.

Extract ONLY verified information from reliable sources (official sports federations, Olympic committees, verified news outlets).

Find and return:
1. **Basic Information**
   - Full name and any nicknames
   - Date of birth (format: YYYY-MM-DD)
   - Age (calculate from date of birth)
   - Nationality

2. **Physical Attributes**
   - Height (in cm)
   - Weight (in kg)
   - Dominant hand/foot (if applicable)

3. **Career Information**
   - Position or specialty within the sport
   - Years competing professionally
   - Club or team affiliation
   - Coach information

4. **Background**
   - Birthplace and hometown
   - Educational background
   - Previous sports before current sport
   - When they started in current sport

5. **Additional Details**
   - Family background (if publicly shared)
   - Languages spoken
   - Notable personal interests

Return only factual, verified information. Use "Unknown" for any field where reliable information cannot be found.`;
};

/**
 * Gemini Image Search Prompt
 * Used in: server/geminiService.ts
 */
export const getImageSearchPromptGemini = (name: string, sport: string, nationality?: string, additionalInfo?: string) => {
  const nationalityDesc = nationality ? ` from ${nationality}` : '';
  const additionalDesc = additionalInfo ? ` ${additionalInfo}` : '';

  return `You are an expert image researcher. Use web search to find 3-5 DIRECT downloadable image URLs for this athlete:

Name: ${name}
Sport: ${sport}
Nationality: ${nationality || 'Unknown'}
${additionalInfo ? `Additional Info: ${additionalInfo}` : ''}

CRITICAL REQUIREMENTS:
1. Find OFFICIAL, HIGH-QUALITY images from:
   - Official sport federation websites
   - Olympic committee websites
   - Major sports news outlets (ESPN, BBC Sport, etc.)
   - Official tournament websites

2. URLs MUST be:
   - Direct image links (ending in .jpg, .jpeg, .png, .webp)
   - Publicly accessible (no authentication required)
   - High resolution (minimum 800x600)
   - Professional sports photography

3. DO NOT include:
   - Social media images (Instagram, Facebook, Twitter)
   - Thumbnail or preview URLs
   - Images requiring login
   - Low-quality or amateur photos

4. Verify the athlete's identity in each image

Return ONLY valid JSON:
{
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "source": "Official Source Name",
      "description": "Brief description of the image"
    }
  ]
}`;
};

// ============================================================================
// VIDEO ANALYSIS PROMPTS (Gemini)
// ============================================================================

/**
 * Sport-Specific Video Analysis Prompts Generator
 * Used in: server/videoAnalysisService.ts
 */
export const generateVideoAnalysisPrompts = (
  sportConfig: SportConfig,
  roundToAnalyze: number | 'no-rounds',
  language: string
) => {
  const languageInstruction = language === 'arabic' 
    ? `Write your response in Arabic (العربية). Use proper Arabic terminology for ${sportConfig.name.toLowerCase()} techniques and match analysis.`
    : `Write your response in English.`;

  const roundText = roundToAnalyze === 'no-rounds' 
    ? 'the entire match/game' 
    : `round ${roundToAnalyze}`;

  // Match Analysis Prompt
  const promptMatch = `Write me a match analysis of what happened in ${roundText} in technical terms. Include the story of the ${roundToAnalyze === 'no-rounds' ? 'match' : 'round'}.

${languageInstruction}

Focus on:
- Opening strategy and tactics
- Key moments and turning points
- Technical execution quality
- Tactical adjustments
- Momentum shifts
- Critical decisions
- Overall performance assessment

Listen to commentator insights and incorporate them into your analysis. Watch the scoreboard for accurate score tracking.

Start with the first player/team, then analyze the second player/team. Use actual player names from the video.

Provide a detailed narrative that captures the essence of the competition.`;

  // Score Analysis Prompt
  const promptScore = `Watch ${roundText} only. Identify when a player scored using the scoreboard. Focus on the scoreboard change for better accuracy. Listen to commentators they will help you reference which player scored how many ${sportConfig.analysisTerms.scoring}. Include final match score (from scoreboard) in the summary.

${languageInstruction}

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_score_number,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "${sportConfig.analysisTerms.scoring} description",
          "value": points_scored
        }
      ]
    }
  ]
}

CRITICAL:
- Use MM:SS timestamp format (Minutes:Seconds)
- Use actual player names from the video
- Track cumulative score changes
- List ${sportConfig.analysisTerms.scoring} events chronologically
- Include final score in last event description`;

  // Actions Analysis Prompt (e.g., punches in Taekwondo)
  const promptActions = `Watch ${roundText} only. Watch this ${sportConfig.name.toLowerCase()} match and tell me when a player performed a ${sportConfig.analysisTerms.action === 'kicks' ? 'punch' : sportConfig.primaryActions[1]}, ${sportConfig.analysisTerms.action === 'kicks' ? 'a punch is when a player clenches their fist and tries to hit another player' : `a ${sportConfig.primaryActions[1]} is when a player attempts to ${sportConfig.primaryActions[1]}`}. If there are no ${sportConfig.analysisTerms.action === 'kicks' ? 'punches' : sportConfig.primaryActions[1]} found let the JSON be NONE.

${languageInstruction}

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Action description",
          "value": 1
        }
      ]
    }
  ]
}

Use actual player names. Track every attempt, whether successful or blocked.`;

  // Action Count Prompt (e.g., kick count)
  const promptActionCount = `Watch ${roundText} only. Watch the ${sportConfig.name.toLowerCase()} match and count the total number of ${sportConfig.analysisTerms.action} both players executed. Even if ${sportConfig.analysisTerms.action} doesn't hit the opponent or if they blocked it; count every time there is an attempt.

${languageInstruction}

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_kick_count,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "${sportConfig.analysisTerms.action} description",
          "value": 1
        }
      ]
    }
  ]
}

Count ALL ${sportConfig.analysisTerms.action} attempts, successful or not. Use actual player names.`;

  // Violations Prompt
  const promptViolations = `Watch ${roundText} only. This is a ${sportConfig.name.toLowerCase()} match, following ${sportConfig.name.toLowerCase()} rules. By looking at the scoreboard and watching when the referee gives a ${sportConfig.violationsEvents[0]} to a player, list all ${sportConfig.analysisTerms.violation} with their exact timestamps.

${languageInstruction}

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "total": total_violations,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Violation reason",
          "value": 1
        }
      ]
    }
  ]
}

Watch for referee signals and scoreboard changes. Use actual player names.`;

  return {
    promptMatch,
    promptScore,
    promptActions,
    promptActionCount,
    promptViolations
  };
};

/**
 * Dynamic Metric Discovery Prompt
 * Used in: server/videoAnalysisService.ts - askGeminiWhatToCount()
 */
export const getMetricDiscoveryPrompt = (
  sportConfig: SportConfig,
  roundText: string,
  scoreInstruction: string
) => {
  return `You are analyzing a ${sportConfig.name} match video. Your task is to identify what specific actions/events you can accurately count in this ${roundText}.

Based on the video, identify 3-5 distinct, countable metrics that are clearly visible and can be tracked with timestamps. For ${sportConfig.name}, these MUST include:
1. **Score** (REQUIRED) - ${scoreInstruction} Watch for scoreboard changes and audio cues from commentators.
2. Other specific types of actions (e.g., ${sportConfig.primaryActions.join(', ')})
3. Rule violations, penalties, or infractions if visible
4. Any other clearly identifiable, repeated actions

CRITICAL: ALL metrics MUST use this EXACT standardized JSON format:
{
  "players": [
    {
      "name": "Full Player Name",
      "total": 0,
      "events": [
        {
          "timestamp": "MM:SS",
          "description": "Event description",
          "value": 1
        }
      ]
    }
  ]
}

For EACH metric you identify, provide:
1. A clear title (e.g., "Score", "Aces", "Defensive Blocks")
2. A detailed prompt that you would use to count that specific metric - this prompt MUST:
   - Explicitly specify "${roundText}" in the counting instructions
   - Include the standardized JSON format shown above
   - Use player FULL NAMES (not "Player 1" or "Blue/Red" unless names are unknown)
   - Include MANDATORY instructions to ALWAYS return valid JSON even if no events are detected

Return ONLY a valid JSON response in this exact format:
{
  "metrics": [
    {
      "title": "Score",
      "prompt": "Watch ${roundText} only. ${scoreInstruction} For each scoring event, record the timestamp and value. Use player FULL NAMES from the video. MANDATORY: You MUST return the exact JSON format below, even if you cannot detect any events. If no events are visible, return empty events arrays but ALWAYS include both players. Return this EXACT JSON format: {\\"players\\": [{\\"name\\": \\"Full Player Name\\", \\"total\\": 0, \\"events\\": [{\\"timestamp\\": \\"MM:SS\\", \\"description\\": \\"Score description\\", \\"value\\": 1}]}]}. NEVER return empty text - ALWAYS return this JSON structure."
    },
    {
      "title": "Metric Title",
      "prompt": "Watch ${roundText} only. Identify when each player performs [action]. Look carefully at the video for clear instances of this action. Use player FULL NAMES from the video. MANDATORY: You MUST return the exact JSON format below, even if you cannot detect any events. If no events are visible, return empty events arrays but ALWAYS include both players. Return this EXACT JSON format: {\\"players\\": [{\\"name\\": \\"Full Player Name\\", \\"total\\": 0, \\"events\\": [{\\"timestamp\\": \\"MM:SS\\", \\"description\\": \\"Action description\\", \\"value\\": 1}]}]}. NEVER return empty text - ALWAYS return this JSON structure."
    }
  ]
}

CRITICAL RULES:
- FIRST metric MUST ALWAYS be "Score" with sport-specific scoring rules
- ALL metrics MUST use the EXACT same standardized JSON format shown above
- Use player FULL NAMES (e.g., "I. Swiatek", "M. Bouzkova") NOT "Player 1/2" or "Blue/Red"
- Each prompt MUST explicitly mention "${roundText}" in its instructions
- ALL TIMESTAMPS MUST BE IN MM:SS FORMAT (Minutes:Seconds) - Never use HH:MM:SS format
- Each prompt MUST include MANDATORY instructions to ALWAYS return valid JSON even if events cannot be detected
- Prompts must instruct to return empty events arrays (not empty text) when metric is undetectable
- Prompts should be specific and detailed enough to get accurate counts
- Do NOT include generic metrics - only what you can actually count from THIS video
- Return 3-5 metrics maximum (including Score)
- The "total" field should sum up all event values for that player`;
};

/**
 * Clip Analysis Prompt
 * Used in: server/videoAnalysisService.ts - analyzeVideoClip()
 */
export const getClipAnalysisPrompt = (
  sportConfig: SportConfig,
  whatToAnalyze: string,
  language: string
) => {
  return `You are an expert ${sportConfig.name} coach and performance analyst with extensive experience in professional training and technique optimization. 
Analyze this video clip based on the user's specific request and provide detailed, actionable coaching advice.

User's Request: ${whatToAnalyze}

Sport: ${sportConfig.name}
Key Technical Elements: ${sportConfig.primaryActions.join(', ')}

IMPORTANT: Skip all introductory sentences and preambles. Do not start with phrases like "Of course", "As a coach", "I can provide", etc. Start directly with the analysis content.

Please provide a comprehensive coaching analysis that:
1. Directly addresses the user's specific question or concern
2. Identifies what each person is doing correctly (strengths and good fundamentals)
3. Points out specific technical areas that need improvement
4. Provides actionable steps and drills to improve their technique
5. Compares their technique to professional standards and best practices
6. Includes any safety considerations or injury prevention tips
7. Suggests specific exercises, drills, or training methods to develop the skills shown
8. If analyzing multiple people, provide individual feedback for each person

${language === 'arabic' ? 'Please provide the entire analysis in Arabic.' : 'Please provide the analysis in English.'}

Be specific, detailed, and constructive. Focus on practical coaching advice that can be immediately applied.
Use your expertise in ${sportConfig.name} to provide comprehensive technical guidance based on professional standards and training methodologies.`;
};

/**
 * Video Advice/Recommendations Prompt
 * Used in: server/videoAnalysisService.ts
 */
export const getVideoAdvicePrompt = (
  sportConfig: SportConfig,
  roundText: string,
  language: string
) => {
  const languageInstruction = language === 'arabic' 
    ? `Write your response in Arabic (العربية).`
    : `Write your response in English.`;

  return `Analyze ${roundText} of this ${sportConfig.name.toLowerCase()} match and provide detailed improvement advice for each player. Focus on tactical, technical, and mental aspects.

${languageInstruction}

Return this EXACT JSON format:
{
  "players": [
    {
      "name": "Actual Player Name",
      "advice": [
        {
          "category": "Technical" or "Tactical" or "Mental" or "Physical",
          "recommendation": "Specific actionable advice",
          "priority": "High" or "Medium" or "Low",
          "reasoning": "Why this is important"
        }
      ]
    }
  ]
}

For EACH player provide:
1. **Technical Advice**: Specific technique improvements
2. **Tactical Advice**: Strategy and decision-making improvements
3. **Mental Advice**: Psychological and competitive mindset improvements
4. **Physical Advice**: Conditioning or physical attribute recommendations

Prioritize advice based on impact on performance. Be specific and actionable.`;
};

// ============================================================================
// SELENIUM/WEB SCRAPING PROMPTS (GPT + Gemini)
// ============================================================================

/**
 * Athlete Category Discovery Prompt
 * Used in: server/seleniumGPTService.ts - discoverAthleteCategory()
 */
export const getCategoryDiscoveryPrompt = (
  athleteName: string,
  country: string,
  sport: string
) => {
  return `Find ALL categories/divisions that ${athleteName} from ${country} currently competes in or has competed in within the past 2 seasons for ${sport}.

CRITICAL: Extract EVERY category/weight class the athlete competes in. Many athletes compete in multiple categories.

For different sports, categories include:
- Taekwondo/Boxing/Wrestling: Weight category (e.g., "M-58kg", "F-49kg", "-74kg", "-80kg")
- Fencing: Weapon type (e.g., "Épée", "Foil", "Sabre")
- Judo: Weight class (e.g., "-73kg", "+100kg")
- Track & Field: Event specialization (e.g., "100m", "Long Jump")
- Swimming: Stroke/distance (e.g., "100m Freestyle", "200m Butterfly")

SEARCH REQUIREMENTS:
1. Check official federation websites
2. Look at recent competition entries
3. Find results from last 2 years
4. Identify ALL weight classes or categories they've competed in

Return ONLY a valid JSON array of category strings.

Examples:
- Single category: ["M-58kg"]
- Multiple categories: ["-74kg", "-80kg"]
- Fencing: ["Épée"]
- Multiple weapons: ["Épée", "Foil"]

If no specific categories found, return: []

DO NOT return generic categories like "Senior" or "Elite". Only return specific weight classes, weapon types, or event specializations.`;
};

// ============================================================================
// EXPORT ALL PROMPT FUNCTIONS
// ============================================================================

export default {
  // OpenAI Service
  getImageSearchPrompt,
  getBiographyPrompt,
  getPersonalInfoPrompt,
  getStrengthsPrompt,
  getDevelopmentPlanPrompt,
  getRankHistoryPrompt,
  getComparisonOverviewPromptGPT,
  getStatisticsPrompt,
  
  // Gemini Service - Nutrition & Analysis
  getNutritionWeekPrompt,
  getComparisonOverviewPromptGemini,
  getStrengthsComparisonPromptGemini,
  getWeaknessesComparisonPromptGemini,
  getCompetitionHistoryPromptGemini,
  getHeadToHeadPromptGemini,
  getPersonalInfoPromptGemini,
  getImageSearchPromptGemini,
  
  // Video Analysis
  generateVideoAnalysisPrompts,
  getMetricDiscoveryPrompt,
  getClipAnalysisPrompt,
  getVideoAdvicePrompt,
  
  // Web Scraping
  getCategoryDiscoveryPrompt
};
