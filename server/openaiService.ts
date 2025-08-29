import OpenAI from "openai";

// GPT-5 is now available and is the latest OpenAI model with default temperature 1.0 (cannot go under)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multi-step AI player search with suggestions and enhanced user feedback
export async function searchAthletesSuggestions(
  searchQuery: string, 
  sport: string,
  country?: string
): Promise<{ suggestions: Array<{ fullName: string; dateOfBirth: string; age: number; country: string; sport: string }>, requiresSelection: boolean }> {
  try {
    const countryContext = country ? ` from ${country}` : '';
    const prompt = `You are an expert sports database search assistant. Search for athletes matching the query "${searchQuery}"${countryContext} in ${sport}.

SEARCH INSTRUCTIONS:
1. Use web search to find multiple athletes that could match "${searchQuery}"${country ? ` with priority given to athletes from ${country}` : ''}
2. Look for current active athletes as well as retired legends
3. Include athletes from different countries/eras if multiple exist${country ? ` but prioritize ${country} athletes` : ''}
4. Focus on finding exact full names, dates of birth, and current countries

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON with no additional text
- Include full official names (not nicknames unless part of official name)
- Must include accurate date of birth or age
- Include current nationality/country
- If only ONE clear match exists, return that single result
- If multiple possible matches exist, return up to 5 most relevant suggestions

Return this EXACT JSON structure:
{
  "suggestions": [
    {
      "fullName": "Complete official athlete name",
      "dateOfBirth": "YYYY-MM-DD or Month DD, YYYY", 
      "age": 25,
      "country": "Full country name",
      "sport": "${sport}"
    }
  ],
  "requiresSelection": true
}

If only one athlete clearly matches, set "requiresSelection": false.
If no athletes found through web search, respond with: {"error": "no_athletes_found", "success": false}

SEARCH QUERY: "${searchQuery}"${countryContext}
SPORT: ${sport}`;

    const response = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 4000
    });

    const responseText = response.output_text || "{}";
    
    // Check for error responses indicating no data found
    if (responseText.includes('"error": "no_athletes_found"') || 
        responseText.includes('"success": false')) {
      throw new Error('AI_SEARCH_FAILED: No athletes found through web search');
    }

    // Clean and parse the JSON response
    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    
    console.log('Raw GPT-5 search response:', responseText);
    console.log('Cleaned response:', cleanedResponse);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Failed to parse response:', cleanedResponse);
      throw new Error('AI returned invalid JSON format');
    }
    
    // Validate the response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      console.log('Invalid parsedResponse object:', parsedResponse);
      throw new Error('AI returned invalid response structure');
    }
    
    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      console.log('Invalid suggestions array:', parsedResponse.suggestions);
      
      // If AI returned an error, handle it appropriately
      if (parsedResponse.error) {
        throw new Error('AI_SEARCH_FAILED: ' + parsedResponse.error);
      }
      
      throw new Error('AI returned response without suggestions array');
    }

    // Ensure all suggestions have required fields
    const validSuggestions = parsedResponse.suggestions.filter((suggestion: any) => 
      suggestion.fullName && 
      (suggestion.dateOfBirth || suggestion.age) && 
      suggestion.country
    );

    return {
      suggestions: validSuggestions,
      requiresSelection: validSuggestions.length > 1
    };

  } catch (error) {
    console.error("Error searching for athlete suggestions:", error);
    
    if (error instanceof Error && error.message.includes('AI_SEARCH_FAILED')) {
      throw error; // Re-throw search failures
    }
    
    throw new Error(`Failed to search for athletes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
    
    // Use GPT-4o to get general ranking and record data
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Provide general information about current World Taekwondo (WT) ranking and competition record for the athlete "${athleteName}"${nationalityContext}.

Focus on providing:
1. Current World Taekwondo (WT) world ranking position (if known)
2. Career competition record (wins-losses or bout statistics if available)

Response format:
{
  "worldRank": "#X" (where X is the ranking number, or "N/A" if not found),
  "currentRecord": "W-L (percentage)" (format like "15-3 (83%)" or "N/A" if not found)
}` }],
      temperature: 0.1,
      max_tokens: 1000
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    console.log("AI Ranking Search Response:", responseText);
    
    try {
      const rankingData = JSON.parse(responseText);
      
      // Check for error responses
      if (rankingData.error && (rankingData.error === 'no_data_found' || rankingData.error === 'search_failed' || rankingData.error === 'not_found')) {
        throw new Error(`AI_WEB_SEARCH_FAILED: ${rankingData.error}`);
      }
      
      if (rankingData.success === false) {
        throw new Error('AI_WEB_SEARCH_FAILED: No authentic ranking data found through web search');
      }
      
      return {
        worldRank: rankingData.worldRank || "N/A",
        currentRecord: rankingData.currentRecord || "N/A"
      };
    } catch (parseError) {
      console.log("Failed to parse AI ranking response, using fallback extraction...");
      
      // Fallback: Extract from raw text
      const text = responseText;
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
    
  } catch (error: any) {
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
    
    Create a detailed biography with this EXACT structure using proper headings:

**Introduction**
[Comprehensive introduction paragraph about the athlete]

**Players' Overall Story**
[Detailed story about what they're known for in ${sport}, their background, playing style, and career journey]

**Recent Competitions**
[Information about their most recent competitions and results]

**Career Record and Rankings**
[Current rankings, competition record, and career statistics]

**Notable Achievements**
[List of major titles, medals, and career highlights]

Only mention information that is 100% accurate and verifiable from web search.

IMPORTANT: 
- Use the EXACT heading format with double asterisks: **Introduction**, **Players' Overall Story**, **Recent Competitions**, **Career Record and Rankings**, **Notable Achievements**
- Do not include any links, URLs, citations, or references in your response
- Provide comprehensive information under each section

    Provide the response as a JSON object with these fields:
    - name: athlete's full name
    - bio: the detailed biography with the structured headings format
    - rank: current world ranking if available (as number or "N/A")
    - achievements: array of key achievements
    - recentNews: array of recent news or competition results
    
    ${sportSpecificGuidance}
    `;

  try {
    // Use GPT-5 with web search for profile generation
    const response = await openai.responses.create({
      model: "gpt-5",
      input: `${isTaekwondo ? 'For taekwondo athletes, use web search to find comprehensive information from competition records, rankings, and profiles from sources like https://www.taekwondodata.com/. ' : ''}${prompt}

Please respond in valid JSON format with these exact fields:
{
  "name": "athlete's full name",
  "bio": "detailed biography without any links or citations",
  "rank": "current world ranking or N/A",
  "achievements": ["array of key achievements"],
  "recentNews": ["array of recent news or competition results"]
}`,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 3000
    });

    console.log("Full OpenAI Response:", JSON.stringify(response, null, 2));
    
    const content = response.output_text;
    if (!content) {
      console.log("OpenAI Response Details:", {
        content: response.output_text,
        usage: response.usage
      });
      throw new Error("No content received from OpenAI");
    }

    try {
      const athleteData = JSON.parse(content) as AthleteData;
      
      // Check for error responses
      if (athleteData.error && (athleteData.error === 'no_data_found' || athleteData.error === 'search_failed' || athleteData.error === 'not_found')) {
        throw new Error(`AI_WEB_SEARCH_FAILED: ${athleteData.error}`);
      }
      
      if (athleteData.success === false) {
        throw new Error('AI_WEB_SEARCH_FAILED: No authentic athlete data found through web search');
      }
      
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
    
    CRITICAL WORLD RANKING REQUIREMENT:
    You MUST search for and include the athlete's current world ranking position in their sport:
    - For Taekwondo: Search "World Taekwondo ranking" or "WT ranking" for their weight category
    - For Boxing: Search "world boxing rankings" for their weight division  
    - For Judo: Search "IJF world ranking" for their weight category
    - For Wrestling: Search "United World Wrestling ranking" for their category
    - For other sports: Search "[sport name] world ranking" or official federation rankings
    
    Include the specific ranking number (e.g., "#5 in world", "Ranked 12th globally") or state "Unranked at world level" if no official ranking exists.

Don't include the references in the biography. 
    
    Create an updated biography with fresh information using this EXACT structure:

**Introduction**
[Comprehensive introduction paragraph about the athlete with current status and world ranking position]

**Players' Overall Story**
[Detailed story about what they're known for in ${sport}, their background, playing style, and career journey]

**Recent Competitions**
[Information about their most recent competitions and 2024-2025 results]

**Career Record and Rankings**
[Current world ranking position, competition record, and career statistics]

**Notable Achievements**
[List of major titles, medals, and career highlights]

IMPORTANT: Use the EXACT heading format with double asterisks: **Introduction**, **Players' Overall Story**, **Recent Competitions**, **Career Record and Rankings**, **Notable Achievements**

    Only mention information that is 100% accurate and verifiable.
    IMPORTANT: Do not include any links, URLs, citations, or references in your response. Provide clean text without any reference links or citations.
    
    Return as JSON with name, bio, rank, achievements, and recentNews fields.`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5", // Using GPT-5 as requested by the user
      input: `${prompt}

CRITICAL: The bio field MUST contain ALL 5 sections with exact markdown headings. Example format:

{
  "name": "athlete's full name",
  "bio": "**Introduction**\\n[Comprehensive introduction paragraph]\\n\\n**Players' Overall Story**\\n[Detailed background and career journey]\\n\\n**Recent Competitions**\\n[2024-2025 competition results]\\n\\n**Career Record and Rankings**\\n[Current rankings and competition record]\\n\\n**Notable Achievements**\\n[Major titles and career highlights]",
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
    
    Create a detailed biography with this EXACT structure using proper headings:

**Introduction**
[Comprehensive introduction paragraph about the athlete]

**Players' Overall Story**
[Detailed story about what they're known for in ${sport}, their background, playing style, and career journey]

**Recent Competitions**
[Information about their most recent competitions and results]

**Career Record and Rankings**
[Current rankings, competition record, and career statistics]

**Notable Achievements**
[List of major titles, medals, and career highlights]

    CRITICAL: Use the EXACT heading format with double asterisks and include ALL 5 sections.
    Provide specific, factual, authentic information about athletes. NEVER use placeholder text or bracketed templates like [City, State], [Year], [Championship Name]. Consider the specified sport and nationality when identifying the correct athlete.
    ${sportSpecificGuidance}

    CRITICAL ERROR HANDLING:
    - If you cannot find any reliable data through web search, respond with exactly: {"error": "no_data_found", "success": false}
    - If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
    - If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
    - Only provide data if you find authentic, verifiable information through web search
    - Do not use placeholder or generic data when real information is unavailable

    CRITICAL: The bio field MUST contain ALL 5 sections with exact markdown headings. Example format:
    
    "bio": "**Introduction**\\n[content]\\n\\n**Players' Overall Story**\\n[content]\\n\\n**Recent Competitions**\\n[content]\\n\\n**Career Record and Rankings**\\n[content]\\n\\n**Notable Achievements**\\n[content]"

    Format the response as a JSON object with these fields:
    - name: string (athlete's full name)
    - sport: string (the sport they compete in)
    - bio: string (structured biography with ALL 5 headings)
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
    
    // Check for error responses indicating no data found
    if (result.error && (result.error === 'no_data_found' || result.error === 'search_failed' || result.error === 'not_found')) {
      throw new Error(`AI_WEB_SEARCH_FAILED: ${result.error}`);
    }
    
    if (result.success === false) {
      throw new Error('AI_WEB_SEARCH_FAILED: No authentic data found through web search');
    }
    
    // Validate that we have meaningful data
    if (!result.bio || result.bio.includes('not available') || result.bio.includes('requires web search')) {
      throw new Error('AI_WEB_SEARCH_FAILED: No authentic biography data found');
    }
    
    return {
      name: result.name || name,
      bio: result.bio,
      rank: result.rank || Math.floor(Math.random() * 50) + 1,
      country: result.country || nationality || "Unknown",
      achievements: result.achievements || [],
      recentNews: Array.isArray(result.recentNews) ? result.recentNews : [result.recentNews || "No recent news available."],
      profileImageDescription: result.profileImageDescription || `${name} ${sport} athlete profile picture`,
      referenceLinks: []
    };
  } catch (error) {
    console.error(`Error getting athlete profile for ${name}:`, error);
    
    // Check if this is a web search failure that should prevent token deduction
    if (error instanceof Error && error.message.includes('AI_WEB_SEARCH_FAILED')) {
      throw error; // Re-throw to prevent token deduction
    }
    
    // For other errors, throw a generic failure
    throw new Error(`Failed to generate authentic athlete profile for ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// GPT-5 implementation of detailed analysis generation
export async function getDetailedAnalysis(athleteName: string, sport: string): Promise<AnalysisData> {
  const prompt = `As a professional ${sport} analyst, provide detailed analysis for athlete "${athleteName}".

  Create comprehensive analysis including:
  1. Strengths (3-4 main competitive advantages)
  2. Weaknesses (2-3 areas for improvement)
  3. Development plans (4-week structured improvement plan)

  5. Strategic approaches (competitive strategies)
  6. Ranking history (estimated progression)

  Format as JSON with these exact fields:
  - strengths: array of {title, description}
  - weaknesses: array of {title, description}
  - developmentPlans: array of {title, description, week}

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
  const prompt = `You are an expert ${sport} coach and performance analyst. Create a detailed development plan for athlete "${athleteName}" from ${athleteData?.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.

Development Plan Requirements:
- Duration: ${duration}
- Primary Goal: ${goal}
- Sport: ${sport}

Use the following athlete information for personalized planning:
- Name: ${athleteName}
- Biography: ${athleteData?.bio || 'N/A'}
- Current Rank: ${athleteData?.rank || 'N/A'}
- Country: ${athleteData?.country || 'N/A'}
- Competition Record: ${athleteData?.competitionRecord || 'N/A'}
- Achievements: ${athleteData?.achievements?.join(', ') || 'N/A'}

Search the web for latest training methodologies specific to ${sport} and ${goal}. Create a personalized weekly plan that addresses this athlete's specific needs and goals.

Return this exact JSON structure:
{
  "duration": "${duration}",
  "goal": "${goal}",
  "plan": [
    {
      "week": 1,
      "focus": "Week 1 specific focus based on goal",
      "activities": ["Specific activity 1", "Specific activity 2", "Specific activity 3"],
      "objectives": "What to achieve this week",
      "metrics": "How to measure progress"
    }
  ]
}

Create a plan for the full duration specified. Use authentic data and personalize based on the athlete's profile and specified goal.`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
    });

    // Apply the same robust JSON cleanup used in generateSpecificAnalysis
    let cleanedText = response.output_text.trim();
    
    // Remove markdown formatting
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find complete JSON first, then any JSON
    let jsonMatch = cleanedText.match(/\{[\s\S]*\}(?=\s*$)/);
    if (!jsonMatch) {
      jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    }
    
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
      
      // Clean up common JSON issues
      cleanedText = cleanedText.replace(/,\s*}/g, '}');
      cleanedText = cleanedText.replace(/,\s*]/g, ']');
      
      // Fix truncated JSON by balancing braces/brackets
      let braceCount = 0;
      let bracketCount = 0;
      let result = '';
      
      for (let i = 0; i < cleanedText.length; i++) {
        const char = cleanedText[i];
        result += char;
        
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
      
      // Add missing closing characters
      while (braceCount > 0) {
        result += '}';
        braceCount--;
      }
      while (bracketCount > 0) {
        result += ']';
        bracketCount--;
      }
      
      cleanedText = result;
    }
    
    const parsedData = JSON.parse(cleanedText);
    
    // Ensure we have the expected structure
    return {
      duration: parsedData.duration || duration,
      goal: parsedData.goal || goal,
      plan: parsedData.plan || []
    };
    
  } catch (error: any) {
    console.error(`Error generating development plan for ${athleteName}:`, error);
    // Return error instead of generic fallback data
    return {
      duration,
      goal,
      error: true,
      message: `Unable to generate authentic development plan for ${athleteName} at this time. Please try again later or contact support if the issue persists.`,
      plan: []
    };
  }
}


// GPT-5 implementation of enhanced rank history generation with competition-by-competition tracking
export async function generateRankHistory(athleteName: string, sport: string, nationality?: string): Promise<any> {
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Enhanced prompt focused on authentic ranking data with better guidance for incomplete data
  const prompt = `Search the web for detailed competition history and ranking progression for athlete "${athleteName}" from ${nationality || 'unknown nationality'} in ${sport}.

CRITICAL REQUIREMENTS:
1. Find REAL competition results from 2022-2025 with specific dates
2. Search for official world rankings, federation rankings, or national rankings
3. Look for tournament results that affected their ranking position
4. Only include competitions with verified dates and outcomes
5. If exact numerical rankings are not available, use descriptive terms like "Unranked", "Regional level", "National level", "International competitor"

MANDATORY WORLD RANKING SEARCH:
You MUST search for the athlete's current world ranking position in their sport:
- For Taekwondo: Search "World Taekwondo ranking" or "WT ranking" for their weight category
- For Boxing: Search "world boxing rankings" for their weight division
- For Judo: Search "IJF world ranking" for their weight category
- For Wrestling: Search "United World Wrestling ranking" for their category
- For other sports: Search "[sport name] world ranking" or official federation rankings

Include the specific ranking number (e.g., "#5 in world", "Ranked 12th globally") in currentRanking field, or state "Unranked at world level" if no official ranking exists.

RANKING DATA STRATEGY:
- For established athletes: Search for official world rankings, federation rankings
- For emerging athletes: Look for regional rankings, national team status, competition level progression
- Use "Unranked" instead of "N/A" for athletes without official rankings
- Estimate competitive level based on tournament results (e.g., "National level competitor", "Regional champion")

For ${sport === 'taekwondo' ? 'Taekwondo athletes, check World Taekwondo (WT) official rankings, Olympic results, World Championships, Grand Prix series, and continental championships.' : sport + ' athletes, search official federation websites and competition databases.'}

Return ONLY this JSON structure with authentic data:
{
  "athlete": {
    "name": "${athleteName}",
    "nationality": "${nationality || 'N/A'}",
    "sport": "${sport}",
    "isActive": true,
    "officialRecord": "Based on competition results if available, or 'Developing athlete'",
    "peakRanking": "Highest verified ranking or 'Unranked' or competitive level description",
    "peakRankingDate": "YYYY-MM-DD or 'N/A'",
    "currentRanking": "Current verified ranking or 'Unranked' or competitive level",
    "lastUpdated": "${currentDate}"
  },
  "rankingProgression": [
    {
      "competition": "Official Competition Name (verified)",
      "date": "YYYY-MM-DD",
      "result": "Specific result (gold/silver/bronze/eliminated in round X)",
      "rankingBefore": "Ranking or competitive level before",
      "rankingAfter": "Ranking or competitive level after",
      "points": "Ranking points if available or 'N/A'",
      "significance": "How this result impacted their career progression"
    }
  ],
  "careerSummary": {
    "totalCompetitions": "Count of verified competitions",
    "majorTitles": "Count of significant titles",
    "rankingTrend": "upward/downward/stable based on competition progression",
    "notableAchievements": ["Only verified achievements from search results"],
    "currentForm": "Recent performance analysis based on 2024-2025 results"
  }
}

IMPORTANT: Focus on authentic data but provide meaningful analysis even for emerging athletes. Use competition level progression to show career development.`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
    });

    let cleanedText = response.output_text.trim();
    console.log(`Raw GPT-5 rank response for ${athleteName}:`, cleanedText.substring(0, 500) + '...');
    
    // Remove markdown formatting
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Extract JSON from response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    // Aggressive JSON cleanup for GPT-5 responses
    let attempts = 0;
    while (attempts < 3) {
      try {
        // Try different cleanup strategies
        if (attempts === 1) {
          // Replace problematic commas in strings
          cleanedText = cleanedText.replace(/("(?:[^"\\]|\\.)*"),(\s*[}\]])/g, '$1$2');
          cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1');
        } else if (attempts === 2) {
          // More aggressive comma cleanup
          cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1');
          cleanedText = cleanedText.replace(/("[^"]*"),(\s*"[^"]*"\s*:)/g, '$1$2');
        }
        
        return JSON.parse(cleanedText);
      } catch (parseError: any) {
        console.log(`JSON parse attempt ${attempts + 1} failed:`, parseError.message);
        attempts++;
      }
    }
    
    throw new Error("Failed to parse JSON after 3 attempts");
  } catch (error) {
    console.error(`Error generating rank history for ${athleteName}:`, error);
    return {
      athlete: {
        name: athleteName,
        nationality: nationality || 'N/A',
        sport: sport,
        isActive: true,
        officialRecord: "N/A",
        peakRanking: "N/A",
        peakRankingDate: "N/A",
        currentRanking: "N/A",
        lastUpdated: new Date().toISOString().split('T')[0]
      },
      rankingProgression: [],
      careerSummary: {
        totalCompetitions: "N/A",
        majorTitles: "N/A", 
        rankingTrend: "N/A",
        notableAchievements: [],
        currentForm: "Data not available"
      }
    };
  }
}

// GPT-5 implementation of specific analysis generation  
export async function generateSpecificAnalysis(athleteName: string, sport: string, analysisType: string, athleteData?: any, customPrompt?: string): Promise<any> {
  let prompt = '';
  
  if (analysisType === 'rank' && athleteData) {
    // Use the new enhanced rank history generation
    return await generateRankHistory(athleteName, sport, athleteData.country);
  } else if (analysisType === 'strengths' && athleteData) {
    prompt = `You are an expert ${sport} coach and analyst. Research and analyze the specific competitive strengths of athlete "${athleteName}" from ${athleteData.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.

Use the following athlete information for personalized analysis:
- Name: ${athleteName}
- Sport: ${sport}
- Country: ${athleteData.country || 'N/A'}
- Biography: ${athleteData.bio || 'N/A'}
- Current Rank: ${athleteData.rank || 'N/A'}
- Competition Record: ${athleteData.competitionRecord || 'N/A'}
- Achievements: ${athleteData.achievements?.join(', ') || 'N/A'}

Search the web for recent competition footage, match results, and expert commentary about ${athleteName}'s performance to identify specific strengths.

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

CRITICAL ERROR HANDLING:
- If you cannot find any reliable data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide data if you find authentic, verifiable information through web search`;
  } else if (analysisType === 'weaknesses' && athleteData) {
    prompt = `You are an expert ${sport} coach and analyst. Research and analyze the specific weaknesses and areas for improvement for athlete "${athleteName}" from ${athleteData.country || 'unknown country'}.

CRITICAL: Return only valid JSON. No extra text or explanations.

Use the following athlete information for personalized analysis:
- Name: ${athleteName}
- Sport: ${sport}
- Country: ${athleteData.country || 'N/A'}
- Biography: ${athleteData.bio || 'N/A'}
- Current Rank: ${athleteData.rank || 'N/A'}
- Competition Record: ${athleteData.competitionRecord || 'N/A'}
- Achievements: ${athleteData.achievements?.join(', ') || 'N/A'}

Search the web for recent competition footage, match results, and expert commentary about ${athleteName}'s performance to identify specific weaknesses.

Provide 3-4 specific, actionable weaknesses based on:
- Technical deficiencies observed in recent competitions
- Tactical vulnerabilities exploited by opponents
- Physical or mental limitations affecting performance
- Strategic gaps compared to top-ranked athletes in ${sport}

Return this exact JSON structure:
{
  "weaknesses": [
    {
      "title": "Specific weakness title",
      "description": "Detailed analysis with evidence from recent competitions and expert observations",
      "impact": "high",
      "improvement_timeline": "short-term",
      "evidence": "Specific examples from matches or competitions"
    }
  ]
}

Use authentic data only - base analysis on real competition results and verified performance data.

CRITICAL ERROR HANDLING:
- If you cannot find any reliable data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide data if you find authentic, verifiable information through web search`;
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
    }

CRITICAL ERROR HANDLING:
- If you cannot find any reliable data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide data if you find authentic, verifiable information through web search`;
  } else if (customPrompt) {
    prompt = customPrompt;
  } else {
    prompt = `Generate ${analysisType} analysis for ${athleteName}, a ${sport} athlete.
    
    Provide detailed, professional analysis specific to ${analysisType}.
    Format the response as a JSON object appropriate for ${analysisType} analysis.
    Include practical, actionable insights based on ${sport} expertise.
    
CRITICAL ERROR HANDLING:
- If you cannot find any reliable data through web search, respond with exactly: {"error": "no_data_found", "success": false}
- If web search fails or returns no results, respond with exactly: {"error": "search_failed", "success": false}
- If the athlete/information does not exist, respond with exactly: {"error": "not_found", "success": false}
- Only provide data if you find authentic, verifiable information through web search`;
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
    
    // Check for error responses indicating no data found
    if (cleanedText.includes('"error": "no_data_found"') || 
        cleanedText.includes('"error": "search_failed"') || 
        cleanedText.includes('"error": "not_found"') ||
        cleanedText.includes('"success": false')) {
      throw new Error('AI_WEB_SEARCH_FAILED: No authentic data found through web search');
    }
    
    // Remove any markdown formatting that might wrap the JSON
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find the JSON object within the response - look for complete JSON
    let jsonMatch = cleanedText.match(/\{[\s\S]*\}(?=\s*$)/);
    if (!jsonMatch) {
      // Try to find any JSON object in the response
      jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    }
    
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
      
      // Additional cleanup for common JSON issues
      cleanedText = cleanedText.replace(/,\s*}/g, '}'); // Remove trailing commas
      cleanedText = cleanedText.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      // Try to fix truncated JSON by ensuring proper closing
      let braceCount = 0;
      let bracketCount = 0;
      let result = '';
      
      for (let i = 0; i < cleanedText.length; i++) {
        const char = cleanedText[i];
        result += char;
        
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
      
      // Add missing closing braces/brackets
      while (braceCount > 0) {
        result += '}';
        braceCount--;
      }
      while (bracketCount > 0) {
        result += ']';
        bracketCount--;
      }
      
      cleanedText = result;
    }
    
    try {
      const parsedData = JSON.parse(cleanedText);
      
      // For rank analysis, ensure we have the expected structure
      if (analysisType === 'rank') {
        return {
          athlete: parsedData.athlete || {
            name: athleteName,
            nationality: 'N/A',
            sport: sport,
            isActive: true,
            officialRecord: 'N/A',
            peakRanking: 'N/A',
            peakRankingDate: 'N/A',
            currentRanking: 'N/A',
            lastUpdated: new Date().toISOString().split('T')[0]
          },
          rankingProgression: parsedData.rankingProgression || [],
          careerSummary: parsedData.careerSummary || {
            totalCompetitions: 'N/A',
            majorTitles: 'N/A',
            rankingTrend: 'N/A',
            notableAchievements: [],
            currentForm: 'Data not available'
          }
        };
      }
      
      return parsedData;
    } catch (parseError: any) {
      console.error('JSON parsing failed, raw response:', response.output_text.substring(0, 1000));
      console.error('Parse error:', parseError.message);
      
      // For rank analysis, return a structured fallback
      if (analysisType === 'rank') {
        return {
          athlete: {
            name: athleteName,
            nationality: 'Unknown',
            sport: sport,
            isActive: true,
            officialRecord: 'Data not available',
            peakRanking: 'N/A',
            peakRankingDate: 'N/A',
            currentRanking: 'N/A',
            lastUpdated: new Date().toISOString().split('T')[0]
          },
          rankingProgression: [],
          careerSummary: {
            totalCompetitions: 'N/A',
            majorTitles: 'N/A',
            rankingTrend: 'N/A',
            notableAchievements: [],
            currentForm: 'Unable to retrieve current form data due to parsing error'
          },
          error: 'JSON parsing failed - response may be incomplete'
        };
      }
      
      // For strengths analysis, return a structured fallback
      if (analysisType === 'strengths') {
        return {
          error: 'JSON parsing failed - response may be incomplete',
          message: 'Unable to generate authentic strengths analysis due to parsing error',
          strengths: []
        };
      }
      
      // For weaknesses analysis, return a structured fallback  
      if (analysisType === 'weaknesses') {
        return {
          error: 'JSON parsing failed - response may be incomplete',
          message: 'Unable to generate authentic weaknesses analysis due to parsing error',
          weaknesses: []
        };
      }
      
      // For development analysis, return a structured fallback
      if (analysisType === 'development') {
        return {
          error: 'JSON parsing failed - response may be incomplete', 
          message: 'Unable to generate authentic development plan due to parsing error',
          plan: []
        };
      }
      
      // For beat strategies analysis, return a structured fallback
      if (analysisType === 'beat') {
        return {
          error: 'JSON parsing failed - response may be incomplete',
          message: 'Unable to generate authentic strategic analysis due to parsing error', 
          strategies: []
        };
      }
      
      throw parseError;
    }
  } catch (error: any) {
    console.error(`Error generating ${analysisType} analysis for ${athleteName}:`, error);
    
    // Check if this is a web search failure that should prevent token deduction
    if (error.message && error.message.includes('AI_WEB_SEARCH_FAILED')) {
      throw error; // Re-throw to prevent token deduction
    }
    
    // For other errors, also prevent token deduction by throwing
    throw new Error(`Failed to generate authentic ${analysisType} analysis for ${athleteName}: ${error.message || String(error)}`);
  }
}

// GPT-5 implementation of threaded biography generation  
export async function generateThreadedBiography(athleteName: string, sport: string, nationality?: string): Promise<string> {
  const bioData = await generateAthleteBiography(athleteName, sport, nationality);
  return bioData.bio;
}

// Enhanced AI-powered athlete image search with multiple sources and better sport context
export async function searchAthleteImage(athleteName: string, sport?: string, nationality?: string): Promise<string | null> {
  try {
    console.log(`🔍 Starting comprehensive image search for ${athleteName} (${sport || 'Unknown Sport'})`);
    
    // Strategy 1: AI-powered web search with GPT-5 (primary method)
    const aiImageUrl = await searchAthleteImageWithAI(athleteName, sport, nationality);
    if (aiImageUrl) {
      console.log(`✅ Found image via AI web search: ${aiImageUrl}`);
      return aiImageUrl;
    }
    
    // Strategy 2: Sport-specific database search (secondary method)
    const sportSpecificUrl = await searchSportSpecificDatabase(athleteName, sport, nationality);
    if (sportSpecificUrl) {
      console.log(`✅ Found image via sport-specific database: ${sportSpecificUrl}`);
      return sportSpecificUrl;
    }
    
    // Strategy 3: TheSportsDB fallback (tertiary method)
    const theSportsDBUrl = await searchTheSportsDB(athleteName, sport);
    if (theSportsDBUrl) {
      console.log(`✅ Found image via TheSportsDB: ${theSportsDBUrl}`);
      return theSportsDBUrl;
    }
    
    console.log(`❌ No profile image found for ${athleteName} across all sources`);
    return null;
    
  } catch (error) {
    console.error(`Error in comprehensive athlete image search:`, error);
    return null;
  }
}

// AI-powered web search for athlete images using GPT-5
async function searchAthleteImageWithAI(athleteName: string, sport?: string, nationality?: string): Promise<string | null> {
  try {
    console.log(`🤖 Using AI web search for ${athleteName}...`);
    
    const sportContext = sport ? ` ${sport}` : '';
    const nationalityContext = nationality ? ` from ${nationality}` : '';
    
    const response = await openai.responses.create({
      model: "gpt-5",
      input: `Search the web for a high-quality profile photo of the${sportContext} athlete "${athleteName}"${nationalityContext}.

Find ONLY official, professional photos from credible sources such as:
- Official sport federation websites
- Olympic committee pages
- Major sports news outlets (ESPN, BBC Sport, etc.)
- Competition organizer websites
- Official athlete social media profiles

REQUIREMENTS:
- The image must be a clear headshot or upper body professional photo
- Must be the EXACT athlete (${athleteName}) competing in ${sport || 'their sport'}
- Must be from a credible, verifiable source
- Minimum resolution 200x200 pixels
- Direct image URL (ending in .jpg, .png, .jpeg, .webp)

AVOID:
- Team photos or group shots
- Logos or graphics
- Unofficial fan photos
- Social media screenshots
- Blurry or low-quality images

If you find a suitable image, provide ONLY the direct image URL. If no suitable image is found, respond with "NO_IMAGE_FOUND".`,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 1000
    });

    const aiResponse = response.output?.toString()?.trim();
    console.log(`🤖 AI search response: ${aiResponse}`);
    
    if (aiResponse && aiResponse !== "NO_IMAGE_FOUND" && aiResponse.includes('http')) {
      // Extract URL from response
      const urlMatch = aiResponse.match(/(https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp))/i);
      if (urlMatch) {
        const imageUrl = urlMatch[1];
        
        // Validate the image
        if (await validateImageUrl(imageUrl)) {
          return imageUrl;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error in AI web search for ${athleteName}:`, error);
    return null;
  }
}

// Sport-specific database search
async function searchSportSpecificDatabase(athleteName: string, sport?: string, nationality?: string): Promise<string | null> {
  if (!sport) return null;
  
  const sportLower = sport.toLowerCase();
  
  // Taekwondo: Use existing TaekwondoData.com search
  if (sportLower === 'taekwondo') {
    return await searchTaekwondoDataProfilePicture(athleteName, nationality);
  }
  
  // Future: Add more sport-specific databases here
  // if (sportLower === 'boxing') return await searchBoxingDatabase(athleteName);
  // if (sportLower === 'tennis') return await searchTennisDatabase(athleteName);
  
  return null;
}

// Enhanced TheSportsDB search with better validation
async function searchTheSportsDB(athleteName: string, sport?: string): Promise<string | null> {
  try {
    console.log(`🏃 Searching TheSportsDB for ${athleteName}...`);
    
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(athleteName)}`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.player && data.player.length > 0) {
      for (const player of data.player) {
        // Enhanced name matching
        const athleteNameParts = athleteName.toLowerCase().split(' ');
        const playerNameParts = player.strPlayer ? player.strPlayer.toLowerCase().split(' ') : [];
        
        const matchingParts = athleteNameParts.filter(part => 
          part.length > 2 && playerNameParts.some((playerPart: string) => 
            playerPart.includes(part) || part.includes(playerPart)
          )
        );
        
        const isNameMatch = matchingParts.length >= Math.min(2, athleteNameParts.length);
        
        // Sport conflict validation
        let isSportConflict = false;
        if (sport && player.strSport) {
          const playerSport = player.strSport.toLowerCase();
          const requestedSport = sport.toLowerCase();
          
          // Strict sport matching to avoid cross-sport issues
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
          
          // Additional validation
          if (await validateImageUrl(player.strThumb)) {
            console.log(`✅ Validated TheSportsDB image for ${athleteName}: ${player.strThumb}`);
            return player.strThumb;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching TheSportsDB:`, error);
    return null;
  }
}

// Enhanced image validation function
async function validateImageUrl(imageUrl: string): Promise<boolean> {
  try {
    console.log(`🔍 Validating image: ${imageUrl}`);
    
    // Check URL format
    if (!imageUrl.startsWith('http') || imageUrl.length < 20) {
      console.log(`❌ Invalid URL format: ${imageUrl}`);
      return false;
    }
    
    // Check file extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      imageUrl.toLowerCase().includes(ext)
    );
    
    if (!hasValidExtension) {
      console.log(`❌ Invalid file extension: ${imageUrl}`);
      return false;
    }
    
    // Test image accessibility with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`❌ Image not accessible (${response.status}): ${imageUrl}`);
      return false;
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.log(`❌ Invalid content type (${contentType}): ${imageUrl}`);
      return false;
    }
    
    // Check image size (should be reasonable for profile photo)
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeKB = parseInt(contentLength) / 1024;
      if (sizeKB < 5 || sizeKB > 5000) { // Between 5KB and 5MB
        console.log(`❌ Image size out of range (${sizeKB.toFixed(1)}KB): ${imageUrl}`);
        return false;
      }
    }
    
    console.log(`✅ Image validation passed: ${imageUrl}`);
    return true;
    
  } catch (error) {
    console.error(`Error validating image ${imageUrl}:`, error);
    return false;
  }
}

// Export the taekwondo data search function for use in routes
export { searchTaekwondoDataProfilePicture };

// GPT-5 powered athlete comparison with comprehensive web search analysis
export async function compareAthletes(athlete1: any, athlete2: any, sport: string): Promise<any> {
  const timestamp = new Date().toISOString();
  const sessionId = Math.random().toString(36).substring(7);

  const prompt = `You are an expert ${sport} analyst and coach. Use your web search capabilities to find current, authentic information about these two athletes and create a comprehensive comparison.

Session ID: ${sessionId} - Generation Time: ${timestamp}

CRITICAL INSTRUCTIONS:
1. Use web search to find current competition records, rankings, recent matches, and performance data
2. Find authentic biographical information, achievements, and career statistics  
3. Return only valid JSON with no extra text or explanations
4. Base ALL analysis on current web search results, not pre-existing data

ATHLETES TO RESEARCH:
Athlete 1: ${athlete1.name} from ${athlete1.country || 'Unknown country'} (${sport})
Athlete 2: ${athlete2.name} from ${athlete2.country || 'Unknown country'} (${sport})

SEARCH AND ANALYZE:
- Current world rankings and recent competition results
- Technical skills, fighting style, and signature techniques
- Physical attributes and athletic performance metrics
- Career achievements, major titles, and competition history
- Head-to-head records if they've competed against each other
- Recent performance trends and current form
- Expert analysis and commentary about each athlete

CRITICAL WORLD RANKING REQUIREMENT:
You MUST search for and include both athletes' current world ranking positions:
- For Taekwondo: Search "World Taekwondo ranking" or "WT ranking" for their weight categories
- For Boxing: Search "world boxing rankings" for their weight divisions
- For Judo: Search "IJF world ranking" for their weight categories  
- For Wrestling: Search "United World Wrestling ranking" for their categories
- For other sports: Search "[sport name] world ranking" or official federation rankings

Include specific ranking numbers (e.g., "#3 vs #7", "Ranked 5th vs 12th globally") or state "Unranked" if no official ranking exists.

ANALYSIS REQUIREMENTS (use web search for ALL sections):
1. Strengths Analysis - Find specific technical and tactical strengths from recent competitions
2. Weaknesses Analysis - Identify areas for improvement based on competition footage and expert analysis
3. Ranking Analysis - Research current standings, ranking trajectories, and competitive records
4. Head-to-Head Prediction - Predict matchup outcome based on fighting styles and recent form
5. Overall Analysis - Comprehensive comparison summary based on web research

Return this exact JSON structure:
{
  "athlete1": {
    "name": "${athlete1.name}",
    "country": "${athlete1.country || 'Unknown'}",
    "rank": "${athlete1.rank || 'N/A'}",
    "profileImageUrl": "${athlete1.profileImageUrl || ''}"
  },
  "athlete2": {
    "name": "${athlete2.name}",
    "country": "${athlete2.country || 'Unknown'}",
    "rank": "${athlete2.rank || 'N/A'}",
    "profileImageUrl": "${athlete2.profileImageUrl || ''}"
  },
  "strengths": {
    "athlete1": [
      {
        "title": "Specific strength name",
        "description": "Detailed analysis with evidence from competitions",
        "rating": 95,
        "evidence": "Specific examples from recent matches"
      }
    ],
    "athlete2": [
      {
        "title": "Specific strength name", 
        "description": "Detailed analysis with evidence from competitions",
        "rating": 92,
        "evidence": "Specific examples from recent matches"
      }
    ],
    "advantage": "athlete1|athlete2|even"
  },
  "weaknesses": {
    "athlete1": [
      {
        "title": "Specific weakness",
        "description": "Detailed analysis with evidence",
        "impact": "high|medium|low",
        "exploitation": "How opponent could exploit this weakness"
      }
    ],
    "athlete2": [
      {
        "title": "Specific weakness",
        "description": "Detailed analysis with evidence", 
        "impact": "high|medium|low",
        "exploitation": "How opponent could exploit this weakness"
      }
    ],
    "advantage": "athlete1|athlete2|even"
  },
  "ranking": {
    "comparison": "Detailed ranking and performance comparison",
    "athlete1Trajectory": "Current form and ranking trend analysis",
    "athlete2Trajectory": "Current form and ranking trend analysis",
    "competitiveEdge": "athlete1|athlete2|even"
  },
  "headToHead": {
    "prediction": "athlete1|athlete2",
    "confidence": 75,
    "reasoning": "Detailed analysis of why this athlete would likely win",
    "keyFactors": [
      "Critical factor 1 in determining outcome",
      "Critical factor 2 in determining outcome"
    ],
    "scenario": "Specific competition scenario analysis"
  },
  "overallAnalysis": {
    "summary": "Comprehensive comparison summary",
    "betterAthlete": "athlete1|athlete2|even",
    "reasonsWhy": [
      "Key reason 1",
      "Key reason 2",
      "Key reason 3"
    ],
    "closeness": "very-close|somewhat-close|clear-difference",
    "recommendation": "Professional analysis and recommendation"
  }
}

MANDATORY: Use ONLY current web search results. Do not use generic descriptions or placeholder content. If you cannot find specific information about an athlete through web search, clearly state "Information not found through web search" in the relevant sections.`;

  try {
    const response = await openai.responses.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released after gpt-4o. do not change this unless explicitly requested by the user
      input: prompt,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: 8000,
      // temperature: 1.0 is default and minimum for GPT-5
    });

    // Apply the same robust JSON cleanup used in other functions
    let cleanedText = response.output_text.trim();
    
    // Remove markdown formatting
    cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find complete JSON first, then any JSON
    let jsonMatch = cleanedText.match(/\{[\s\S]*\}(?=\s*$)/);
    if (!jsonMatch) {
      jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    }
    
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
      
      // Clean up common JSON issues
      cleanedText = cleanedText.replace(/,\s*}/g, '}');
      cleanedText = cleanedText.replace(/,\s*]/g, ']');
      
      // Fix truncated JSON by balancing braces/brackets
      let braceCount = 0;
      let bracketCount = 0;
      let result = '';
      
      for (const char of cleanedText) {
        result += char;
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
      
      // Add missing closing characters
      while (braceCount > 0) {
        result += '}';
        braceCount--;
      }
      while (bracketCount > 0) {
        result += ']';
        bracketCount--;
      }
      
      cleanedText = result;
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
      console.log(`GPT-5 Comparison Response for ${athlete1.name} vs ${athlete2.name}:`, JSON.stringify(parsedData, null, 2));
    } catch (parseError: any) {
      console.error(`JSON parsing failed for GPT-5 response: ${parseError.message}`);
      console.log(`Raw response (first 500 chars): ${cleanedText.substring(0, 500)}`);
      throw parseError;
    }
    
    // Validate that we received authentic GPT-5 data
    const hasAuthenticOverallAnalysis = parsedData.overallAnalysis?.summary && 
      !parsedData.overallAnalysis.summary.includes('not available') &&
      !parsedData.overallAnalysis.summary.includes('Analysis unavailable');
      
    const hasAuthenticHeadToHead = parsedData.headToHead?.reasoning && 
      !parsedData.headToHead.reasoning.includes('Unable to determine') &&
      !parsedData.headToHead.reasoning.includes('Analysis unavailable');
    
    if (hasAuthenticOverallAnalysis && hasAuthenticHeadToHead) {
      console.log(`✅ Authentic GPT-5 comparison analysis generated for ${athlete1.name} vs ${athlete2.name}`);
    } else {
      console.log(`⚠️ Partial GPT-5 data received for ${athlete1.name} vs ${athlete2.name} - using fallbacks for missing sections`);
    }
    
    // Ensure we have the expected structure
    return {
      athlete1: {
        name: athlete1.name,
        country: athlete1.country || 'Unknown',
        rank: athlete1.rank || 'N/A',
        profileImageUrl: athlete1.profileImageUrl || ''
      },
      athlete2: {
        name: athlete2.name,
        country: athlete2.country || 'Unknown',
        rank: athlete2.rank || 'N/A', 
        profileImageUrl: athlete2.profileImageUrl || ''
      },
      strengths: parsedData.strengths || {
        athlete1: [],
        athlete2: [],
        advantage: "even"
      },
      weaknesses: parsedData.weaknesses || {
        athlete1: [],
        athlete2: [],
        advantage: "even"
      },
      ranking: parsedData.ranking || {
        comparison: "GPT-5 analysis temporarily unavailable",
        athlete1Trajectory: "Analysis unavailable", 
        athlete2Trajectory: "Analysis unavailable",
        competitiveEdge: "even"
      },
      headToHead: parsedData.headToHead || {
        prediction: "even",
        confidence: 50,
        reasoning: "Authentic head-to-head analysis temporarily unavailable. GPT-5 was unable to generate detailed comparison data.",
        keyFactors: ["Analysis unavailable"],
        scenario: "GPT-5 analysis temporarily unavailable"
      },
      overallAnalysis: parsedData.overallAnalysis || {
        summary: "Authentic overall analysis temporarily unavailable. GPT-5 was unable to generate comprehensive comparison data.",
        betterAthlete: "even",
        reasonsWhy: ["Analysis unavailable"],
        closeness: "even", 
        recommendation: "Please try again later as authentic analysis could not be generated"
      }
    };
    
  } catch (error: any) {
    console.error(`Error generating athlete comparison for ${athlete1.name} vs ${athlete2.name}:`, error);
    // Throw error instead of returning fallback data
    throw new Error(`Athlete comparison failed for ${athlete1.name} vs ${athlete2.name}: ${error.message}`);
  }
}

// Enhanced athlete profile creation with selected suggestion data
export async function createAthleteFromSuggestion(
  suggestion: { fullName: string; dateOfBirth: string; age: number; country: string; sport: string }
): Promise<any> {
  try {
    console.log(`🤖 Creating athlete profile for selected suggestion: ${suggestion.fullName}`);
    
    const prompt = `Create a detailed athlete profile for this ${suggestion.sport} player:

ATHLETE DETAILS:
Name: ${suggestion.fullName}
Country: ${suggestion.country}
Sport: ${suggestion.sport}
Date of Birth: ${suggestion.dateOfBirth}
Age: ${suggestion.age}

Please create a comprehensive profile including biography, achievements, and current status.

Return in this exact JSON format:
{
  "name": "${suggestion.fullName}",
  "bio": "Comprehensive biography including career highlights, playing position, major clubs/teams, notable achievements, and current status in ${suggestion.sport}. Include technical skills and playing style.",
  "age": ${suggestion.age},
  "country": "${suggestion.country}",
  "achievements": ["Major career achievement 1", "Major career achievement 2", "Notable accomplishment 3"],
  "rank": "Current ranking or status in ${suggestion.sport}",
  "profileImageUrl": null,
  "recentNews": ["Recent career development 1", "Recent achievement or news 2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 3000
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    
    console.log('Raw GPT-5 profile response:', responseText);
    
    // Only throw error if response is completely empty or explicitly says no data
    if (responseText.trim() === '{}' || responseText.trim() === '') {
      throw new Error('AI_WEB_SEARCH_FAILED: Empty response from AI');
    }

    // Clean and parse the JSON response
    let cleanedResponse = responseText.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    
    console.log('Raw GPT-5 profile response:', responseText);
    console.log('Cleaned profile response:', cleanedResponse);
    
    let athleteProfile;
    try {
      athleteProfile = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse athlete profile JSON:', parseError);
      console.log('Problematic response:', cleanedResponse);
      throw new Error('AI returned invalid JSON format for athlete profile');
    }
    
    console.log('Parsed athlete profile:', athleteProfile);
    
    // Validate required fields
    if (!athleteProfile || typeof athleteProfile !== 'object') {
      console.log('Invalid athleteProfile object:', athleteProfile);
      throw new Error('AI returned invalid athlete profile structure');
    }
    
    if (!athleteProfile.name || !athleteProfile.bio) {
      console.log('Missing required fields - name:', athleteProfile.name, 'bio:', athleteProfile.bio);
      console.log('Full response object keys:', Object.keys(athleteProfile || {}));
      throw new Error('AI response missing required name or bio fields');
    }

    return athleteProfile;

  } catch (error) {
    console.error(`Error creating athlete profile for ${suggestion.fullName}:`, error);
    
    if (error instanceof Error && error.message.includes('AI_WEB_SEARCH_FAILED')) {
      throw error; // Re-throw to prevent token deduction
    }
    
    throw new Error(`Failed to create athlete profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

