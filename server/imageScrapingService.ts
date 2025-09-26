import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY
});

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

interface ScrapedImage {
  url: string;
  source: string;
  altText?: string;
  context?: string;
  confidence: number;
}

interface AthleteContext {
  name: string;
  sport?: string;
  country?: string;
  personalInfo?: any;
}

// Main function: Complete Selenium + GPT-5 pipeline
export async function searchAthleteImageWithScraping(
  athleteName: string, 
  sport?: string,
  country?: string, 
  personalInfo?: any
): Promise<string | null> {
  try {
    console.log(`🔍 Starting Selenium + GPT-5 image search for ${athleteName}...`);
    
    const athleteContext: AthleteContext = {
      name: athleteName,
      sport,
      country,
      personalInfo
    };

    // Step 1: Scrape images from multiple sources
    const scrapedImages = await scrapeAthleteImages(athleteContext);
    
    if (scrapedImages.length === 0) {
      console.log(`❌ No images found during scraping for ${athleteName}`);
      return null;
    }

    console.log(`📸 Found ${scrapedImages.length} candidate images, sending to GPT-5 for ranking...`);

    // Step 2: Use GPT-5 to rank and select best image
    const selectedImage = await rankImagesWithGPT5(scrapedImages, athleteContext);
    
    if (!selectedImage) {
      console.log(`❌ GPT-5 could not select a suitable image for ${athleteName}`);
      return null;
    }

    // Step 3: Validate the selected image URL
    const validatedUrl = await validateImageUrl(selectedImage.url);
    
    if (validatedUrl) {
      console.log(`✅ Successfully found and validated image for ${athleteName}: ${selectedImage.url}`);
      console.log(`📋 Image source: ${selectedImage.source}`);
      return selectedImage.url;
    } else {
      console.log(`❌ Selected image failed validation for ${athleteName}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Error in Selenium + GPT-5 image search for ${athleteName}:`, error);
    return null;
  }
}

// Step 1: Scrape images from official sources
async function scrapeAthleteImages(athleteContext: AthleteContext): Promise<ScrapedImage[]> {
  const allImages: ScrapedImage[] = [];
  
  // Priority 1: Official sport federation websites
  if (athleteContext.sport?.toLowerCase() === 'taekwondo') {
    const taekwondoImages = await scrapeTaekwondoFederation(athleteContext);
    allImages.push(...taekwondoImages);
  }
  
  // Priority 2: Major sports news outlets
  const newsImages = await scrapeSportsNews(athleteContext);
  allImages.push(...newsImages);
  
  // Priority 3: Google Images (with throttling and stealth)
  if (allImages.length < 3) {
    const googleImages = await scrapeGoogleImages(athleteContext);
    allImages.push(...googleImages);
  }
  
  return allImages;
}

// Scrape World Taekwondo and regional federations
async function scrapeTaekwondoFederation(athleteContext: AthleteContext): Promise<ScrapedImage[]> {
  const images: ScrapedImage[] = [];
  
  try {
    console.log(`🥋 Scraping World Taekwondo federation for ${athleteContext.name}...`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Search World Taekwondo website
    const searchQuery = `${athleteContext.name} ${athleteContext.country || ''}`.trim();
    const searchUrl = `https://www.worldtaekwondo.org/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`🌐 Searching: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract images from search results
    const foundImages = await page.evaluate((athleteName) => {
      const images: any[] = [];
      const imgElements = document.querySelectorAll('img[src*="jpg"], img[src*="jpeg"], img[src*="png"], img[src*="webp"]');
      
      imgElements.forEach(img => {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        
        if (src && src.startsWith('http') && alt.toLowerCase().includes(athleteName.toLowerCase().split(' ')[0])) {
          images.push({
            url: src,
            altText: alt,
            context: 'World Taekwondo Federation'
          });
        }
      });
      
      return images;
    }, athleteContext.name);
    
    foundImages.forEach(img => {
      images.push({
        url: img.url,
        source: 'worldtaekwondo.org',
        altText: img.altText,
        context: img.context,
        confidence: 0.8 // High confidence for official federation
      });
    });
    
    await browser.close();
    
    console.log(`🥋 Found ${images.length} images from Taekwondo federation`);
    
  } catch (error) {
    console.error(`❌ Error scraping Taekwondo federation:`, error);
  }
  
  return images;
}

// Scrape major sports news outlets
async function scrapeSportsNews(athleteContext: AthleteContext): Promise<ScrapedImage[]> {
  const images: ScrapedImage[] = [];
  
  try {
    console.log(`📰 Scraping sports news sites for ${athleteContext.name}...`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Search ESPN for athlete images
    const searchQuery = `${athleteContext.name} ${athleteContext.sport || ''} ${athleteContext.country || ''}`.trim();
    const espnSearchUrl = `https://www.espn.com/search/_/q/${encodeURIComponent(searchQuery)}`;
    
    try {
      await page.goto(espnSearchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      const espnImages = await page.evaluate((athleteName) => {
        const images: any[] = [];
        const imgElements = document.querySelectorAll('img[src*="jpg"], img[src*="jpeg"], img[src*="png"], img[src*="webp"]');
        
        imgElements.forEach(img => {
          const src = img.getAttribute('src');
          const alt = img.getAttribute('alt') || '';
          
          if (src && src.startsWith('http') && (
            alt.toLowerCase().includes(athleteName.toLowerCase().split(' ')[0]) ||
            src.toLowerCase().includes(athleteName.toLowerCase().replace(' ', ''))
          )) {
            images.push({
              url: src,
              altText: alt,
              context: 'ESPN Sports News'
            });
          }
        });
        
        return images.slice(0, 3); // Limit to top 3
      }, athleteContext.name);
      
      espnImages.forEach(img => {
        images.push({
          url: img.url,
          source: 'espn.com',
          altText: img.altText,
          context: img.context,
          confidence: 0.7 // Good confidence for major news
        });
      });
      
    } catch (espnError) {
      console.log(`⚠️ ESPN search failed: ${espnError}`);
    }
    
    await browser.close();
    
    console.log(`📰 Found ${images.length} images from sports news sites`);
    
  } catch (error) {
    console.error(`❌ Error scraping sports news:`, error);
  }
  
  return images;
}

// Scrape Google Images (with careful throttling)
async function scrapeGoogleImages(athleteContext: AthleteContext): Promise<ScrapedImage[]> {
  const images: ScrapedImage[] = [];
  
  try {
    console.log(`🔍 Scraping Google Images for ${athleteContext.name} (with throttling)...`);
    
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Build comprehensive search query
    const searchTerms = [athleteContext.name];
    if (athleteContext.sport) searchTerms.push(athleteContext.sport);
    if (athleteContext.country) searchTerms.push(athleteContext.country);
    
    const searchQuery = searchTerms.join(' ');
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
    
    await page.goto(googleUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for images to load
    await page.waitForSelector('img[src]', { timeout: 10000 });
    
    // Extract image URLs
    const googleImages = await page.evaluate(() => {
      const images: any[] = [];
      const imgElements = document.querySelectorAll('img[src*="http"]');
      
      imgElements.forEach((img, index) => {
        if (index > 10) return; // Limit to prevent excessive scraping
        
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        
        if (src && src.includes('http') && !src.includes('google') && !src.includes('gstatic')) {
          images.push({
            url: src,
            altText: alt,
            context: 'Google Images'
          });
        }
      });
      
      return images.slice(0, 5); // Max 5 images from Google
    });
    
    googleImages.forEach(img => {
      images.push({
        url: img.url,
        source: 'google.com',
        altText: img.altText,
        context: img.context,
        confidence: 0.5 // Lower confidence for Google Images
      });
    });
    
    await browser.close();
    
    console.log(`🔍 Found ${images.length} images from Google Images`);
    
    // Add throttling delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error(`❌ Error scraping Google Images:`, error);
  }
  
  return images;
}

// Step 2: Use GPT-5 to rank and select the best image
async function rankImagesWithGPT5(
  images: ScrapedImage[], 
  athleteContext: AthleteContext
): Promise<ScrapedImage | null> {
  try {
    console.log(`🤖 Using GPT-5 to rank ${images.length} images for ${athleteContext.name}...`);
    
    // Build comprehensive athlete context
    const personalDetails = [];
    if (athleteContext.personalInfo?.age) personalDetails.push(`Age: ${athleteContext.personalInfo.age}`);
    if (athleteContext.personalInfo?.height) personalDetails.push(`Height: ${athleteContext.personalInfo.height}`);
    if (athleteContext.personalInfo?.weight) personalDetails.push(`Weight: ${athleteContext.personalInfo.weight}`);
    if (athleteContext.personalInfo?.position) personalDetails.push(`Position: ${athleteContext.personalInfo.position}`);
    
    const contextDescription = [
      `Athlete: ${athleteContext.name}`,
      athleteContext.sport ? `Sport: ${athleteContext.sport}` : '',
      athleteContext.country ? `Country: ${athleteContext.country}` : '',
      personalDetails.length > 0 ? `Personal Details: ${personalDetails.join(', ')}` : ''
    ].filter(Boolean).join('\n');
    
    // Create image descriptions for GPT-5
    const imageDescriptions = images.map((img, index) => ({
      index: index + 1,
      url: img.url,
      source: img.source,
      altText: img.altText || 'No description',
      context: img.context || 'Unknown context',
      confidence: img.confidence
    }));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user", 
        content: `You are an expert at identifying athletes in photos. I need you to analyze these ${images.length} candidate images and select the BEST one that shows "${athleteContext.name}".

ATHLETE CONTEXT:
${contextDescription}

CANDIDATE IMAGES:
${imageDescriptions.map(img => 
  `${img.index}. Source: ${img.source}
     URL: ${img.url}
     Description: ${img.altText}
     Context: ${img.context}
     Confidence: ${img.confidence}`
).join('\n\n')}

REQUIREMENTS:
- Must be a clear, professional photo of the athlete
- Should show the person's face clearly
- Avoid team photos or group shots
- Prefer official sources (federations, news outlets)
- Consider the athlete's sport, age, and physical characteristics

Please respond in JSON format:
{
  "selectedIndex": <number 1-${images.length}>,
  "reasoning": "<explanation of why this image is the best match>",
  "confidence": <0.1-1.0 confidence score>
}

If none of the images are suitable, respond with selectedIndex: 0.`
      }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    const gptResponse = response.choices[0]?.message?.content;
    if (!gptResponse) {
      console.log(`❌ No response from GPT-5 for image ranking`);
      return null;
    }
    
    console.log(`🤖 GPT-5 ranking response: ${gptResponse}`);
    
    try {
      const selection = JSON.parse(gptResponse);
      
      if (selection.selectedIndex === 0) {
        console.log(`❌ GPT-5 determined no images are suitable: ${selection.reasoning}`);
        return null;
      }
      
      const selectedImage = images[selection.selectedIndex - 1];
      console.log(`✅ GPT-5 selected image ${selection.selectedIndex}: ${selectedImage.url}`);
      console.log(`📋 Reasoning: ${selection.reasoning}`);
      
      return selectedImage;
      
    } catch (parseError) {
      console.error(`❌ Error parsing GPT-5 response:`, parseError);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error in GPT-5 image ranking:`, error);
    return null;
  }
}

// Step 3: Validate image URL accessibility
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    console.log(`🔍 Validating image URL: ${url}`);
    
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