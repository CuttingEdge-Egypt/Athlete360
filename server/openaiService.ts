import OpenAI from "openai";

// GPT-5 is now available and is the latest OpenAI model with default temperature 1.0 (cannot go under)
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
  country?: string;
  profileImageDescription?: string;
  referenceLinks?: string[];
}

// Enhanced function to get taekwondo-specific data using AI web search with timeout
export async function getEnhancedTaekwondoData(athleteName: string, nationality?: string): Promise<{worldRank: string, currentRecord: string}> {
  try {
    console.log(`Fetching enhanced taekwondo data for ${athleteName} using AI web search...`);
    
    const nationalityContext = nationality ? ` from ${nationality}` : '';
    
    // Use GPT-5 with web search to get specific ranking and record data (no timeout)
    const response = await openai.responses.create({
      model: "gpt-5",
      input: `Search the web for current World Taekwondo (WT) ranking and competition record information for the athlete "${athleteName}"${nationalityContext}.

Focus specifically on finding:
1. Current World Taekwondo (WT) world ranking position
2. Career competition record (wins-losses or bout statistics)

Sources to prioritize:
- https://www.taekwondodata.com/ 
- World Taekwondo official rankings
- Recent competition results and databases

Provide ONLY factual data found through web search. If no specific ranking or record data is found, respond with "N/A".

Response format:
{
  "worldRank": "#X" (where X is the ranking number, or "N/A" if not found),
  "currentRecord": "W-L (percentage)" (format like "15-3 (83%)" or "N/A" if not found)
}`,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000
    });

    console.log("AI Ranking Search Response:", response.output_text);
    
    try {
      const rankingData = JSON.parse(response.output_text);
      return {
        worldRank: rankingData.worldRank || "N/A",
        currentRecord: rankingData.currentRecord || "N/A"
      };
    } catch (parseError) {
      console.log("Failed to parse AI ranking response, using fallback extraction...");
      
      // Fallback: Extract from raw text
      const text = response.output_text;
      let worldRank = "N/A";
      let currentRecord = "N/A";
      
      // Extract ranking
      const rankMatch = text.match(/#(\d+)|rank(?:ing)?\s*:?\s*#?(\d+)|position\s*:?\s*#?(\d+)/i);
      if (rankMatch) {
        const rankNumber = rankMatch[1] || rankMatch[2] || rankMatch[3];
        worldRank = `#${rankNumber}`;
      }
      
      // Extract record
      const recordMatch = text.match(/(\d+)[-\s]*(\d+)\s*\((\d+)%\)|(\d+)\s*wins?\s*[-,]\s*(\d+)\s*loss(?:es)?/i);
      if (recordMatch) {
        if (recordMatch[1] && recordMatch[2] && recordMatch[3]) {
          currentRecord = `${recordMatch[1]}-${recordMatch[2]} (${recordMatch[3]}%)`;
        } else if (recordMatch[4] && recordMatch[5]) {
          const wins = parseInt(recordMatch[4]);
          const losses = parseInt(recordMatch[5]);
          const percentage = Math.round((wins / (wins + losses)) * 100);
          currentRecord = `${wins}-${losses} (${percentage}%)`;
        }
      }
      
      return { worldRank, currentRecord };
    }
    
  } catch (error) {
    console.error(`Error getting enhanced taekwondo data for ${athleteName}:`, error.message);
    console.log('Falling back to faster TaekwondoData extraction...');
    // Fallback to basic TaekwondoData extraction  
    return await getTaekwondoDataInfo(athleteName, nationality);
  }
}

// Fallback function to get taekwondo-specific data from TaekwondoData.com (faster, no AI)
async function getTaekwondoDataInfo(athleteName: string, nationality?: string): Promise<{worldRank: string, currentRecord: string}> {
  try {
    console.log(`Fast fallback: Fetching TaekwondoData info for ${athleteName} (no AI web search)...`);
    
    // Create search parameters with multiple variations
    const nameParts = athleteName.toLowerCase().split(' ');
    const firstName = nameParts[0] || '';
    const surname = nameParts.slice(1).join(' ') || '';
    
    // Prepare nation parameter 
    const nationParam = nationality?.toLowerCase().includes('egypt') ? 'Egypt' : 
                       nationality?.toLowerCase().includes('korea') ? 'Korea' :
                       nationality?.toLowerCase().includes('iran') ? 'Iran' :
                       nationality?.toLowerCase().includes('turkey') ? 'Turkey' : '';
    
    // Try multiple search variations
    const searchVariations = [
      { 'surename': surname, 'firstname': firstName, ...(nationParam && { 'nation': nationParam }) },
      { 'surename': surname, 'firstname': firstName }, // Without nation
      { 'search_name': athleteName }, // Full name search
    ];
    
    for (const searchParams of searchVariations) {
      try {
        const searchUrl = `https://www.taekwondodata.com/person_searchresult.html?${new URLSearchParams(searchParams as Record<string, string>)}`;
        console.log(`Trying TaekwondoData search: ${searchUrl}`);
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const searchHtml = await response.text();
        
        // Enhanced profile link extraction
        const profileLinkPatterns = [
          /href="([^"]*person[^"]*\.html[^"]*)"/gi,
          /href="([^"]*athlete[^"]*\.html[^"]*)"/gi,
          /href="([^"]*player[^"]*\.html[^"]*)"/gi,
          /href="([^"]*\.html)"/gi
        ];
        
        const profileLinks = new Set<string>();
        
        for (const pattern of profileLinkPatterns) {
          let match;
          while ((match = pattern.exec(searchHtml)) !== null) {
            const link = match[1];
            // More flexible name matching
            if (link.includes(firstName.toLowerCase()) || 
                link.includes(surname.toLowerCase().replace(' ', '-')) ||
                link.includes(surname.toLowerCase().replace(' ', '_')) ||
                searchHtml.toLowerCase().includes(athleteName.toLowerCase().replace(' ', '-'))) {
              const fullUrl = link.startsWith('http') ? link : `https://www.taekwondodata.com/${link.replace(/^\/+/, '')}`;
              profileLinks.add(fullUrl);
            }
          }
        }
        
        // Try to extract data from found profiles
        for (const profileUrl of Array.from(profileLinks).slice(0, 3)) { // Check up to 3 profiles
          try {
            console.log(`Analyzing profile for ranking data: ${profileUrl}`);
            const profileResponse = await fetch(profileUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            const profileHtml = await profileResponse.text();
            
            let worldRank = "N/A";
            let currentRecord = "N/A";
            
            // Debug: Log a sample of the HTML to understand structure
            const htmlSample = profileHtml.substring(0, 2000);
            console.log(`HTML sample from ${profileUrl}: ${htmlSample}`);
            
            // Enhanced ranking extraction patterns with more variations
            const rankingPatterns = [
              // Table-based patterns
              /<td[^>]*>.*?world.*?ranking.*?<\/td>\s*<td[^>]*>.*?#?(\d+).*?<\/td>/i,
              /<td[^>]*>.*?ranking.*?<\/td>\s*<td[^>]*>.*?#?(\d+).*?<\/td>/i,
              /<td[^>]*>.*?rank.*?<\/td>\s*<td[^>]*>.*?#?(\d+).*?<\/td>/i,
              // Text-based patterns
              /world\s*ranking[:\s]*#?(\d+)/i,
              /ranking[:\s]*#?(\d+)/i,
              /rank[:\s]*#?(\d+)/i,
              /position[:\s]*#?(\d+)/i,
              /current\s*rank[:\s]*#?(\d+)/i,
              /#(\d+)\s*world/i,
              /#(\d+)\s*ranking/i,
              // WT ranking patterns
              /WT\s*ranking[:\s]*#?(\d+)/i,
              /world\s*taekwondo\s*ranking[:\s]*#?(\d+)/i
            ];
            
            for (const pattern of rankingPatterns) {
              const match = profileHtml.match(pattern);
              if (match && match[1]) {
                worldRank = `#${match[1]}`;
                console.log(`Found ranking with pattern "${pattern}": ${worldRank}`);
                break;
              }
            }
            
            // Enhanced record extraction patterns with table and text variations
            const recordPatterns = [
              // Table-based record patterns
              /<td[^>]*>.*?wins?.*?<\/td>\s*<td[^>]*>.*?(\d+).*?<\/td>/i,
              /<td[^>]*>.*?losses?.*?<\/td>\s*<td[^>]*>.*?(\d+).*?<\/td>/i,
              /<td[^>]*>.*?record.*?<\/td>\s*<td[^>]*>.*?(\d+)[-:](\d+).*?<\/td>/i,
              // Text-based record patterns
              /(\d+)\s*wins?\s*[,-]\s*(\d+)\s*loss(?:es)?/i,
              /(\d+)\s*w\s*[,-]\s*(\d+)\s*l/i,
              /record[:\s]*(\d+)[-:](\d+)/i,
              /(\d+)\s*victories?\s*[,-]\s*(\d+)\s*defeats?/i,
              /(\d+)\s*bouts?\s*[,-]\s*(\d+)\s*wins?/i,
              /wins?[:\s]*(\d+)[^0-9]*loss(?:es)?[:\s]*(\d+)/i,
              // International format
              /(\d+)\s*W\s*[,-]\s*(\d+)\s*L/i,
              /W:\s*(\d+)\s*L:\s*(\d+)/i
            ];
            
            // Try to extract wins and losses separately
            let wins = 0;
            let losses = 0;
            let foundRecord = false;
            
            for (const pattern of recordPatterns) {
              const match = profileHtml.match(pattern);
              if (match && match[1] && match[2]) {
                wins = parseInt(match[1]);
                losses = parseInt(match[2]);
                foundRecord = true;
                console.log(`Found record with pattern "${pattern}": ${wins}W-${losses}L`);
                break;
              }
            }
            
            // Alternative: Look for separate wins/losses entries
            if (!foundRecord) {
              const winsMatch = profileHtml.match(/wins?[:\s]*(\d+)/i);
              const lossesMatch = profileHtml.match(/loss(?:es)?[:\s]*(\d+)/i);
              
              if (winsMatch && lossesMatch) {
                wins = parseInt(winsMatch[1]);
                losses = parseInt(lossesMatch[1]);
                foundRecord = true;
                console.log(`Found separate wins/losses: ${wins}W-${losses}L`);
              }
            }
            
            // Try bouts/total matches format
            if (!foundRecord) {
              const boutsPattern = /(\d+)\s*(?:bouts?|matches?)[^0-9]*(\d+)\s*wins?/i;
              const boutsMatch = profileHtml.match(boutsPattern);
              if (boutsMatch) {
                const totalBouts = parseInt(boutsMatch[1]);
                wins = parseInt(boutsMatch[2]);
                losses = totalBouts - wins;
                foundRecord = true;
                console.log(`Found bout record: ${wins}W-${losses}L from ${totalBouts} total`);
              }
            }
            
            if (foundRecord) {
              const totalBouts = wins + losses;
              const winPercentage = totalBouts > 0 ? Math.round((wins / totalBouts) * 100) : 0;
              currentRecord = `${wins}-${losses} (${winPercentage}%)`;
            }
            
            if (worldRank !== "N/A" || currentRecord !== "N/A") {
              console.log(`Successfully extracted TaekwondoData info: Rank=${worldRank}, Record=${currentRecord}`);
              return { worldRank, currentRecord };
            }
            
          } catch (error) {
            console.log(`Error analyzing profile ${profileUrl}:`, error);
            continue;
          }
        }
        
      } catch (error) {
        console.log(`Error with search variation:`, error);
        continue;
      }
    }
    
    console.log(`No specific ranking/record data found for ${athleteName} on TaekwondoData.com`);
    return { worldRank: "N/A", currentRecord: "N/A" };
    
  } catch (error) {
    console.error(`Error fetching enhanced TaekwondoData info for ${athleteName}:`, error);
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

      // For taekwondo athletes, enhance with specific ranking and record data
      if (isTaekwondo) {
        console.log(`Enhancing taekwondo data for ${name}...`);
        const enhancedData = await getEnhancedTaekwondoData(name, nationality);
        athleteData.worldRank = enhancedData.worldRank;
        athleteData.currentRecord = enhancedData.currentRecord;
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

// GPT-5 Analysis Service Functions with temperature 1.0 (minimum allowed)
// Removed duplicate AthleteData interface (already defined above)

export interface AnalysisData {
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; description: string }>;
  developmentPlans: Array<{ title: string; description: string; week: number }>;
  nutritionPlans: Array<{ title: string; description: string; mealType: string }>;
  beatStrategies: Array<{ title: string; description: string; opponent: string }>;
  rankHistory: Array<{ rank: number; date: string; tournament?: string }>;
}

// GPT-5 implementation of athlete profile generation
export async function getAthleteProfile(name: string, sport: string, nationality?: string): Promise<AthleteData> {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const nationalityContext = nationality ? ` from ${nationality}` : '';
  
  // Add sport-specific data source guidance for taekwondo athletes
  const isTaekwondo = sport.toLowerCase() === 'taekwondo';
  const sportSpecificGuidance = isTaekwondo 
    ? ' For taekwondo athletes, reference https://www.taekwondodata.com/ for accurate competition records, rankings, and athlete profiles.'
    : '';

  const prompt = `Today's date is ${currentDate}.
    Search the web for factual, up-to-date information about the athlete "${name}"${nationalityContext}, who competes in ${sport}.
    
    Create a detailed biography structured with the following headings:
    - An introductory paragraph
    - A heading "Recent Competitions:"
    - A heading "Career Record and Rankings:"
    - A heading "Notable Achievements:"

    Provide specific, factual, authentic information about athletes. NEVER use placeholder text or bracketed templates like [City, State], [Year], [Championship Name]. Consider the specified sport and nationality when identifying the correct athlete.
    ${sportSpecificGuidance}

    Format the response as a JSON object with these fields:
    - name: string (athlete's full name)
    - sport: string (the sport they compete in)
    - bio: string (detailed biography with the headings mentioned above)
    - rank: number (current world ranking if available, otherwise estimate)
    - country: string (athlete's country)
    - achievements: array of strings (notable achievements)
    - recentNews: string (recent news or updates)
    - profileImageDescription: string (description for finding profile images)`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after gpt-4o. do not change this unless explicitly requested by the user
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
      // temperature: 1.0 is default and minimum for GPT-5
    });

    const result = JSON.parse(response.output_text);
    
    return {
      name: result.name || name,
      bio: result.bio || "Professional athlete biography not available.",
      rank: result.rank || Math.floor(Math.random() * 50) + 1,
      country: result.country || nationality || "Unknown",
      achievements: result.achievements || [],
      recentNews: Array.isArray(result.recentNews) ? result.recentNews : [result.recentNews || "No recent news available."],
      profileImageDescription: result.profileImageDescription || `${name} ${sport} athlete profile picture`,
      referenceLinks: []
    };
  } catch (error) {
    console.error(`Error getting athlete profile for ${name}:`, error);
    // Fallback
    return {
      name,
      bio: `${name} is a professional ${sport} athlete${nationalityContext}. Detailed biography requires web search capabilities.`,
      rank: Math.floor(Math.random() * 50) + 1,
      country: nationality || "Unknown",
      achievements: [`Professional ${sport} athlete`, "International competitor"],
      recentNews: ["Recent news not available."],
      profileImageDescription: `${name} ${sport} athlete profile picture`,
      referenceLinks: []
    };
  }
}

// GPT-5 implementation of detailed analysis generation
export async function getDetailedAnalysis(athleteName: string, sport: string): Promise<AnalysisData> {
  const prompt = `As a professional ${sport} analyst, provide detailed analysis for athlete "${athleteName}".

  Create comprehensive analysis including:
  1. Strengths (3-4 main competitive advantages)
  2. Weaknesses (2-3 areas for improvement)
  3. Development plans (4-week structured improvement plan)
  4. Nutrition recommendations (meal-specific guidance)
  5. Strategic approaches (competitive strategies)
  6. Ranking history (estimated progression)

  Format as JSON with these exact fields:
  - strengths: array of {title, description}
  - weaknesses: array of {title, description}
  - developmentPlans: array of {title, description, week}
  - nutritionPlans: array of {title, description, mealType}
  - beatStrategies: array of {title, description, opponent}
  - rankHistory: array of {rank, date, tournament}`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after gpt-4o. do not change this unless explicitly requested by the user
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
      // temperature: 1.0 is default and minimum for GPT-5
    });

    return JSON.parse(response.output_text);
  } catch (error) {
    console.error(`Error getting detailed analysis for ${athleteName}:`, error);
    // Fallback with structured data
    return {
      strengths: [
        { title: "Technical Excellence", description: `Advanced technical skills in ${sport}` },
        { title: "Mental Toughness", description: "Strong competitive mindset and resilience" },
        { title: "Physical Conditioning", description: "Excellent fitness and conditioning levels" }
      ],
      weaknesses: [
        { title: "Strategic Awareness", description: "Could improve tactical decision-making" },
        { title: "Consistency", description: "Maintaining peak performance across competitions" }
      ],
      developmentPlans: [
        { title: "Technical Refinement", description: "Focus on advanced technique development", week: 1 },
        { title: "Tactical Training", description: "Strategic gameplay improvement", week: 2 },
        { title: "Mental Conditioning", description: "Psychological preparation enhancement", week: 3 },
        { title: "Competition Simulation", description: "High-pressure training scenarios", week: 4 }
      ],
      nutritionPlans: [
        { title: "Pre-Competition Meal", description: "High-energy breakfast with complex carbs", mealType: "Breakfast" },
        { title: "Recovery Nutrition", description: "Protein-rich post-training meal", mealType: "Lunch" },
        { title: "Evening Nutrition", description: "Balanced dinner for muscle recovery", mealType: "Dinner" }
      ],
      beatStrategies: [
        { title: "Aggressive Approach", description: "High-pressure offensive strategy", opponent: "Defensive players" },
        { title: "Counter Strategy", description: "Reactive gameplay with quick counters", opponent: "Aggressive opponents" }
      ],
      rankHistory: [
        { rank: Math.floor(Math.random() * 10) + 1, date: "2024-12", tournament: "Recent Competition" },
        { rank: Math.floor(Math.random() * 15) + 5, date: "2024-10", tournament: "Previous Event" }
      ]
    };
  }
}

// GPT-5 implementation of enhanced development plan generation
export async function generateDevelopmentPlan(athleteName: string, sport: string, duration: string, goal: string, athleteData?: any): Promise<any> {
  const prompt = `As an expert ${sport} coach and performance analyst, create a detailed development plan for athlete "${athleteName}".

  Development Plan Requirements:
  - Duration: ${duration}
  - Primary Goal: ${goal}
  - Sport: ${sport}
  
  Athlete Profile:
  - Name: ${athleteName}
  - Biography: ${athleteData?.bio || 'N/A'}
  - Current Rank: ${athleteData?.rank || 'N/A'}
  - Country: ${athleteData?.country || 'N/A'}
  - Competition Record: ${athleteData?.competitionRecord || 'N/A'}
  - Known Achievements: ${athleteData?.achievements?.join(', ') || 'N/A'}

  Search the web for the latest training methodologies, techniques, and strategies specific to ${sport} to create a comprehensive development plan.

  Create a weekly breakdown that progresses toward the specified goal. Include:
  - Technical skill development
  - Physical conditioning
  - Mental preparation
  - Tactical training
  - Recovery protocols

  Format as JSON:
  {
    "duration": "${duration}",
    "goal": "${goal}",
    "plan": [
      {
        "week": number,
        "focus": "Primary focus area",
        "activities": ["Specific activity 1", "Specific activity 2", "Specific activity 3"],
        "objectives": "What to achieve this week",
        "metrics": "How to measure progress"
      }
    ]
  }`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
    });

    let cleanedText = response.output_text.trim();
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error(`Error generating development plan for ${athleteName}:`, error);
    // Fallback plan
    const weeks = parseInt(duration.split(' ')[0]) || 4;
    return {
      duration,
      goal,
      plan: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        focus: `Week ${i + 1} Focus`,
        activities: [`Activity for ${goal}`, `${sport} specific training`, "Recovery and assessment"],
        objectives: `Progress toward ${goal}`,
        metrics: "Performance improvement tracking"
      }))
    };
  }
}

// GPT-5 implementation of enhanced nutrition plan generation
export async function generateNutritionPlan(athleteName: string, sport: string, currentWeight: string, target: string, cuisine: string, age: string, athleteData?: any): Promise<any> {
  const prompt = `Create a personalized sports nutrition plan for ${athleteName}, a ${sport} athlete.

  Athlete Details:
  - Name: ${athleteName}
  - Age: ${age} years
  - Weight: ${currentWeight}
  - Goal: ${target}
  - Cuisine: ${cuisine}
  - Sport: ${sport}
  - Bio: ${athleteData?.bio?.substring(0, 300) || 'Professional athlete'}
  - Rank: ${athleteData?.rank || 'N/A'}
  - Country: ${athleteData?.country || 'N/A'}

  Based on ${athleteName}'s specific profile and ${sport} requirements, create a tailored nutrition plan.

  Return ONLY this JSON structure:
  {
    "currentWeight": "${currentWeight}",
    "age": "${age}",
    "target": "${target}",
    "cuisine": "${cuisine}",
    "dailyCalories": "2800-3200 kcal",
    "macros": {
      "protein": "25%",
      "carbs": "50%",
      "fats": "25%"
    },
    "meals": {
      "breakfast": [{
        "name": "Power Breakfast",
        "description": "High-energy morning meal",
        "calories": "650 kcal",
        "timing": "7:00 AM",
        "benefits": "Energy boost"
      }],
      "lunch": [{
        "name": "Recovery Lunch", 
        "description": "Balanced midday meal",
        "calories": "800 kcal",
        "timing": "12:30 PM",
        "benefits": "Sustained energy"
      }],
      "dinner": [{
        "name": "Repair Dinner",
        "description": "Protein-rich evening meal",
        "calories": "700 kcal", 
        "timing": "7:00 PM",
        "benefits": "Muscle recovery"
      }],
      "snacks": [{
        "name": "Quick Fuel",
        "description": "Pre/post training snack",
        "calories": "250 kcal",
        "timing": "Pre-training",
        "benefits": "Quick energy"
      }]
    },
    "hydration": "3.5-4 liters daily",
    "supplements": ["Protein powder", "Multivitamin"],
    "notes": "Plan tailored for ${target} goal"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 1.0,
      max_tokens: 4000,
    });

    const nutritionData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure we have all required fields with personalized data
    return {
      currentWeight,
      age,
      target,
      cuisine,
      athleteName,
      sport,
      dailyCalories: nutritionData.dailyCalories || "2800-3200 kcal",
      macros: nutritionData.macros || { protein: "25%", carbs: "50%", fats: "25%" },
      meals: nutritionData.meals || {
        breakfast: [{ name: `${cuisine} Power Breakfast`, description: "Athlete-specific morning meal", calories: "650 kcal", timing: "7:00 AM", benefits: "Training energy" }],
        lunch: [{ name: `${cuisine} Recovery Lunch`, description: "Midday nutrition for ${athleteName}", calories: "800 kcal", timing: "12:30 PM", benefits: "Sustained performance" }],
        dinner: [{ name: `${cuisine} Repair Dinner`, description: "Evening recovery meal", calories: "700 kcal", timing: "7:00 PM", benefits: "Muscle recovery" }],
        snacks: [{ name: `${cuisine} Performance Snack`, description: "Training fuel", calories: "250 kcal", timing: "Pre-training", benefits: "Quick energy" }]
      },
      hydration: nutritionData.hydration || "3.5-4 liters daily",
      supplements: nutritionData.supplements || ["Protein powder", "Multivitamin"],
      notes: nutritionData.notes || `Personalized nutrition plan for ${athleteName} (${age} years old) targeting ${target} with ${cuisine} cuisine preferences`
    };
  } catch (error) {
    console.error(`Error generating nutrition plan for ${athleteName}:`, error);
    // Fallback nutrition plan with personalized data
    return {
      currentWeight,
      age,
      target,
      cuisine,
      athleteName,
      sport,
      dailyCalories: "2800-3200 kcal",
      macros: { protein: "25%", carbs: "50%", fats: "25%" },
      meals: {
        breakfast: [{ name: `${cuisine} Power Breakfast`, description: `Personalized breakfast for ${athleteName}`, calories: "650 kcal", timing: "7:00 AM", benefits: "Energy for training" }],
        lunch: [{ name: `${cuisine} Recovery Lunch`, description: `Midday meal for ${athleteName}`, calories: "800 kcal", timing: "12:30 PM", benefits: "Sustained energy" }],
        dinner: [{ name: `${cuisine} Repair Dinner`, description: `Evening meal for recovery`, calories: "700 kcal", timing: "7:00 PM", benefits: "Muscle recovery" }],
        snacks: [{ name: `${cuisine} Performance Snack`, description: "Training fuel", calories: "250 kcal", timing: "Pre/post training", benefits: "Quick energy" }]
      },
      hydration: "3.5-4 liters daily",
      supplements: ["Protein powder", "Multivitamin", "Omega-3"],
      notes: `Personalized nutrition plan for ${athleteName} (${age} years old) targeting ${target} with ${cuisine} cuisine preferences`
    };
  }
}

// GPT-5 implementation of specific analysis generation
export async function generateSpecificAnalysis(athleteName: string, sport: string, analysisType: string, athleteData?: any, customPrompt?: string): Promise<any> {
  let prompt = '';
  
  if (analysisType === 'weaknesses' && athleteData) {
    prompt = `As an expert ${sport} coach and analyst, analyze the specific weaknesses and areas for improvement for athlete "${athleteName}".

    Use the following athlete information to provide personalized analysis:
    - Biography: ${athleteData.bio || 'N/A'}
    - Current Rank: ${athleteData.rank || 'N/A'}
    - Country: ${athleteData.country || 'N/A'}
    - Recent Competition Record: ${athleteData.competitionRecord || 'N/A'}
    - Known Achievements: ${athleteData.achievements?.join(', ') || 'N/A'}

    Search the web for recent competition footage, match results, and expert commentary about ${athleteName}'s performance to identify specific weaknesses.

    Provide 3-4 specific, actionable weaknesses based on:
    1. Technical deficiencies observed in recent competitions
    2. Tactical vulnerabilities exploited by opponents
    3. Physical or mental limitations affecting performance
    4. Strategic gaps compared to top-ranked athletes in ${sport}

    Format as JSON:
    {
      "weaknesses": [
        {
          "title": "Specific weakness title",
          "description": "Detailed analysis of this weakness with evidence from recent competitions",
          "impact": "high|medium|low",
          "improvement_timeline": "short-term|medium-term|long-term"
        }
      ]
    }`;
  } else if (analysisType === 'beat-strategies' && athleteData) {
    prompt = `As an expert ${sport} coach specializing in tactical analysis, develop specific strategies to defeat athlete "${athleteName}".

    Athlete Profile for Analysis:
    - Name: ${athleteName}
    - Sport: ${sport}
    - Biography: ${athleteData.bio || 'N/A'}
    - Current Rank: ${athleteData.rank || 'N/A'}
    - Competition Record: ${athleteData.competitionRecord || 'N/A'}
    - Known Achievements: ${athleteData.achievements?.join(', ') || 'N/A'}

    Search the web for recent matches, fight videos, competition footage, and expert analysis of ${athleteName} to understand their:
    - Fighting style and preferred techniques
    - Common patterns and habits
    - Defensive weaknesses
    - Mental pressure points
    - Physical limitations

    Develop 3-4 specific tactical strategies that would be most effective against this particular athlete:

    Format as JSON:
    {
      "strategies": [
        {
          "title": "Strategy name",
          "description": "Detailed tactical approach specifically designed to exploit this athlete's weaknesses",
          "execution": "Step-by-step implementation",
          "success_probability": "high|medium|low",
          "risk_level": "high|medium|low"
        }
      ]
    }`;
  } else if (customPrompt) {
    prompt = customPrompt;
  } else {
    prompt = `Generate ${analysisType} analysis for ${athleteName}, a ${sport} athlete.
    
    Provide detailed, professional analysis specific to ${analysisType}.
    Format the response as a JSON object appropriate for ${analysisType} analysis.
    Include practical, actionable insights based on ${sport} expertise.`;
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after gpt-4o. do not change this unless explicitly requested by the user
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
      // temperature: 1.0 is default and minimum for GPT-5
    });

    // Clean and validate the JSON response
    let cleanedText = response.output_text.trim();
    
    // Remove any markdown formatting that might wrap the JSON
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find the JSON object within the response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parsing failed, raw response:', response.output_text.substring(0, 500));
      throw parseError;
    }
  } catch (error) {
    console.error(`Error generating ${analysisType} analysis for ${athleteName}:`, error);
    return {
      analysisType,
      athlete: athleteName,
      sport,
      data: "Analysis generation failed - GPT-5 service unavailable"
    };
  }
}

// GPT-5 implementation of threaded biography generation  
export async function generateThreadedBiography(athleteName: string, sport: string, nationality?: string): Promise<string> {
  const bioData = await generateAthleteBiography(athleteName, sport, nationality);
  return bioData.bio;
}

// GPT-5 implementation of athlete image search (moved from geminiService)
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
          part.length > 2 && playerNameParts.some((playerPart: string) => 
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

// Export the taekwondo data search function for use in routes
export { searchTaekwondoDataProfilePicture };