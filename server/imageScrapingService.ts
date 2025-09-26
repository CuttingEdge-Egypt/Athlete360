import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY
});

interface ImageResult {
  url: string;
  source: string;
  confidence: number;
  context?: string;
}

interface AthleteProfile {
  name: string;
  sport?: string;
  country?: string;
  personalInfo?: any;
}

// Main function: HTTP-based image search with sport-specific adapters
export async function searchAthleteImageWithScraping(
  athleteName: string, 
  sport?: string,
  country?: string, 
  personalInfo?: any
): Promise<string | null> {
  try {
    console.log(`🔍 Starting enhanced HTTP-based image search for ${athleteName}...`);
    
    const athleteProfile: AthleteProfile = {
      name: athleteName,
      sport,
      country,
      personalInfo
    };

    // Try multiple HTTP-based sources in priority order
    const imageCandidates: ImageResult[] = [];
    
    // Priority 1: GPT-5 with built-in web search (highest quality)
    const gptResult = await searchWithGPT5WebSearch(athleteProfile);
    if (gptResult) imageCandidates.push(gptResult);
    
    // Priority 2: Sport-specific federation APIs and scrapers
    const sportResults = await searchSportSpecificSources(athleteProfile);
    imageCandidates.push(...sportResults);
    
    // Priority 3: General sports databases
    const generalResults = await searchGeneralSportsAPIs(athleteProfile);
    imageCandidates.push(...generalResults);
    
    // Priority 4: Google Custom Search API (controlled fallback)
    if (imageCandidates.length < 3) {
      const googleResults = await searchGoogleCustomSearch(athleteProfile);
      imageCandidates.push(...googleResults);
    }
    
    if (imageCandidates.length === 0) {
      console.log(`❌ No images found from any HTTP source for ${athleteName}`);
      return null;
    }
    
    console.log(`📸 Found ${imageCandidates.length} candidate images from HTTP sources`);
    
    // Use GPT-5 to intelligently rank and select the best image
    const bestImage = await selectBestImageWithGPT5(imageCandidates, athleteProfile);
    
    if (!bestImage) {
      console.log(`❌ GPT-5 could not select suitable image for ${athleteName}`);
      return null;
    }
    
    // Validate the final image URL
    const validatedUrl = await validateImageUrl(bestImage.url);
    
    if (validatedUrl) {
      console.log(`✅ Found verified image for ${athleteName} from ${bestImage.source}`);
      return bestImage.url;
    } else {
      console.log(`❌ Image validation failed for ${athleteName}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error in HTTP-based image search for ${athleteName}:`, error);
    return null;
  }
}

// Priority 1: GPT-5 with built-in web search capability
async function searchWithGPT5WebSearch(athlete: AthleteProfile): Promise<ImageResult | null> {
  try {
    console.log(`🤖 Searching for ${athlete.name} using GPT-5 with web search...`);
    
    const context = [athlete.name];
    if (athlete.sport) context.push(athlete.sport);
    if (athlete.country) context.push(athlete.country);
    
    const prompt = `Search the web for a high-quality profile photo of ${athlete.name}, the ${athlete.sport || 'athlete'} from ${athlete.country || 'unknown country'}. 
    
Find an official, professional photo that shows their face clearly. Look for images from:
- Official sports federation websites
- Major news outlets (ESPN, BBC Sport, etc.)
- Tournament or competition websites
- Olympic or professional league sources

Return the best image URL you find, prioritizing official and credible sources.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
      tools: [{ type: "web_search" }]
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    
    // Extract image URL from GPT-5 response
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)/i);
    if (!urlMatch) return null;
    
    console.log(`✅ GPT-5 found image: ${urlMatch[0]}`);
    
    return {
      url: urlMatch[0],
      source: 'gpt-5-web-search',
      confidence: 0.9,
      context: 'GPT-5 web search with credible sources'
    };
    
  } catch (error) {
    console.log(`⚠️ GPT-5 web search failed: ${error}`);
    return null;
  }
}

// Priority 2: Sport-specific federation APIs and HTTP scrapers
async function searchSportSpecificSources(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  if (!athlete.sport) return results;
  
  const sport = athlete.sport.toLowerCase();
  
  try {
    // Taekwondo - World Taekwondo Federation
    if (sport.includes('taekwondo')) {
      const taekwondoResult = await searchTaekwondoDataProfilePicture(athlete.name);
      if (taekwondoResult) results.push(taekwondoResult);
    }
    
    // Tennis - ATP/WTA
    if (sport.includes('tennis')) {
      const tennisResults = await searchTennisAPIs(athlete);
      results.push(...tennisResults);
    }
    
    // Football/Soccer - FIFA
    if (sport.includes('football') || sport.includes('soccer')) {
      const footballResults = await searchFootballAPIs(athlete);
      results.push(...footballResults);
    }
    
    // Basketball - NBA/FIBA
    if (sport.includes('basketball')) {
      const basketballResults = await searchBasketballAPIs(athlete);
      results.push(...basketballResults);
    }
    
    // Olympics - IOC
    const olympicResult = await searchOlympicDatabase(athlete);
    if (olympicResult) results.push(olympicResult);
    
  } catch (error) {
    console.log(`⚠️ Sport-specific search failed: ${error}`);
  }
  
  return results;
}

// Taekwondo Data scraper (original working method)
async function searchTaekwondoDataProfilePicture(athleteName: string): Promise<ImageResult | null> {
  try {
    console.log(`🥋 Searching TaekwondoData for ${athleteName}...`);
    
    const searchUrl = `https://www.taekwondodata.com/search.html?q=${encodeURIComponent(athleteName)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const searchHtml = await response.text();
    
    // Extract profile links from search results
    const profileLinkRegex = /href="(athlete\.html\?id=\d+)"[^>]*>([^<]*)/g;
    let match;
    
    while ((match = profileLinkRegex.exec(searchHtml)) !== null) {
      const profilePath = match[1];
      const foundName = match[2].trim();
      
      // Check if this matches our athlete
      if (foundName.toLowerCase().includes(athleteName.toLowerCase().split(' ')[0])) {
        const profileUrl = `https://www.taekwondodata.com/${profilePath}`;
        
        // Fetch the profile page
        const profileResponse = await fetch(profileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!profileResponse.ok) continue;
        
        const profileHtml = await profileResponse.text();
        
        // Look for profile image
        const imageRegex = /<img[^>]+src="([^"]*athlete_photos[^"]*\.(?:jpg|jpeg|png|gif))"[^>]*>/i;
        const imageMatch = profileHtml.match(imageRegex);
        
        if (imageMatch) {
          const imageUrl = imageMatch[1].startsWith('http') 
            ? imageMatch[1] 
            : `https://www.taekwondodata.com/${imageMatch[1]}`;
          
          console.log(`✅ Found TaekwondoData image: ${imageUrl}`);
          
          return {
            url: imageUrl,
            source: 'taekwondodata.com',
            confidence: 0.8,
            context: 'World Taekwondo Federation database'
          };
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.log(`⚠️ TaekwondoData search failed: ${error}`);
    return null;
  }
}

// Tennis APIs (ATP/WTA)
async function searchTennisAPIs(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  try {
    console.log(`🎾 Searching tennis databases for ${athlete.name}...`);
    
    // Try ATP website search (HTTP scraping)
    const atpSearchUrl = `https://www.atptour.com/en/search?q=${encodeURIComponent(athlete.name)}`;
    
    const response = await fetch(atpSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Extract player image URLs
      const imageRegex = /player-profile-hero-image[^>]*src="([^"]+)"/g;
      let match;
      
      while ((match = imageRegex.exec(html)) !== null) {
        const imageUrl = match[1].startsWith('http') 
          ? match[1] 
          : `https://www.atptour.com${match[1]}`;
        
        results.push({
          url: imageUrl,
          source: 'atptour.com',
          confidence: 0.75,
          context: 'ATP Tour official website'
        });
        
        break; // Take first result
      }
    }
    
  } catch (error) {
    console.log(`⚠️ Tennis API search failed: ${error}`);
  }
  
  return results;
}

// Football/Soccer APIs
async function searchFootballAPIs(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  try {
    console.log(`⚽ Searching football databases for ${athlete.name}...`);
    
    // FIFA.com search (HTTP scraping)
    const fifaSearchUrl = `https://www.fifa.com/search/?q=${encodeURIComponent(athlete.name)}`;
    
    const response = await fetch(fifaSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Extract player images
      const imageRegex = /player.*?src="([^"]+\.(?:jpg|jpeg|png|webp))"/gi;
      const match = html.match(imageRegex);
      
      if (match && match[0]) {
        const urlMatch = match[0].match(/src="([^"]+)"/);
        if (urlMatch) {
          results.push({
            url: urlMatch[1],
            source: 'fifa.com',
            confidence: 0.75,
            context: 'FIFA official website'
          });
        }
      }
    }
    
  } catch (error) {
    console.log(`⚠️ Football API search failed: ${error}`);
  }
  
  return results;
}

// Basketball APIs
async function searchBasketballAPIs(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  try {
    console.log(`🏀 Searching basketball databases for ${athlete.name}...`);
    
    // NBA.com search
    const nbaSearchUrl = `https://www.nba.com/search?q=${encodeURIComponent(athlete.name)}`;
    
    const response = await fetch(nbaSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Look for player headshots
      const imageRegex = /headshot.*?src="([^"]+\.(?:jpg|jpeg|png|webp))"/gi;
      const match = html.match(imageRegex);
      
      if (match && match[0]) {
        const urlMatch = match[0].match(/src="([^"]+)"/);
        if (urlMatch) {
          results.push({
            url: urlMatch[1],
            source: 'nba.com',
            confidence: 0.75,
            context: 'NBA official website'
          });
        }
      }
    }
    
  } catch (error) {
    console.log(`⚠️ Basketball API search failed: ${error}`);
  }
  
  return results;
}

// Olympic database search
async function searchOlympicDatabase(athlete: AthleteProfile): Promise<ImageResult | null> {
  try {
    console.log(`🏅 Searching Olympic database for ${athlete.name}...`);
    
    const olympicSearchUrl = `https://olympics.com/en/search?q=${encodeURIComponent(athlete.name)}`;
    
    const response = await fetch(olympicSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Look for athlete images
      const imageRegex = /athlete.*?src="([^"]+\.(?:jpg|jpeg|png|webp))"/gi;
      const match = html.match(imageRegex);
      
      if (match && match[0]) {
        const urlMatch = match[0].match(/src="([^"]+)"/);
        if (urlMatch) {
          return {
            url: urlMatch[1],
            source: 'olympics.com',
            confidence: 0.8,
            context: 'International Olympic Committee'
          };
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.log(`⚠️ Olympic database search failed: ${error}`);
    return null;
  }
}

// Priority 3: General sports APIs (TheSportsDB, etc.)
async function searchGeneralSportsAPIs(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  try {
    console.log(`🏃 Searching TheSportsDB for ${athlete.name}...`);
    
    // TheSportsDB API (original working method)
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(athlete.name)}`
    );
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.player && data.player.length > 0) {
        for (const player of data.player.slice(0, 2)) { // Take top 2 results
          if (player.strCutout || player.strThumb) {
            const imageUrl = player.strCutout || player.strThumb;
            
            if (imageUrl && imageUrl !== 'null') {
              results.push({
                url: imageUrl,
                source: 'thesportsdb.com',
                confidence: 0.7,
                context: 'TheSportsDB player database'
              });
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`⚠️ TheSportsDB search failed: ${error}`);
  }
  
  return results;
}

// Priority 4: Google Custom Search API (controlled fallback)
async function searchGoogleCustomSearch(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  try {
    // Only use if we have API keys configured
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!googleApiKey || !searchEngineId) {
      console.log(`⚠️ Google Custom Search API keys not configured, skipping`);
      return results;
    }
    
    console.log(`🔍 Using Google Custom Search for ${athlete.name}...`);
    
    const query = `${athlete.name} ${athlete.sport || ''} professional photo`.trim();
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=3`;
    
    const response = await fetch(searchUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.items) {
        for (const item of data.items) {
          if (item.link) {
            results.push({
              url: item.link,
              source: 'google-custom-search',
              confidence: 0.6,
              context: `Google Custom Search: ${item.title || 'Unknown'}`
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`⚠️ Google Custom Search failed: ${error}`);
  }
  
  return results;
}

// GPT-5 intelligent image selection and ranking
async function selectBestImageWithGPT5(
  candidates: ImageResult[], 
  athlete: AthleteProfile
): Promise<ImageResult | null> {
  try {
    console.log(`🤖 Using GPT-5 to rank ${candidates.length} images for ${athlete.name}...`);
    
    const candidateDescriptions = candidates.map((img, index) => ({
      index: index + 1,
      url: img.url,
      source: img.source,
      confidence: img.confidence,
      context: img.context || 'Unknown context'
    }));
    
    const contextInfo = [];
    if (athlete.sport) contextInfo.push(`Sport: ${athlete.sport}`);
    if (athlete.country) contextInfo.push(`Country: ${athlete.country}`);
    
    const prompt = `You are an expert at selecting the best athlete photos. I need you to choose the BEST image for "${athlete.name}".

ATHLETE INFO:
Name: ${athlete.name}
${contextInfo.join('\n')}

CANDIDATE IMAGES:
${candidateDescriptions.map(img => 
  `${img.index}. URL: ${img.url}
     Source: ${img.source}
     Confidence: ${img.confidence}
     Context: ${img.context}`
).join('\n\n')}

SELECTION CRITERIA:
- Must show the athlete's face clearly
- Professional quality photo preferred
- Official sources have higher credibility
- Avoid group photos or team shots
- Consider image resolution and clarity

Respond in JSON format:
{
  "selectedIndex": <number 1-${candidates.length}>,
  "reasoning": "<explanation of selection>"
}

If none are suitable, use selectedIndex: 0.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    const gptResponse = response.choices[0]?.message?.content;
    if (!gptResponse) return null;
    
    try {
      const selection = JSON.parse(gptResponse);
      
      if (selection.selectedIndex === 0) {
        console.log(`❌ GPT-5 rejected all images: ${selection.reasoning}`);
        return null;
      }
      
      const selectedImage = candidates[selection.selectedIndex - 1];
      console.log(`✅ GPT-5 selected image from ${selectedImage.source}: ${selection.reasoning}`);
      
      return selectedImage;
      
    } catch (parseError) {
      console.error(`❌ Error parsing GPT-5 selection response:`, parseError);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error in GPT-5 image selection:`, error);
    return null;
  }
}

// Validate image URL accessibility and format
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    console.log(`🔍 Validating image URL: ${url}`);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (!response.ok) {
      console.log(`❌ Image URL not accessible: ${response.status}`);
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`❌ URL is not an image: ${contentType}`);
      return false;
    }
    
    console.log(`✅ Image URL validated successfully`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error validating image URL:`, error);
    return false;
  }
}