import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY
});

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
    
    // Set up Chrome options for headless browsing
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-setuid-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--disable-gpu');
    chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
    chromeOptions.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    try {
      // Search World Taekwondo website
      const searchQuery = `${athleteContext.name} ${athleteContext.country || ''}`.trim();
      const searchUrl = `https://www.worldtaekwondo.org/?s=${encodeURIComponent(searchQuery)}`;
      
      console.log(`🌐 Searching: ${searchUrl}`);
      
      await driver.get(searchUrl);
      await driver.wait(until.elementLocated(By.tagName('body')), 30000);
      
      // Extract images from search results
      const imgElements = await driver.findElements(By.css('img[src*="jpg"], img[src*="jpeg"], img[src*="png"], img[src*="webp"]'));
      
      for (const imgElement of imgElements) {
        try {
          const src = await imgElement.getAttribute('src');
          const alt = await imgElement.getAttribute('alt') || '';
          
          if (src && src.startsWith('http') && alt.toLowerCase().includes(athleteContext.name.toLowerCase().split(' ')[0])) {
            images.push({
              url: src,
              source: 'worldtaekwondo.org',
              altText: alt,
              context: 'World Taekwondo Federation',
              confidence: 0.8 // High confidence for official federation
            });
          }
        } catch (elementError) {
          console.log(`⚠️ Error processing image element:`, elementError);
          continue;
        }
      }
      
    } finally {
      await driver.quit();
    }
    
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
    
    // Set up Chrome options for headless browsing
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-setuid-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--disable-gpu');
    chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
    chromeOptions.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    try {
      // Search ESPN for athlete images
      const searchQuery = `${athleteContext.name} ${athleteContext.sport || ''} ${athleteContext.country || ''}`.trim();
      const espnSearchUrl = `https://www.espn.com/search/_/q/${encodeURIComponent(searchQuery)}`;
      
      await driver.get(espnSearchUrl);
      await driver.wait(until.elementLocated(By.tagName('body')), 15000);
      
      const imgElements = await driver.findElements(By.css('img[src*="jpg"], img[src*="jpeg"], img[src*="png"], img[src*="webp"]'));
      
      let foundCount = 0;
      for (const imgElement of imgElements) {
        if (foundCount >= 3) break; // Limit to top 3
        
        try {
          const src = await imgElement.getAttribute('src');
          const alt = await imgElement.getAttribute('alt') || '';
          
          if (src && src.startsWith('http') && (
            alt.toLowerCase().includes(athleteContext.name.toLowerCase().split(' ')[0]) ||
            src.toLowerCase().includes(athleteContext.name.toLowerCase().replace(' ', ''))
          )) {
            images.push({
              url: src,
              source: 'espn.com',
              altText: alt,
              context: 'ESPN Sports News',
              confidence: 0.7 // Good confidence for major news
            });
            foundCount++;
          }
        } catch (elementError) {
          console.log(`⚠️ Error processing ESPN image element:`, elementError);
          continue;
        }
      }
      
    } catch (espnError) {
      console.log(`⚠️ ESPN search failed: ${espnError}`);
    } finally {
      await driver.quit();
    }
    
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
    
    // Set up Chrome options for headless browsing
    const chromeOptions = new chrome.Options();
    chromeOptions.addArguments('--headless');
    chromeOptions.addArguments('--no-sandbox');
    chromeOptions.addArguments('--disable-setuid-sandbox');
    chromeOptions.addArguments('--disable-dev-shm-usage');
    chromeOptions.addArguments('--disable-gpu');
    chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
    chromeOptions.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    try {
      // Build comprehensive search query
      const searchTerms = [athleteContext.name];
      if (athleteContext.sport) searchTerms.push(athleteContext.sport);
      if (athleteContext.country) searchTerms.push(athleteContext.country);
      
      const searchQuery = searchTerms.join(' ');
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
      
      await driver.get(googleUrl);
      await driver.wait(until.elementLocated(By.css('img[src]')), 10000);
      
      // Extract image URLs
      const imgElements = await driver.findElements(By.css('img[src*="http"]'));
      
      let foundCount = 0;
      for (const imgElement of imgElements) {
        if (foundCount >= 10) break; // Limit to prevent excessive scraping
        
        try {
          const src = await imgElement.getAttribute('src');
          const alt = await imgElement.getAttribute('alt') || '';
          
          if (src && src.includes('http') && !src.includes('google') && !src.includes('gstatic')) {
            images.push({
              url: src,
              source: 'google.com',
              altText: alt,
              context: 'Google Images',
              confidence: 0.5 // Lower confidence for Google Images
            });
            foundCount++;
            
            if (foundCount >= 5) break; // Max 5 images from Google
          }
        } catch (elementError) {
          console.log(`⚠️ Error processing Google image element:`, elementError);
          continue;
        }
      }
      
    } finally {
      await driver.quit();
    }
    
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