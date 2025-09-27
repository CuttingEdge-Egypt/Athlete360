import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

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

interface ImageInstruction {
  url: string;
  source: string;
  reasoning: string;
}

// Main function: HTTP-based image search with sport-specific adapters
export async function searchAthleteImageWithScraping(
  athleteName: string, 
  sport?: string,
  country?: string, 
  personalInfo?: any
): Promise<string | null> {
  try {
    console.log(`🔍 Starting proper 4-step image search for ${athleteName}...`);
    
    const athleteProfile: AthleteProfile = {
      name: athleteName,
      sport,
      country,
      personalInfo
    };

    // STEP 1: Ask GPT-5 to find direct image URLs (using web search)
    console.log(`🤖 Step 1: Asking GPT-5 to find direct image URLs for ${athleteName}...`);
    const directImageUrls = await getDirectImageUrlsFromGPT5(athleteProfile);
    
    if (!directImageUrls || directImageUrls.length === 0) {
      console.log(`❌ GPT-5 could not find direct image URLs for ${athleteName}`);
      return null;
    }
    
    // STEP 2: Download images directly from GPT-5's URLs
    console.log(`📸 Step 2: Downloading images directly from web search URLs...`);
    const downloadedImages: string[] = [];
    
    for (const imageUrl of directImageUrls) {
      try {
        const localPath = await downloadImageLocally(imageUrl, athleteName);
        if (localPath) {
          downloadedImages.push(localPath);
          console.log(`✅ Successfully downloaded: ${imageUrl} -> ${localPath}`);
          
          // Get first working image for verification
          if (downloadedImages.length >= 1) break;
        }
      } catch (error) {
        console.log(`⚠️ Failed to download image: ${error}`);
      }
    }
    
    if (downloadedImages.length === 0) {
      console.log(`❌ No images could be downloaded for ${athleteName}`);
      return null;
    }
    
    // STEP 3: Images downloaded successfully
    console.log(`✅ Step 3: ${downloadedImages.length} image(s) downloaded successfully`);
    
    // For now, return the first downloaded image without verification
    // TODO: Add back verification step if needed
    const firstImage = downloadedImages[0];
    console.log(`✅ Using downloaded image for ${athleteName}: ${firstImage}`);
    return firstImage;
    
  } catch (error) {
    console.error('Error in 4-step athlete image search:', error);
    return null;
  }
}

// NEW: Smart image search with fallback - try direct URLs first, download if needed
export async function searchAthleteImageWithDirectUrls(
  athleteName: string, 
  sport?: string,
  country?: string, 
  personalInfo?: any
): Promise<string | null> {
  try {
    console.log(`🔍 Starting smart image search for ${athleteName}...`);
    
    const athleteProfile: AthleteProfile = {
      name: athleteName,
      sport,
      country,
      personalInfo
    };

    // Get direct image URLs from Gemini
    const directImageUrls = await getDirectImageUrlsFromGPT5(athleteProfile);
    
    if (!directImageUrls || directImageUrls.length === 0) {
      console.log(`❌ No direct image URLs found for ${athleteName}`);
      return null;
    }
    
    // Try to validate and use URLs directly first
    for (const url of directImageUrls) {
      console.log(`🔍 Checking URL: ${url}`);
      
      // Check if it's an image URL (ends with image extension or from trusted sources)
      const isImageUrl = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url) || 
                        url.includes('olympics.com/images') || 
                        url.includes('cloudinary.com') ||
                        url.includes('gettyimages.com') ||
                        url.includes('teamusa.com');
      
      if (isImageUrl) {
        console.log(`✅ Valid image URL found for ${athleteName}: ${url}`);
        
        // Try to verify the URL is accessible
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`✅ URL is accessible, using direct URL for ${athleteName}`);
            return url;
          } else {
            console.log(`⚠️ URL returned ${response.status}, trying next...`);
          }
        } catch (error) {
          console.log(`⚠️ Could not verify URL, trying to download instead...`);
        }
      }
    }
    
    // If direct URLs didn't work, try downloading the best one
    console.log(`📥 Direct URLs not suitable, attempting download...`);
    const downloadedImage = await downloadBestImage(directImageUrls, athleteName);
    
    if (downloadedImage) {
      console.log(`✅ Successfully downloaded image for ${athleteName}: ${downloadedImage}`);
      return downloadedImage;
    }
    
    console.log(`❌ No suitable image found for ${athleteName}`);
    return null;
    
  } catch (error) {
    console.error('Error in smart image search:', error);
    return null;
  }
}

// Helper function to download the best available image
async function downloadBestImage(urls: string[], athleteName: string): Promise<string | null> {
  for (const url of urls) {
    try {
      console.log(`📥 Attempting to download from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`⚠️ HTTP ${response.status} for ${url}`);
        continue;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        console.log(`⚠️ Not an image: ${contentType}`);
        continue;
      }
      
      const buffer = await response.arrayBuffer();
      const fileName = `${athleteName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.jpg`;
      const filePath = path.join('attached_assets', 'athlete_images', fileName);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save the image
      fs.writeFileSync(filePath, Buffer.from(buffer));
      console.log(`✅ Downloaded image to: ${filePath}`);
      
      // Return the URL path that will work in the frontend
      return `/attached_assets/athlete_images/${fileName}`;
      
    } catch (error) {
      console.error(`❌ Failed to download from ${url}:`, error);
    }
  }
  
  return null;
}

// STEP 1: Ask GPT-5 to find direct image URLs using web search
async function getDirectImageUrlsFromGPT5(athlete: AthleteProfile): Promise<string[]> {
  try {
    // Simple approach - include athlete data directly
    const athleteInfo = [];
    athleteInfo.push(`Name: ${athlete.name}`);
    athleteInfo.push(`Country: ${athlete.country}`);
    athleteInfo.push(`Sport: ${athlete.sport}`);
    
    if (athlete.personalInfo) {
      if (athlete.personalInfo.height) athleteInfo.push(`Height: ${athlete.personalInfo.height}`);
      if (athlete.personalInfo.age) athleteInfo.push(`Age: ${athlete.personalInfo.age}`);
      if (athlete.personalInfo.achievements) athleteInfo.push(`Achievements: ${athlete.personalInfo.achievements}`);
    }

    const prompt = `Find 3-5 DIRECT DOWNLOAD image links for the athlete: ${athlete.name} (${athlete.sport}, ${athlete.country})

I need actual image URLs that end in .jpg, .png, .webp etc. Focus on:
- Wikipedia Commons images
- Official Olympic/sports federation sites
- News articles with direct image links
- TheSportsDB.com athlete photos
- Official team/national websites

Example format I need:
{
  "images": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Athlete_Name.jpg/256px-Athlete_Name.jpg",
    "https://www.thesportsdb.com/images/media/player/thumb/athlete123.jpg"
  ]
}

Return only real, working image URLs in JSON format.`;

    // Debug: Log the exact prompt being sent
    console.log(`🔍 EXACT PROMPT SENT TO GPT-5 for ${athlete.name}:`);
    console.log('---START PROMPT---');
    console.log(prompt);
    console.log('---END PROMPT---');

    // Use Gemini 2.5 Pro with web search like other parts of the app
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "");
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash"
    });
    
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    });

    const content = response.response?.text();
    if (!content) {
      console.log(`❌ Gemini returned empty response for ${athlete.name}`);
      return [];
    }

    // Log the raw Gemini response for debugging
    console.log(`🤖 GEMINI RAW RESPONSE for ${athlete.name}:`);
    console.log('---START GEMINI RESPONSE---');
    console.log(content);
    console.log('---END GEMINI RESPONSE---');

    try {
      // Try to parse as JSON object with images array
      const response = JSON.parse(content);
      if (response.images && Array.isArray(response.images)) {
        console.log(`🎯 Gemini provided ${response.images.length} image page URLs for ${athlete.name}`);
        (response.images as string[]).forEach((url: string, index: number) => {
          console.log(`📋 Image page ${index + 1}: ${url}`);
        });
        return response.images.filter((url: any) => typeof url === 'string' && url.startsWith('http'));
      }
      // Fallback: try parsing as direct array (old format)
      if (Array.isArray(response)) {
        console.log(`🎯 Gemini provided ${response.length} URLs for ${athlete.name} (array format)`);
        return response.filter((url: any) => typeof url === 'string' && url.startsWith('http'));
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract URLs from text
      const urlMatches = content.match(/https?:\/\/[^\s"'<>]+/gi);
      if (urlMatches) {
        console.log(`🎯 Gemini provided ${urlMatches.length} URLs for ${athlete.name} (extracted from text)`);
        return urlMatches;
      }
    }

    console.log(`❌ Could not parse image URLs from GPT-5 response for ${athlete.name}`);
    return [];

  } catch (error) {
    console.error('Error getting direct image URLs from GPT-5:', error);
    return [];
  }
}

// Legacy: STEP 1 instructions-based approach
async function getImageInstructionsFromGPT5(athlete: AthleteProfile): Promise<ImageInstruction[]> {
  try {
    const athleteDetails = [];
    athleteDetails.push(`Name: ${athlete.name}`);
    if (athlete.sport) athleteDetails.push(`Sport: ${athlete.sport}`);
    if (athlete.country) athleteDetails.push(`Country: ${athlete.country}`);
    
    // Include ALL personal data for better search accuracy
    if (athlete.personalInfo) {
      if (athlete.personalInfo.age) athleteDetails.push(`Age: ${athlete.personalInfo.age}`);
      if (athlete.personalInfo.dateOfBirth) athleteDetails.push(`Date of Birth: ${athlete.personalInfo.dateOfBirth}`);
      if (athlete.personalInfo.height) athleteDetails.push(`Height: ${athlete.personalInfo.height}`);
      if (athlete.personalInfo.weight) athleteDetails.push(`Weight: ${athlete.personalInfo.weight}`);
      if (athlete.personalInfo.achievements) athleteDetails.push(`Achievements: ${athlete.personalInfo.achievements}`);
      if (athlete.personalInfo.position) athleteDetails.push(`Position: ${athlete.personalInfo.position}`);
    }

    const prompt = `You are an expert at finding athlete images. Using ALL the provided athlete data, find specific HTTP links and instructions to get images of this athlete.

COMPLETE ATHLETE DATA:
${athleteDetails.join('\n')}

TASK: Provide specific HTTP instructions to find images of this exact athlete. For each source, provide:
1. The specific HTTP URL or API endpoint to check
2. Clear instructions on how to extract the image URL  
3. The reasoning why this source would have this athlete's photo

Focus on these sources (in priority order):
- Sport-specific databases (TaekwondoData.com for Taekwondo, etc.)
- TheSportsDB API searches
- Olympic/competition databases
- Official sports federation websites
- Major sports news outlets

Respond in JSON format:
{
  "instructions": [
    {
      "url": "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${athlete.name}",
      "source": "TheSportsDB",
      "reasoning": "Professional sports database likely to have athlete photos"
    }
  ]
}

Provide 3-5 specific HTTP instructions that we can execute to find this athlete's image.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      // GPT-5 only supports default temperature (1.0)
      max_completion_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const result = JSON.parse(content);
    if (!result.instructions || !Array.isArray(result.instructions)) return [];

    console.log(`🎯 GPT-5 provided ${result.instructions.length} HTTP instructions for ${athlete.name}`);
    
    // Log each instruction separately to avoid log truncation
    console.log(`📋 === GPT-5's COMPLETE INSTRUCTIONS FOR ${athlete.name.toUpperCase()} ===`);
    result.instructions.forEach((instruction: any, index: number) => {
      console.log(`📋 Instruction ${index + 1}:`);
      console.log(`📋   Source: ${instruction.source}`);
      console.log(`📋   URL: ${instruction.url}`);
      console.log(`📋   Reasoning: ${instruction.reasoning}`);
      console.log(`📋 ---`);
    });
    console.log(`📋 === END GPT-5 INSTRUCTIONS ===`);
    
    return result.instructions;

  } catch (error) {
    console.error('Error getting image instructions from GPT-5:', error);
    return [];
  }
}

// STEP 2: Execute HTTP instructions from GPT-5 to fetch images
async function executeImageInstruction(instruction: ImageInstruction): Promise<string | null> {
  try {
    console.log(`📡 Executing: ${instruction.url} (${instruction.source})`);
    
    const response = await fetch(instruction.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.log(`⚠️ HTTP ${response.status} for ${instruction.source}`);
      return null;
    }

    const data = await response.json() as any;
    
    // Extract image URLs based on known API patterns
    let imageUrl: string | null = null;
    
    // TheSportsDB pattern
    if (instruction.source.toLowerCase().includes('thesportsdb')) {
      if (data.player && data.player.length > 0) {
        const player = data.player[0];
        imageUrl = player.strCutout || player.strThumb || player.strBanner;
      }
    }
    
    // Generic pattern - look for common image fields
    if (!imageUrl && typeof data === 'object') {
      // Look for common image field names
      const imageFields = ['image', 'photo', 'picture', 'avatar', 'thumbnail', 'strCutout', 'strThumb'];
      for (const field of imageFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].match(/\.(jpg|jpeg|png|webp)/i)) {
          imageUrl = data[field];
          break;
        }
      }
    }

    if (imageUrl && imageUrl !== 'null' && await validateImageUrl(imageUrl)) {
      console.log(`✅ Found image via ${instruction.source}: ${imageUrl}`);
      return imageUrl;
    }

    console.log(`⚠️ No valid image found via ${instruction.source}`);
    return null;

  } catch (error) {
    console.log(`⚠️ Error executing instruction for ${instruction.source}: ${error}`);
    return null;
  }
}

// STEP 4: Send image and ALL athlete data to GPT-5 for complete verification
async function verifyAthleteWithCompleteData(
  imageUrl: string, 
  athlete: AthleteProfile
): Promise<{ verified: boolean; reasoning: string }> {
  try {
    const contextInfo = [];
    contextInfo.push(`Name: ${athlete.name}`);
    if (athlete.sport) contextInfo.push(`Sport: ${athlete.sport}`);
    if (athlete.country) contextInfo.push(`Country: ${athlete.country}`);
    
    // Include ALL personal information for comprehensive verification
    if (athlete.personalInfo) {
      if (athlete.personalInfo.age) contextInfo.push(`Age: ${athlete.personalInfo.age}`);
      if (athlete.personalInfo.dateOfBirth) contextInfo.push(`Date of Birth: ${athlete.personalInfo.dateOfBirth}`);
      if (athlete.personalInfo.height) contextInfo.push(`Height: ${athlete.personalInfo.height}`);
      if (athlete.personalInfo.weight) contextInfo.push(`Weight: ${athlete.personalInfo.weight}`);
      if (athlete.personalInfo.achievements) contextInfo.push(`Key Achievements: ${athlete.personalInfo.achievements}`);
      if (athlete.personalInfo.position) contextInfo.push(`Position: ${athlete.personalInfo.position}`);
      if (athlete.personalInfo.team) contextInfo.push(`Team: ${athlete.personalInfo.team}`);
    }

    const prompt = `CRITICAL VERIFICATION TASK: Analyze this image and ALL provided athlete data to verify if this image shows "${athlete.name}".

COMPLETE ATHLETE PROFILE:
${contextInfo.join('\n')}

VERIFICATION CHECKLIST:
1. IDENTITY VERIFICATION: Does this image show ${athlete.name} specifically?
2. SPORT CONTEXT: Does this appear to be a ${athlete.sport || 'sports'} athlete?  
3. PHYSICAL CHARACTERISTICS: Do visible features match the provided data (age, build, etc.)?
4. AUTHENTICITY: Is this a genuine sports photo (not AI-generated or fake)?
5. CONSISTENCY: Does everything align with the athlete profile data?

CRITICAL DECISION RULES:
- If you are confident this is ${athlete.name}, set verified = true
- If you are unsure or this appears to be a different person, set verified = false  
- Use ALL provided data (achievements, dates, physical stats) to help identify
- Focus on WHO is in the image, using the complete athlete profile for verification

Analyze the image thoroughly and respond in JSON format:
{
  "verified": <boolean>,
  "reasoning": "<detailed explanation using the complete athlete data to justify your decision>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      // temperature removed - GPT-5 only supports default temperature 0.1,
      max_completion_tokens: 500
    });

    const gptResponse = response.choices[0]?.message?.content;
    if (!gptResponse) {
      return { verified: false, reasoning: 'No response from GPT-5 Vision' };
    }

    const result = JSON.parse(gptResponse);
    return {
      verified: result.verified || false,
      reasoning: result.reasoning || 'No reasoning provided'
    };

  } catch (error) {
    console.error(`❌ Error in complete athlete verification:`, error);
    return { verified: false, reasoning: `Verification failed: ${error}` };
  }
}

// Legacy function (keeping for compatibility)
async function getSearchStrategiesFromGPT5(athlete: AthleteProfile): Promise<string[]> {
  try {
    const athleteDetails = [];
    athleteDetails.push(`Name: ${athlete.name}`);
    if (athlete.sport) athleteDetails.push(`Sport: ${athlete.sport}`);
    if (athlete.country) athleteDetails.push(`Country: ${athlete.country}`);
    
    // Include personal data for better search accuracy
    if (athlete.personalInfo) {
      if (athlete.personalInfo.age) athleteDetails.push(`Age: ${athlete.personalInfo.age}`);
      if (athlete.personalInfo.dateOfBirth) athleteDetails.push(`Date of Birth: ${athlete.personalInfo.dateOfBirth}`);
      if (athlete.personalInfo.height) athleteDetails.push(`Height: ${athlete.personalInfo.height}`);
      if (athlete.personalInfo.weight) athleteDetails.push(`Weight: ${athlete.personalInfo.weight}`);
      if (athlete.personalInfo.achievements) athleteDetails.push(`Achievements: ${athlete.personalInfo.achievements}`);
    }

    const prompt = `Provide enhanced search strategies for finding the best images of this athlete.

ATHLETE DETAILS:
${athleteDetails.join('\n')}

Your task: Analyze this athlete's profile and provide optimal search strategies that will help find their images more effectively.

Consider:
- What specific keywords would be most effective?
- What sources are likely to have their photos?
- Any notable achievements or competitions they've participated in?
- Alternative name variations or nicknames?

Provide strategic guidance for image search optimization.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      // temperature removed - GPT-5 only supports default temperature 0.3,
      max_completion_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    console.log(`🎯 GPT-5 provided search strategies for ${athlete.name}`);
    return [content]; // Return the strategy as guidance

  } catch (error) {
    console.error('Error getting image sources from GPT-5:', error);
    return [];
  }
}

// STEP 2: Fetch image from GPT-5 instruction
async function fetchImageFromInstruction(instruction: ImageInstruction): Promise<string | null> {
  try {
    console.log(`📸 Fetching from ${instruction.source}: ${instruction.url}`);
    
    // Validate the URL is actually an image
    if (!instruction.url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) {
      console.log(`⚠️ URL doesn't appear to be a direct image: ${instruction.url}`);
      return null;
    }

    // Test if the URL is accessible
    const response = await fetch(instruction.url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.log(`⚠️ Image URL not accessible (${response.status}): ${instruction.url}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`⚠️ URL is not an image (${contentType}): ${instruction.url}`);
      return null;
    }

    return instruction.url;

  } catch (error) {
    console.log(`⚠️ Failed to fetch image: ${error}`);
    return null;
  }
}

// STEP 3: Enhanced athlete identity verification with GPT-5 Vision
async function verifyAthleteIdentityWithGPT5Vision(
  imageUrl: string, 
  athlete: AthleteProfile
): Promise<{ verified: boolean; reasoning: string }> {
  try {
    const contextInfo = [];
    contextInfo.push(`Name: ${athlete.name}`);
    if (athlete.sport) contextInfo.push(`Sport: ${athlete.sport}`);
    if (athlete.country) contextInfo.push(`Nationality: ${athlete.country}`);
    
    // Include detailed personal information for better verification
    if (athlete.personalInfo) {
      if (athlete.personalInfo.age) contextInfo.push(`Age: ${athlete.personalInfo.age}`);
      if (athlete.personalInfo.dateOfBirth) contextInfo.push(`Date of Birth: ${athlete.personalInfo.dateOfBirth}`);
      if (athlete.personalInfo.height) contextInfo.push(`Height: ${athlete.personalInfo.height}`);
      if (athlete.personalInfo.weight) contextInfo.push(`Weight: ${athlete.personalInfo.weight}`);
      if (athlete.personalInfo.achievements) contextInfo.push(`Key Achievements: ${athlete.personalInfo.achievements}`);
    }

    const prompt = `CRITICAL TASK: Verify if this image shows the specific athlete "${athlete.name}".

ATHLETE PROFILE:
${contextInfo.join('\n')}

VERIFICATION REQUIREMENTS:
1. IDENTITY CHECK: Does this image show ${athlete.name} specifically? Use all provided data to verify.
2. PERSON MATCH: Compare visible characteristics (face, build, age) with the athlete data.
3. AUTHENTICITY: Is this a real sports photo (not AI-generated or fake)?
4. CONTEXT VERIFICATION: Does this appear to be a professional athlete photo?

CRITICAL RULES:
- Focus on WHO is in the image, not WHAT sport they're playing
- Use the provided personal data (age, nationality, achievements) to help identify
- If you're confident this is ${athlete.name}, verify = true
- If you're unsure or this appears to be a different person, verify = false
- It's better to reject uncertain matches than approve wrong athletes

Analyze the image carefully and respond in JSON format:
{
  "verified": <boolean>,
  "reasoning": "<detailed explanation of why this is or isn't ${athlete.name}, mentioning specific identifying factors>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      // temperature removed - GPT-5 only supports default temperature 0.1,
      max_completion_tokens: 500
    });

    const gptResponse = response.choices[0]?.message?.content;
    if (!gptResponse) {
      return { verified: false, reasoning: 'No response from GPT-5 Vision' };
    }

    const result = JSON.parse(gptResponse);
    return {
      verified: result.verified || false,
      reasoning: result.reasoning || 'No reasoning provided'
    };

  } catch (error) {
    console.error(`❌ Error in GPT-5 Vision verification:`, error);
    return { verified: false, reasoning: `Vision analysis failed: ${error}` };
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
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 500,
      // temperature removed - GPT-5 only supports default temperature 0.3
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
      const data = await response.json() as any;
      
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
      const data = await response.json() as any;
      
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

// Priority 5: Bing Images Search via SearchAPI.io (enhanced image discovery)
async function searchBingImages(athlete: AthleteProfile): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  
  try {
    // Only use if we have SearchAPI.io API key configured
    const searchApiKey = process.env.SEARCHAPI_KEY;
    
    if (!searchApiKey) {
      console.log(`⚠️ SearchAPI.io key not configured, skipping Bing Images`);
      return results;
    }
    
    console.log(`🔎 Using Bing Images search for ${athlete.name}...`);
    
    // Build comprehensive athlete search query with all available data
    const queryParts = [athlete.name];
    if (athlete.sport) queryParts.push(athlete.sport);
    if (athlete.country) queryParts.push(athlete.country);
    queryParts.push('athlete', 'professional', 'photo');
    
    const query = queryParts.join(' ');
    
    const searchUrl = 'https://www.searchapi.io/api/v1/search';
    const params = new URLSearchParams({
      engine: 'bing_images',
      q: query,
      image_type: 'photo',           // Critical for athlete photos
      size: 'large',                 // High-quality results
      usage_rights: 'free_to_share_and_use', // Legal compliance
      safe_search: 'moderate',       // Content filtering
      market_code: 'en-US',          // Localization
      count: '10',                   // Results per request
      api_key: searchApiKey
    });
    
    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      
      if (data.images_results && data.images_results.length > 0) {
        console.log(`🎯 Bing Images found ${data.images_results.length} results for ${athlete.name}`);
        
        // Process Bing image results
        for (const image of data.images_results.slice(0, 5)) { // Take top 5 results
          if (image.thumbnail && image.original) {
            
            // Prioritize original full-size images over thumbnails
            const imageUrl = image.original || image.thumbnail;
            
            if (imageUrl && typeof imageUrl === 'string') {
              results.push({
                url: imageUrl,
                source: 'bing-images',
                confidence: 0.8, // Higher confidence for Bing's quality
                context: `Bing Images: ${image.title || 'Professional athlete photo'}`
              });
            }
          }
        }
      } else {
        console.log(`⚠️ No Bing Images results found for ${athlete.name}`);
      }
    } else {
      console.log(`⚠️ Bing Images API error: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`⚠️ Bing Images search failed: ${error}`);
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
    
    const prompt = `You are selecting the best athlete photo URL for "${athlete.name}". CRITICAL: The image MUST show an athlete from the correct sport.

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

SELECTION CRITERIA (in priority order):
1. SPORT VERIFICATION: The image MUST show an athlete from "${athlete.sport || 'the specified sport'}"
   - For Taekwondo: Look for martial arts uniform (dobok), protective gear, kicking poses
   - For Tennis: Look for tennis racket, tennis court, tennis attire
   - For Football: Look for football/soccer ball, football field, football uniform
   - REJECT any image showing wrong sport (e.g., football player for Taekwondo athlete)

2. SOURCE CREDIBILITY (after sport verification):
   - OFFICIAL SPORTS SITES: thesportsdb.com, olympics.com, sports federations
   - MAJOR NEWS: espn.com, bbc.com, cnn.com, reuters.com
   - TOURNAMENT SITES: World championships, official competitions
   - VERIFIED SPORTS: taekwondodata.com, official league websites

3. URL QUALITY INDICATORS:
   - "cutout" or "render" = preferred (isolated athlete image)
   - "thumb" or "profile" = good (portrait style)
   - "action" or "competition" = acceptable

CRITICAL RULES:
- If no image shows the correct sport, use selectedIndex: 0 (reject all)
- Never select an image of a different sport athlete
- Sport accuracy is MORE important than source credibility

Respond in JSON format:
{
  "selectedIndex": <number 1-${candidates.length}>,
  "reasoning": "<explanation focusing on sport verification first, then source credibility>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      // temperature removed - GPT-5 only supports default temperature 0.3
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

// GPT-5: Athlete identity verification - confirms the person in image is the correct athlete
async function verifyImageWithGPT5Vision(
  imageUrl: string, 
  athlete: AthleteProfile
): Promise<{ verified: boolean; reasoning: string }> {
  try {
    console.log(`🔍 Using GPT-5 to verify athlete identity for ${athlete.name}...`);
    
    const contextInfo = [];
    if (athlete.sport) contextInfo.push(`Sport: ${athlete.sport}`);
    if (athlete.country) contextInfo.push(`Nationality: ${athlete.country}`);
    if (athlete.personalInfo?.age) contextInfo.push(`Age: ${athlete.personalInfo.age}`);
    if (athlete.personalInfo?.dateOfBirth) contextInfo.push(`Date of Birth: ${athlete.personalInfo.dateOfBirth}`);
    if (athlete.personalInfo?.height) contextInfo.push(`Height: ${athlete.personalInfo.height}`);
    if (athlete.personalInfo?.weight) contextInfo.push(`Weight: ${athlete.personalInfo.weight}`);

    const prompt = `You are verifying if this image shows the correct athlete. Focus on ATHLETE IDENTITY, not sport verification.

TARGET ATHLETE:
Name: ${athlete.name}
${contextInfo.join('\n')}

IDENTITY VERIFICATION TASK:
Does this image show ${athlete.name}? Use the provided context to help identify if this is the correct person.

Consider:
1. FACIAL FEATURES: Does this person match what you know about ${athlete.name}?
2. ATHLETE CONTEXT: Is this a professional athlete photo (not a random person)?
3. CONSISTENCY: Do visible characteristics (age, appearance) match the provided data?
4. AUTHENTICITY: Is this a legitimate sports photo (not AI-generated or fake)?

IMPORTANT RULES:
- Focus on WHO is in the image, not WHAT sport they're playing
- If you're confident this is ${athlete.name}, verify = true
- If you're unsure or this appears to be a different person, verify = false
- It's better to reject uncertain matches than approve wrong athletes

Analyze the image and respond in JSON format:
{
  "verified": <boolean>,
  "reasoning": "<explanation focusing on athlete identity verification>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      // temperature removed - GPT-5 only supports default temperature 0.1,
      max_completion_tokens: 500
    });

    const gptResponse = response.choices[0]?.message?.content;
    if (!gptResponse) {
      console.log(`❌ No response from GPT-5 Vision for ${athlete.name}`);
      return { verified: false, reasoning: "No response from vision analysis" };
    }

    try {
      const verification = JSON.parse(gptResponse);
      console.log(`👁️ GPT-5 Vision result for ${athlete.name}: ${verification.verified ? '✅ VERIFIED' : '❌ REJECTED'}`);
      console.log(`👁️ Reasoning: ${verification.reasoning}`);
      
      return {
        verified: verification.verified || false,
        reasoning: verification.reasoning || "No reasoning provided"
      };
      
    } catch (parseError) {
      console.error(`❌ Error parsing GPT-5 Vision response:`, parseError);
      return { verified: false, reasoning: "Failed to parse vision analysis response" };
    }
    
  } catch (error) {
    console.error(`❌ Error in GPT-5 Vision verification:`, error);
    return { verified: false, reasoning: `Vision analysis failed: ${error}` };
  }
}

// Download image and save locally
async function downloadImageLocally(url: string, athleteName: string): Promise<string | null> {
  try {
    console.log(`🔍 Downloading image: ${url}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Image URL not accessible: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`❌ URL is not an image: ${contentType}`);
      return null;
    }
    
    // Create directory if it doesn't exist
    const imageDir = path.join(process.cwd(), 'attached_assets', 'athlete_images');
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    
    // Generate filename from athlete name and timestamp
    const sanitizedName = athleteName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const extension = contentType.split('/')[1] || 'jpg';
    const filename = `${sanitizedName}_${timestamp}.${extension}`;
    const filePath = path.join(imageDir, filename);
    
    // Download and save the image
    const buffer = await response.buffer();
    fs.writeFileSync(filePath, buffer);
    
    const relativePath = `/attached_assets/athlete_images/${filename}`;
    console.log(`✅ Image downloaded successfully: ${relativePath}`);
    return relativePath;
    
  } catch (error) {
    console.error(`❌ Error downloading image:`, error);
    return null;
  }
}

// Validate image URL accessibility and format (legacy - kept for compatibility)
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    console.log(`🔍 Validating image URL: ${url}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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