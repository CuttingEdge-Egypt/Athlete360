import fetch from 'node-fetch';

// Individual sports ranking sites JSON
const RANKING_SITES = {
  "Athletics": {
    "organization": "World Athletics",
    "ranking_url": "https://worldathletics.org/world-rankings/introduction",
    "note": "World Athletics publishes World Rankings for events"
  },
  "Taekwondo": {
    "organization": "World Taekwondo",
    "ranking_url": "https://www.worldtaekwondo.org/ranking/ranking.html",
    "note": "Olympic kyorugi weight-category rankings"
  },
  "Wrestling": {
    "organization": "United World Wrestling (UWW)",
    "ranking_url": "https://uww.org/athletes-results",
    "note": "UWW site includes athlete results and ranking by style / weight class"
  },
  "Judo": {
    "organization": "International Judo Federation (IJF)",
    "ranking_url": "https://www.ijf.org/wrl",
    "note": "IJF World Ranking List page"
  },
  "Fencing": {
    "organization": "FIE (Fédération Internationale d'Escrime)",
    "ranking_url": "https://fie.org/athletes",
    "note": "FIE athlete pages often show ranking by weapon"
  },
  "Karate": {
    "organization": "World Karate Federation (WKF)",
    "ranking_url": "https://www.wkf.net/ranking",
    "note": "WKF maintains kumite / kata rankings"
  },
  "Badminton": {
    "organization": "BWF (Badminton World Federation)",
    "ranking_url": "https://bwfworldtour.bwfbadminton.com/rankings/",
    "note": "Official BWF world rankings page"
  },
  "Tennis": {
    "organization": "ATP / WTA",
    "ranking_url": "https://www.atptour.com/en/rankings/singles",
    "note": "ATP ranking for men; WTA for women (similar structure)"
  },
  "Table Tennis": {
    "organization": "ITTF",
    "ranking_url": "https://www.ittf.com/rankings",
    "note": "ITTF publishes world rankings for players"
  },
  "Squash": {
    "organization": "PSA (Professional Squash Association)",
    "ranking_url": "https://psaworldtour.com/rankings",
    "note": "PSA world ranking list"
  },
  "Archery": {
    "organization": "World Archery Federation",
    "ranking_url": "https://worldarchery.sport/world-archery-rankings",
    "note": "World Archery's ranking pages for recurve / compound etc"
  },
  "Boxing": {
    "organization": "IBA (International Boxing Association)",
    "ranking_url": "https://www.iba.sport/rankings",
    "note": "IBA maintains rankings by weight division"
  },
  "Swimming": {
    "organization": "World Aquatics",
    "ranking_url": "https://www.worldaquatics.com/rankings",
    "note": "World Aquatics publishes performance rankings by event"
  }
};

interface RankingCategory {
  category: string;
  rank: string;
  totalAthletes?: string;
  points?: string;
  lastUpdated?: string;
}

interface AthleteRankings {
  categories?: RankingCategory[];
  source?: string;
  fetchedAt?: string;
}

/**
 * Combined ranking and competitive history response
 */
interface RankAndHistoryResponse {
  rankings: AthleteRankings;
  competitiveHistory?: {
    career_phases?: Array<{
      phase_name: string;
      period: string;
      key_achievements: Array<{
        year: number;
        month?: string;
        event_name: string;
        event_tier: string;
        result: string;
        notes: string;
      }>;
    }>;
    [key: string]: any; // Allow model to add extra fields
  };
}

export async function fetchAthleteRankings(
  athleteName: string,
  country: string,
  sport: string
): Promise<AthleteRankings | null> {
  const apiKey = process.env.BROWSERUSE_API;
  
  if (!apiKey) {
    console.error('❌ BROWSERUSE_API not found in environment');
    return null;
  }

  console.log(`🏆 Fetching rankings for ${athleteName} (${sport}, ${country}) using BrowserUse...`);

  try {
    // Get the ranking site info for the sport (if available)
    const sportInfo = RANKING_SITES[sport as keyof typeof RANKING_SITES];
    const rankingSiteInfo = sportInfo 
      ? `Use the official ranking site: ${sportInfo.ranking_url} (${sportInfo.organization})`
      : `Search for official ranking sites for ${sport}`;

    // Construct the task prompt for BrowserUse
    const taskPrompt = `
Give me the rank of ${athleteName}, the ${country} player who plays ${sport}. 
If the player is ranked in multiple categories mention his rank in every category. 
${rankingSiteInfo}
Use player search on the official ranking sites of the sport.

Return ONLY a JSON object in this exact format:
{
  "success": true,
  "categories": [
    {
      "category": "Overall" or specific category name (e.g., "Men's Singles", "-73kg", "Recurve"),
      "rank": "current ranking number",
      "totalAthletes": "total number of ranked athletes in this category (if available)",
      "points": "ranking points (if available)",
      "lastUpdated": "date of last ranking update (if available)"
    }
  ],
  "source": "name of the ranking organization or website",
  "error": null
}

If the player is not found or not ranked, return:
{
  "success": false,
  "categories": [],
  "source": null,
  "error": "Player not found in rankings"
}
`;

    // Define the structured output JSON schema
    const structuredOutputSchema = {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "categories": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "category": { "type": "string" },
              "rank": { "type": "string" },
              "totalAthletes": { "type": "string" },
              "points": { "type": "string" },
              "lastUpdated": { "type": "string" }
            },
            "required": ["category", "rank"]
          }
        },
        "source": { "type": "string" },
        "error": { "type": ["string", "null"] }
      },
      "required": ["success"]
    };

    // Call BrowserUse API
    console.log(`📤 Sending BrowserUse request for ${athleteName}...`);
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: taskPrompt,
        llm_model: 'o3',
        structured_output_json: JSON.stringify(structuredOutputSchema)
      })
    });

    console.log(`📥 BrowserUse response status for ${athleteName}: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ BrowserUse API error for ${athleteName}: ${response.status} - ${errorText}`);
      return null;
    }

    const taskResponse = await response.json() as any;
    console.log(`🔍 BrowserUse task created for ${athleteName}:`, JSON.stringify(taskResponse, null, 2));

    // BrowserUse returns a task ID - we need to poll for the result
    const taskId = taskResponse.id;
    if (!taskId) {
      console.error(`❌ No task ID returned from BrowserUse for ${athleteName}`);
      return null;
    }

    console.log(`⏳ Polling for task result: ${taskId}...`);

    // Poll for task completion (max 60 seconds)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    let attempts = 0;
    let taskResult = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
      attempts++;

      try {
        const statusResponse = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!statusResponse.ok) {
          console.error(`❌ Failed to get task status for ${athleteName}: ${statusResponse.status}`);
          continue;
        }

        const statusData = await statusResponse.json() as any;
        console.log(`📊 Task status (attempt ${attempts}):`, statusData.status);

        if (statusData.status === 'finished' || statusData.status === 'completed') {
          taskResult = statusData;
          console.log(`✅ Task completed for ${athleteName}:`, JSON.stringify(taskResult, null, 2));
          break;
        } else if (statusData.status === 'failed' || statusData.status === 'stopped') {
          console.error(`❌ Task ${statusData.status} for ${athleteName}`);
          return null;
        } else {
          console.log(`⏳ Task still running (attempt ${attempts}/${maxAttempts})...`);
        }
      } catch (pollError) {
        console.error(`❌ Error polling task status for ${athleteName}:`, pollError);
      }
    }

    if (!taskResult) {
      console.error(`❌ Task timed out for ${athleteName} after ${maxAttempts} attempts`);
      return null;
    }

    // Extract the ranking data from the task result
    let rankingData;
    try {
      // The result should be in the output or result field
      const output = taskResult.output || taskResult.result;
      
      if (typeof output === 'string') {
        // Try to parse as JSON
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          rankingData = JSON.parse(jsonMatch[0]);
        } else {
          rankingData = JSON.parse(output);
        }
      } else if (typeof output === 'object') {
        rankingData = output;
      } else {
        console.error(`❌ Unexpected output format for ${athleteName}:`, output);
        return null;
      }
    } catch (parseError) {
      console.error(`❌ Failed to parse task result for ${athleteName}:`, parseError);
      console.log(`Raw task result:`, taskResult);
      return null;
    }

    console.log(`📊 Parsed ranking data for ${athleteName}:`, rankingData);
    
    if (!rankingData || !rankingData.success) {
      console.log(`⚠️ No rankings found for ${athleteName}. Ranking data:`, rankingData);
      return null;
    }

    // Format the response
    const rankings: AthleteRankings = {
      categories: rankingData.categories || [],
      source: rankingData.source || 'BrowserUse Search',
      fetchedAt: new Date().toISOString()
    };

    console.log(`✅ Successfully fetched rankings for ${athleteName}:`, rankings);
    return rankings;

  } catch (error) {
    console.error('❌ Error fetching athlete rankings:', error);
    return null;
  }
}

/**
 * Fetch rank AND competitive history for Taekwondo athletes
 */
export async function fetchTaekwondoRankAndHistory(
  athleteName: string,
  country: string,
  category?: string
): Promise<RankAndHistoryResponse | null> {
  const apiKey = process.env.BROWSERUSE_API;
  
  if (!apiKey) {
    console.error('❌ BROWSERUSE_API not found in environment');
    return null;
  }

  console.log(`🌐 BrowserUse: Fetching rank and competitive history for ${athleteName} (${country}, ${category || 'unknown category'})`);

  const taskPrompt = `
You are a rank and competitive history extractor for Taekwondo players.

Find the competitive history and current rank of the Taekwondo player:
${athleteName}.

They play for ${country}${category ? ` and compete in the ${category} category.` : '.'}
Make sure you select the correct category on the World Taekwondo site:
https://worldtkd.simplycompete.com/playerRankingV2

Instructions to navigate the site:
1. Select weight category (most important) - DO NOT type into the weight category field, only select from the available dropdown options
2. Write name
3. Click search
4. Click player profile
5. Fetch info

IMPORTANT: 
- If the weight category doesn't exist in the dropdown, try selecting "World Kyorugi Rankings" instead of Olympic, and you should find the weight category there.
- Don't type into the weight category, only select from the available options.
- If simply compete link for taekwondo didn't work, then either reload the link again or visit the world taekwondo page.
- Stay persistent with World Taekwondo Site even if it doesn't load sometimes, refresh the page, revisit the site but stay with the world taekwondo site until you extract the proper ranking.
- Sometimes site won't load simply compete site won't load properly. if so, refresh page or revisit page until it loads properly, stay persistent with simply compete site until intended data is extracted.

Extract:
- Current World Rank and Olympic rank
- Ranking Points
- List of the most recent competitions (name, date, position) and finish in each competition.
- List competitions from most recent to older.

COMPETITIVE HISTORY PRIORITY INSTRUCTIONS:
When displaying results for competitive history, PRIORITIZE results found in Simply Compete site. After extracting data from Simply Compete, google the player and visit their taekwondodata profile (should appear in search). When you get to taekwondodata and extract more results from there, ADD these results from taekwondodata onto what you got from Simply Compete for a comprehensive competitive history. The Simply Compete results should be your primary source, and taekwondodata results supplement them.

Return the data in this JSON format:
{
  "rankings": {
    "categories": [
      {
        "category": "Category name with full details (e.g., 'M-54 kg | World Senior Division | World Kyorugi Rankings')",
        "rank": "rank number",
        "points": "ranking points",
        "totalAthletes": "total athletes in category (if available)"
      }
    ],
    "source": "World Taekwondo",
    "fetchedAt": "current timestamp"
  },
  "competitiveHistory": {
    "career_phases": [
      {
        "phase_name": "Phase name (e.g., 'Recent Competitions 2024-2025', 'Breakthrough Period 2020-2023')",
        "period": "YYYY-YYYY or specific period",
        "key_achievements": [
          {
            "year": 2024,
            "month": "March",
            "event_name": "Competition name",
            "event_tier": "Competition tier (e.g., 'Grand Prix', 'World Championship', 'Olympic Games')",
            "result": "Medal/placement result (e.g., 'Gold Medal', 'Bronze Medal', '5th place')",
            "notes": "Additional context about the achievement"
          }
        ]
      }
    ]
  }
}

CRITICAL REQUIREMENTS - PREVENT HALLUCINATION:
1. ONLY return competitions and results that you ACTUALLY FOUND on the websites you visited
2. DO NOT add competitions or results that were NOT shown in your search
3. DO NOT invent or guess competition names, dates, or results
4. If you cannot find competition history, return an empty career_phases array []
5. Each competition MUST be verified from the actual website content you see
6. If a website doesn't load or data is unavailable, DO NOT make up data - return what you found or empty arrays

IMPORTANT: List all competitions from most recent to oldest. Only include competitions you actually see on the websites.
`;

  // Define structured output schema for BrowserUse
  const structuredOutputSchema = {
    type: "object",
    properties: {
      rankings: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                rank: { type: "string" },
                points: { type: "string" },
                totalAthletes: { type: "string" }
              },
              required: ["category", "rank"]
            }
          },
          source: { type: "string" },
          fetchedAt: { type: "string" }
        },
        required: ["categories", "source", "fetchedAt"]
      },
      competitiveHistory: {
        type: "object",
        properties: {
          career_phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase_name: { type: "string" },
                period: { type: "string" },
                key_achievements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      year: { type: "number" },
                      month: { type: "string" },
                      event_name: { type: "string" },
                      event_tier: { type: "string" },
                      result: { type: "string" },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    required: ["rankings"]
  };

  try {
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: taskPrompt,
        llm_model: 'o3',
        structured_output_json: JSON.stringify(structuredOutputSchema)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ BrowserUse API error: ${response.status} - ${errorText}`);
      return null;
    }

    const taskData = await response.json() as any;
    const taskId = taskData.id;
    
    console.log(`✅ BrowserUse task created for ${athleteName}: ${taskId}`);
    console.log(`🔗 Live preview: ${taskData.live_url || 'N/A'}`);
    
    // Poll for completion
    const result = await pollTaskCompletion(apiKey, taskId, athleteName);
    
    if (!result) {
      return null;
    }

    return parseRankAndHistoryOutput(result);
  } catch (error) {
    console.error(`❌ Error fetching Taekwondo data for ${athleteName}:`, error);
    return null;
  }
}

/**
 * Fetch rank AND competitive history for general sports athletes
 */
export async function fetchGeneralSportRankAndHistory(
  athleteName: string,
  country: string,
  sport: string,
  category?: string
): Promise<RankAndHistoryResponse | null> {
  const apiKey = process.env.BROWSERUSE_API;
  
  if (!apiKey) {
    console.error('❌ BROWSERUSE_API not found in environment');
    return null;
  }

  console.log(`🌐 BrowserUse: Fetching info for ${athleteName} (${country}, ${sport}, ${category || 'unknown category'})`);

  const taskPrompt = `
Fetch me the rank and competitive history for the player ${athleteName} the ${country} ${sport} player${category ? ` who competes in the ${category} category` : ''}.

If it's a team sport and it doesn't have rank or competitive history for the player then fetch all the info and stats you can about the player.

Simply google the player and even go to unofficial sites that contain info about the player.

Return the data in this JSON format:
{
  "rankings": {
    "categories": [
      {
        "category": "Ranking category (if applicable, e.g., 'World Ranking', 'ATP Singles')",
        "rank": "rank number (if applicable)",
        "points": "ranking points (if applicable)",
        "totalAthletes": "total athletes in category (if available)"
      }
    ],
    "source": "Source of ranking data",
    "fetchedAt": "current timestamp"
  },
  "competitiveHistory": {
    "career_phases": [
      {
        "phase_name": "Phase name (e.g., 'Recent Competitions 2024-2025', 'Career Highlights')",
        "period": "YYYY-YYYY or specific period",
        "key_achievements": [
          {
            "year": 2024,
            "month": "March",
            "event_name": "Competition/match name",
            "event_tier": "Competition tier or league name",
            "result": "Result/performance",
            "notes": "Additional context"
          }
        ]
      }
    ]
  },
  "additionalStats": {
    // Add any extra statistics or information found about the player
  }
}

CRITICAL REQUIREMENTS - PREVENT HALLUCINATION:
1. ONLY return competitions, stats, and results that you ACTUALLY FOUND on the websites you visited
2. DO NOT add data that was NOT shown in your search results
3. DO NOT invent or guess competition names, dates, results, or statistics
4. If you cannot find competition history, return an empty career_phases array []
5. Each piece of data MUST be verified from the actual website content you see
6. If a website doesn't load or data is unavailable, DO NOT make up data - return what you found or empty arrays

IMPORTANT: 
- Prioritize rank and competitive history for individual sport players
- List all competitions from most recent to oldest
- For team sports without rankings, include player statistics and career highlights
- Only include information you actually found on websites - NO HALLUCINATION
`;

  // Define structured output schema for BrowserUse
  const structuredOutputSchema = {
    type: "object",
    properties: {
      rankings: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                rank: { type: "string" },
                points: { type: "string" },
                totalAthletes: { type: "string" }
              },
              required: ["category", "rank"]
            }
          },
          source: { type: "string" },
          fetchedAt: { type: "string" }
        },
        required: ["categories", "source", "fetchedAt"]
      },
      competitiveHistory: {
        type: "object",
        properties: {
          career_phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase_name: { type: "string" },
                period: { type: "string" },
                key_achievements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      year: { type: "number" },
                      month: { type: "string" },
                      event_name: { type: "string" },
                      event_tier: { type: "string" },
                      result: { type: "string" },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    required: ["rankings"]
  };

  try {
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: taskPrompt,
        llm_model: 'o3',
        structured_output_json: JSON.stringify(structuredOutputSchema)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ BrowserUse API error: ${response.status} - ${errorText}`);
      return null;
    }

    const taskData = await response.json() as any;
    const taskId = taskData.id;
    
    console.log(`✅ BrowserUse task created for ${athleteName}: ${taskId}`);
    console.log(`🔗 Live preview: ${taskData.live_url || 'N/A'}`);
    
    // Poll for completion
    const result = await pollTaskCompletion(apiKey, taskId, athleteName);
    
    if (!result) {
      return null;
    }

    return parseRankAndHistoryOutput(result);
  } catch (error) {
    console.error(`❌ Error fetching general sport data for ${athleteName}:`, error);
    return null;
  }
}

/**
 * Poll for task completion (no timeout - waits until task finishes)
 */
async function pollTaskCompletion(
  apiKey: string,
  taskId: string,
  athleteName: string
): Promise<any | null> {
  const startTime = Date.now();
  const pollInterval = 3000; // Poll every 3 seconds

  while (true) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      // Try fetching full task data instead of just status
      const taskResponse = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!taskResponse.ok) {
        console.error(`❌ Failed to fetch task data: ${taskResponse.status}`);
        continue;
      }

      const taskData = await taskResponse.json() as any;
      const taskStatus = taskData.status;
      
      console.log(`⏳ Task status: ${taskStatus} for ${athleteName}... (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);

      if (taskStatus === 'finished' || taskStatus === 'completed') {
        console.log(`✅ BrowserUse task completed for ${athleteName}`);
        console.log(`📊 Full BrowserUse task result for ${athleteName}:`, JSON.stringify(taskData, null, 2));
        return taskData;
      } else if (taskStatus === 'failed' || taskStatus === 'stopped') {
        console.error(`❌ Task ${taskStatus} for ${athleteName}`);
        console.log(`📊 Failed task data:`, JSON.stringify(taskData, null, 2));
        return null;
      }
    } catch (error) {
      console.error(`❌ Error polling task:`, error);
    }
  }
}

/**
 * Parse task output into rank and history structure
 */
function parseRankAndHistoryOutput(taskResult: any): RankAndHistoryResponse | null {
  try {
    // First, check if BrowserUse returned structured_output (preferred)
    if (taskResult.structured_output) {
      console.log('✅ Using structured_output from BrowserUse');
      const parsed = taskResult.structured_output;
      return {
        rankings: parsed.rankings || { categories: [], source: 'BrowserUse', fetchedAt: new Date().toISOString() },
        competitiveHistory: parsed.competitiveHistory || undefined
      };
    }

    // Fallback: try to parse the raw output field
    const output = taskResult.output || taskResult.result;
    
    if (!output) {
      console.error('❌ No output or structured_output in task result');
      return null;
    }

    if (typeof output === 'string') {
      // Try to parse as JSON directly
      try {
        const parsed = JSON.parse(output);
        return {
          rankings: parsed.rankings || { categories: [], source: 'BrowserUse', fetchedAt: new Date().toISOString() },
          competitiveHistory: parsed.competitiveHistory || undefined
        };
      } catch (e) {
        // If output is not pure JSON, try to extract JSON from text
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              rankings: parsed.rankings || { categories: [], source: 'BrowserUse', fetchedAt: new Date().toISOString() },
              competitiveHistory: parsed.competitiveHistory || undefined
            };
          } catch (e2) {
            console.error('Failed to parse extracted JSON:', e2);
          }
        }
      }
    } else if (typeof output === 'object') {
      // Output is already an object
      return {
        rankings: output.rankings || { categories: [], source: 'BrowserUse', fetchedAt: new Date().toISOString() },
        competitiveHistory: output.competitiveHistory || undefined
      };
    }
    
    console.warn('Could not parse BrowserUse output as JSON');
    return null;
  } catch (error) {
    console.error('❌ Error in parseRankAndHistoryOutput:', error);
    return null;
  }
}

/**
 * Fetch player info for team sports athletes (stats, competitions, recent performances)
 */
export async function fetchTeamSportPlayerInfo(
  athleteName: string,
  country: string,
  sport: string,
  personalInfo?: any
): Promise<RankAndHistoryResponse | null> {
  const apiKey = process.env.BROWSERUSE_API;
  
  if (!apiKey) {
    console.error('❌ BROWSERUSE_API not found in environment');
    return null;
  }

  console.log(`⚽ BrowserUse: Fetching team sport info for ${athleteName} (${country}, ${sport})`);

  // Build personal info summary
  const personalInfoSummary = personalInfo 
    ? `Personal Info: ${JSON.stringify(personalInfo)}` 
    : 'No additional personal info available';

  const taskPrompt = `
Search for all the info you can find on ${athleteName}, they are from ${country}, and they play ${sport}, and this is the personal info we have on the player: ${personalInfoSummary}. 

Figure out their main stats, the competitions they participated in, and their most recent performances in matches. 

Use official and unofficial sites, prioritize unofficial sites like Wikipedia, sports databases, news articles, and fan sites.

Return the data in this JSON format:
{
  "rankings": {
    "categories": [],
    "source": "Team sport - no individual rankings",
    "fetchedAt": "current timestamp"
  },
  "competitiveHistory": {
    "career_phases": [
      {
        "phase_name": "Phase name (e.g., 'Recent Matches 2024-2025', '2023-2024 Season', 'Career Highlights')",
        "period": "YYYY-YYYY or specific period",
        "key_achievements": [
          {
            "year": 2024,
            "month": "March",
            "event_name": "Competition/match/tournament name",
            "event_tier": "League/tournament tier (e.g., 'Olympic Games', 'World Championship', 'National League', 'Club Match')",
            "result": "Result/performance (e.g., 'Won 3-1', 'Silver Medal', 'Scored 2 goals')",
            "notes": "Additional context about performance or team"
          }
        ]
      }
    ]
  },
  "playerStats": {
    "team": "Current team/club",
    "position": "Playing position",
    "careerStats": "Key career statistics (goals, assists, matches played, etc.)",
    "recentPerformance": "Recent performance highlights"
  }
}

CRITICAL REQUIREMENTS - PREVENT HALLUCINATION:
1. ONLY return competitions, stats, and results that you ACTUALLY FOUND on the websites you visited
2. DO NOT add data that was NOT shown in your search results
3. DO NOT invent or guess competition names, dates, results, or statistics
4. If you cannot find competition history, return an empty career_phases array []
5. Each piece of data MUST be verified from the actual website content you see
6. If a website doesn't load or data is unavailable, DO NOT make up data - return what you found or empty arrays

IMPORTANT FOR TEAM SPORTS:
- Focus on individual player stats and achievements within the team context
- Include match performances, goals/points scored, tournament participations
- List competitions chronologically from most recent to oldest
- Include both team achievements (championships won) and individual contributions
- Only include information you actually found on websites - NO HALLUCINATION
`;

  // Define structured output schema for team sports
  const structuredOutputSchema = {
    type: "object",
    properties: {
      rankings: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                rank: { type: "string" }
              }
            }
          },
          source: { type: "string" },
          fetchedAt: { type: "string" }
        },
        required: ["categories", "source", "fetchedAt"]
      },
      competitiveHistory: {
        type: "object",
        properties: {
          career_phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase_name: { type: "string" },
                period: { type: "string" },
                key_achievements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      year: { type: "number" },
                      month: { type: "string" },
                      event_name: { type: "string" },
                      event_tier: { type: "string" },
                      result: { type: "string" },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      playerStats: {
        type: "object",
        properties: {
          team: { type: "string" },
          position: { type: "string" },
          careerStats: { type: "string" },
          recentPerformance: { type: "string" }
        }
      }
    },
    required: ["rankings", "competitiveHistory"]
  };

  try {
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: taskPrompt,
        llm_model: 'o3',
        structured_output_json: JSON.stringify(structuredOutputSchema)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ BrowserUse API error: ${response.status} - ${errorText}`);
      return null;
    }

    const taskData = await response.json() as any;
    const taskId = taskData.id;
    
    console.log(`✅ BrowserUse task created for ${athleteName}: ${taskId}`);
    console.log(`🔗 Live preview: ${taskData.live_url || 'N/A'}`);
    
    // Poll for completion
    const result = await pollTaskCompletion(apiKey, taskId, athleteName);
    
    if (!result) {
      return null;
    }

    return parseRankAndHistoryOutput(result);
  } catch (error) {
    console.error(`❌ Error fetching team sport data for ${athleteName}:`, error);
    return null;
  }
}

// Helper function to determine if a sport is individual
export function isIndividualSport(sportName: string): boolean {
  // List of team sports that should be excluded
  const teamSports = [
    'Football', 'Soccer', 'Basketball', 'Volleyball', 'Handball', 
    'Rugby', 'Cricket', 'Baseball', 'Softball', 'Hockey', 
    'Field Hockey', 'Ice Hockey', 'Water Polo', 'American Football',
    'Lacrosse', 'Netball', 'Australian Football', 'Gaelic Football'
  ];
  
  // Check if the sport is in the team sports list (case-insensitive)
  return !teamSports.some(teamSport => 
    sportName.toLowerCase().includes(teamSport.toLowerCase())
  );
}