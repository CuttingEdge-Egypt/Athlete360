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
  worldRank?: string;
  currentRecord?: string;
}

// Enhanced function to get taekwondo-specific data from TaekwondoData.com
async function getTaekwondoDataInfo(athleteName: string, nationality?: string): Promise<{worldRank: string, currentRecord: string}> {
  try {
    console.log(`Fetching TaekwondoData info for ${athleteName}...`);
    
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
    console.log(`Searching TaekwondoData for ranking: ${searchUrl}`);
    
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
    
    // Try to extract ranking and record data from the first matching profile
    for (const profileUrl of profileLinks.slice(0, 2)) { // Check up to 2 profiles
      try {
        console.log(`Checking profile for data: ${profileUrl}`);
        const profileResponse = await fetch(profileUrl);
        const profileHtml = await profileResponse.text();
        
        let worldRank = "N/A";
        let currentRecord = "N/A";
        
        // Extract world ranking information
        const rankingMatch = profileHtml.match(/(?:world\s*ranking|ranking)\s*[:\-]?\s*(?:#\s*)?(\d+|N\/A)/i);
        if (rankingMatch) {
          worldRank = rankingMatch[1] === 'N/A' ? 'N/A' : `#${rankingMatch[1]}`;
        }
        
        // Extract career record from bouts statistics
        const boutsMatch = profileHtml.match(/(\d+)\s*bouts?\s*(?:with|,)\s*(\d+)\s*wins?\s*(?:\((\d+(?:\.\d+)?)%[^)]*\))?/i);
        if (boutsMatch) {
          const totalBouts = boutsMatch[1];
          const wins = boutsMatch[2];
          const winPercentage = boutsMatch[3] ? `${boutsMatch[3]}%` : Math.round((parseInt(wins) / parseInt(totalBouts)) * 100) + '%';
          currentRecord = `${wins}-${parseInt(totalBouts) - parseInt(wins)} (${winPercentage})`;
        }
        
        // Alternative: Look for win/loss record in different format
        if (currentRecord === "N/A") {
          const recordMatch = profileHtml.match(/(\d+)\s*wins?\s*(?:and|,)\s*(\d+)\s*losses?/i);
          if (recordMatch) {
            const wins = recordMatch[1];
            const losses = recordMatch[2];
            const totalBouts = parseInt(wins) + parseInt(losses);
            const winPercentage = Math.round((parseInt(wins) / totalBouts) * 100);
            currentRecord = `${wins}-${losses} (${winPercentage}%)`;
          }
        }
        
        console.log(`Extracted TaekwondoData info: Rank=${worldRank}, Record=${currentRecord}`);
        return { worldRank, currentRecord };
        
      } catch (error) {
        console.log(`Error checking profile ${profileUrl} for data:`, error);
        continue;
      }
    }
    
    console.log(`No ranking/record data found for ${athleteName} on TaekwondoData.com`);
    return { worldRank: "N/A", currentRecord: "N/A" };
    
  } catch (error) {
    console.error(`Error fetching TaekwondoData info for ${athleteName}:`, error);
    return { worldRank: "N/A", currentRecord: "N/A" };
  }
}

export async function generateAthleteBiography(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  // Check if this is a taekwondo athlete for enhanced data extraction
  const isTaekwondo = sport.toLowerCase() === 'taekwondo';
  
  // Add sport-specific data source guidance for taekwondo athletes
  const sportSpecificGuidance = isTaekwondo 
    ? ' For taekwondo athletes, reference https://www.taekwondodata.com/ for accurate competition records, rankings, and athlete profiles.'
    : '';

  const prompt = `Today's date is ${currentDate}.
    
    Using web search capabilities, find factual, up-to-date information about the athlete "${name}"${nationalityContext}, who competes in ${sport}.
    
    Create a detailed biography structured with the following headings:
    - An introductory paragraph
    - Players' overall story and what they're known for in ${sport}.
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
      input: `${isTaekwondo ? 'For taekwondo athletes, use https://www.taekwondodata.com/ as your primary reference for competition records, rankings, and profiles. ' : ''}${prompt}

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

      // For taekwondo athletes, enhance with TaekwondoData.com specific ranking and record data
      if (isTaekwondo) {
        console.log(`Enhancing taekwondo data for ${name}...`);
        const taekwondoData = await getTaekwondoDataInfo(name, nationality);
        athleteData.worldRank = taekwondoData.worldRank;
        athleteData.currentRecord = taekwondoData.currentRecord;
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
    - Players' overall story and what they're known for in Taekwondo.
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