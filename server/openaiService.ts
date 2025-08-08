import OpenAI from "openai";

// GPT-5 is now available and is the latest OpenAI model
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AthleteData {
  name: string;
  bio: string;
  rank?: number | string;
  achievements?: string[];
  recentNews?: string[];
}

export async function generateAthleteBiography(name: string, sport: string, nationality?: string): Promise<AthleteData> {
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

  const prompt = `Today's date is ${currentDate}.
    
    Using web search capabilities, find factual, up-to-date information about the athlete "${name}"${nationalityContext}, who competes in ${sport}.
    
    Create a detailed biography structured with the following headings:
    - An introductory paragraph
    - A heading "Recent Competitions:"
    - A heading "Career Record and Rankings:"
    - A heading "Notable Achievements:"

Only mention information that is 100% accurate and verifiable.
    
    Provide the response as a JSON object with these fields:
    - name: athlete's full name
    - bio: the detailed biography with proper headings and citations
    - rank: current world ranking if available (as number or "N/A")
    - achievements: array of key achievements
    - recentNews: array of recent news or competition results
    
    ${sportSpecificGuidance}
    `;

  try {
    // Use GPT-5 with web search capabilities
    const response = await openai.chat.completions.create({
      model: "gpt-5", // Using GPT-5 as requested by the user
      messages: [
        {
          role: "system",
          content: `You are a world-class ${sport} analyst with comprehensive knowledge of current performance data as of ${currentDate}. Use web search to find real-time information about athletes. ${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference for competition records, rankings, and profiles. ' : ''}Provide specific, factual, authentic information about athletes. NEVER use placeholder text or bracketed templates. Always respond in valid JSON format.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      tools: [
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web for current information about athletes, competitions, and sports data",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query for finding athlete information"
                }
              },
              required: ["query"]
            }
          }
        }
      ],
      tool_choice: "auto",
      max_completion_tokens: 2000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    try {
      const athleteData = JSON.parse(content) as AthleteData;
      
      // Validate required fields
      if (!athleteData.name || !athleteData.bio) {
        throw new Error("Missing required fields in OpenAI response");
      }

      // Ensure arrays are properly formatted
      athleteData.achievements = athleteData.achievements || [];
      athleteData.recentNews = athleteData.recentNews || [];

      // Handle rank conversion
      if (typeof athleteData.rank === 'string' && !isNaN(Number(athleteData.rank)) && athleteData.rank !== 'N/A') {
        athleteData.rank = Number(athleteData.rank);
      }

      return athleteData;
    } catch (parseError) {
      console.error(`❌ Error parsing OpenAI JSON response for ${name}:`, parseError);
      console.error(`❌ Raw response content:`, content);
      throw new Error(`Failed to parse OpenAI response for ${name}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error(`❌ Error generating OpenAI profile for ${name}:`, error);
    throw new Error(`Failed to generate OpenAI profile for ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Enhanced biography refresh function with web search
export async function refreshAthleteBiographyWithSearch(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  const prompt = `Today's date is ${currentDate}.
    
    Search the web for the most current information about athlete "${name}"${nationalityContext} in ${sport}. Focus on:
    - Recent competition results and rankings
    - Latest news and achievements
    - Current world ranking status
    - 2024-2025 season performance
    
    Create an updated biography with fresh information, structured as:
    - Introduction with current status
    - "Recent Competitions:" (2024-2025 results)
    - "Career Record and Rankings:" (current rankings and record)
    - "Notable Achievements:" (career highlights)

    Only mention information that is 100% accurate and verifiable.
    
    Return as JSON with name, bio, rank, achievements, and recentNews fields.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // Using GPT-5 as requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert sports analyst. Use web search to find the most current athlete information. Provide factual, up-to-date data with proper citations. Respond in valid JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      tools: [
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search for current athlete information and competition results",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query for current athlete data"
                }
              },
              required: ["query"]
            }
          }
        }
      ],
      tool_choice: "auto",
      max_completion_tokens: 2000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI refresh");
    }

    const athleteData = JSON.parse(content) as AthleteData;
    
    // Validate and format response
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