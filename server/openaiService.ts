import OpenAI from "openai";

// GPT-5 is now available and is the latest OpenAI model  
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to search for athlete profile picture from taekwondodata.com
async function searchTaekwondoDataProfilePicture(athleteName: string, nationality?: string): Promise<string | null> {
  try {
    console.log(`Searching for ${athleteName} profile picture on TaekwondoData.com...`);
    
    // Create search parameters
    const nameParts = athleteName.toLowerCase().split(' ');
    const firstName = nameParts[0] || '';
    const surname = nameParts.slice(1).join(' ') || '';
    
    // Prepare nation parameter for Egypt
    const nationParam = nationality?.toLowerCase().includes('egypt') ? 'Egypt' : '';
    
    // Make search request to taekwondodata.com
    const searchParams = new URLSearchParams({
      'surename': surname,
      'firstname': firstName,
      ...(nationParam && { 'nation': nationParam })
    });
    
    const searchUrl = `https://www.taekwondodata.com/person_searchresult.html?${searchParams}`;
    console.log(`Searching TaekwondoData: ${searchUrl}`);
    
    const response = await fetch(searchUrl);
    const searchHtml = await response.text();
    
    // Extract athlete profile links from search results
    const linkRegex = /href="([^"]*\.html)"/g;
    let match;
    const profileLinks = [];
    
    while ((match = linkRegex.exec(searchHtml)) !== null) {
      const link = match[1];
      if (link.includes(firstName.toLowerCase()) || link.includes(surname.toLowerCase().replace(' ', '-'))) {
        profileLinks.push(link.startsWith('http') ? link : `https://www.taekwondodata.com${link}`);
      }
    }
    
    // Try to find profile picture from the first matching profile
    for (const profileUrl of profileLinks.slice(0, 3)) { // Check up to 3 profiles
      try {
        console.log(`Checking profile: ${profileUrl}`);
        const profileResponse = await fetch(profileUrl);
        const profileHtml = await profileResponse.text();
        
        // Look for profile image in the athlete page
        const imageRegex = /<img[^>]*src="([^"]*)"[^>]*(?:alt="[^"]*profile[^"]*"|class="[^"]*profile[^"]*"|id="[^"]*profile[^"]*")/i;
        const imageMatch = imageRegex.exec(profileHtml);
        
        if (imageMatch) {
          let imageUrl = imageMatch[1];
          if (!imageUrl.startsWith('http')) {
            imageUrl = `https://www.taekwondodata.com${imageUrl}`;
          }
          
          // Validate the image URL
          const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
          if (imageResponse.ok && imageResponse.headers.get('content-type')?.startsWith('image/')) {
            console.log(`Found valid profile image: ${imageUrl}`);
            return imageUrl;
          }
        }
      } catch (error) {
        console.log(`Error checking profile ${profileUrl}:`, error);
        continue;
      }
    }
    
    console.log(`No profile image found for ${athleteName} on TaekwondoData.com`);
    return null;
    
  } catch (error) {
    console.error(`Error searching TaekwondoData for ${athleteName}:`, error);
    return null;
  }
}

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

IMPORTANT: Do not include any links, URLs, citations, or references in your response. Provide clean text without any reference links or citations.

    Provide the response as a JSON object with these fields:
    - name: athlete's full name
    - bio: the detailed biography without any links or citations
    - rank: current world ranking if available (as number or "N/A")
    - achievements: array of key achievements
    - recentNews: array of recent news or competition results
    
    ${sportSpecificGuidance}
    `;

  try {
    // Use GPT-5 with web search capabilities using responses.create()
    const response = await openai.responses.create({
      model: "gpt-5", // Using GPT-5 as requested by the user
      input: `${isEgyptianTaekwondo ? 'For Egyptian taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference for competition records, rankings, and profiles. ' : ''}${prompt}

Please respond in valid JSON format with these exact fields:
{
  "name": "athlete's full name",
  "bio": "detailed biography without any links or citations",
  "rank": "current world ranking or N/A",
  "achievements": ["array of key achievements"],
  "recentNews": ["array of recent news or competition results"]
}`,
      tools: [
        { type: "web_search_preview" }
      ],
      max_output_tokens: 8000
    });

    console.log("Full OpenAI Response:", JSON.stringify(response, null, 2));
    
    const content = response.output_text;
    if (!content) {
      console.log("OpenAI Response Details:", {
        output_text: response.output_text,
        usage: response.usage
      });
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

Don't include the references in the biography. 
    
    Create an updated biography with fresh information, structured as:
    - Introduction with current status
    - "Recent Competitions:" (2024-2025 results)
    - "Career Record and Rankings:" (current rankings and record)
    - "Notable Achievements:" (career highlights)

    Only mention information that is 100% accurate and verifiable.
    IMPORTANT: Do not include any links, URLs, citations, or references in your response. Provide clean text without any reference links or citations.
    
    Return as JSON with name, bio, rank, achievements, and recentNews fields.`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5", // Using GPT-5 as requested by the user
      input: `${prompt}

Please respond in valid JSON format with these exact fields:
{
  "name": "athlete's full name",
  "bio": "updated biography without any links or citations",
  "rank": "current world ranking or N/A", 
  "achievements": ["array of key achievements"],
  "recentNews": ["array of recent news or competition results"]
}`,
      tools: [
        { type: "web_search_preview" }
      ],
      max_output_tokens: 8000
    });

    console.log("Full OpenAI Refresh Response:", JSON.stringify(response, null, 2));
    
    const content = response.output_text;
    if (!content) {
      console.log("OpenAI Refresh Response Details:", {
        output_text: response.output_text,
        usage: response.usage
      });
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

// Export the taekwondo data search function for use in routes
export { searchTaekwondoDataProfilePicture };