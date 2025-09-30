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

export async function fetchAthleteRankings(
  athleteName: string,
  country: string,
  sport: string
): Promise<AthleteRankings | null> {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ BROWSER_USE_API_KEY not found in environment');
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