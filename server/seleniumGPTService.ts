import { Builder, By, WebDriver, until, WebElement, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import OpenAI from 'openai';
import { z } from 'zod';
import { broadcastRankingProgress } from './routes';

// Ranking sites configuration (same as BrowserUse)
const RANKING_SITES = {
  "Athletics": {
    "organization": "World Athletics",
    "ranking_url": "https://worldathletics.org/world-rankings/introduction",
    "note": "World Athletics publishes World Rankings for events"
  },
  "Taekwondo": {
    "organization": "World Taekwondo",
    "ranking_url": "https://worldtkd.simplycompete.com/playerRankingV2?limit=25&pageNo=1&month=9&year=2025&rankingCategoryId=11ef3918-68c6-28dd-8999-023374a4dcc1&subCategory1=11ef3918-30a6-2db9-8999-023374a4dcc1&rankingTypeId=11ef3916-58d3-484e-8999-023374a4dcc1",
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
    "ranking_url": "https://fie.org/athletes/search",
    "note": "FIE athlete search page - search by last name OR first name only"
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

// Zod schema for o3 rank extraction - updated to handle multiple rankings
const O3SingleRankDataSchema = z.object({
  rank: z.string().describe("The athlete's rank number (e.g., '1', '18', '44')"),
  category: z.string().describe("The ranking category/weight class/type (e.g., 'Olympic', 'World', 'Freestyle 61kg', 'Senior Male −58 kg')"),
  points: z.string().optional().describe("Points/score if visible (e.g., '55.92', '120.5')"),
  totalAthletes: z.string().optional().describe("Total number of athletes in category if visible"),
  lastUpdated: z.string().optional().describe("Last update date if visible")
});

const O3RankDataSchema = z.object({
  rankings: z.array(O3SingleRankDataSchema).min(1).describe("Array of all rankings found for the athlete (Olympic, World, different weight classes, etc.)")
});

class SeleniumGPTService {
  private driver: WebDriver | null = null;
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  private async initDriver(): Promise<WebDriver> {
    if (this.driver) return this.driver;

    const options = new chrome.Options();
    
    // Set binary path for Chromium (installed via Nix)
    options.setChromeBinaryPath('/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium');
    
    // Configure for headless operation in Replit environment
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-software-rasterizer');
    options.addArguments('--disable-extensions');
    options.addArguments('--disable-setuid-sandbox');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Anti-bot detection: disable automation flags
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.excludeSwitches('enable-automation');
    options.addArguments('--disable-web-security');

    const service = new chrome.ServiceBuilder('/nix/store/3qnxr5x6gw3k9a9i7d0akz0m6bksbwff-chromedriver-125.0.6422.141/bin/chromedriver');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(service)
      .build();

    // Anti-bot detection: Use CDP to inject script on every page load
    const cdpConnection = await (this.driver as any).createCDPConnection('page');
    
    // Send CDP command to add script that executes on every new document
    await cdpConnection.execute('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        
        // Override plugins to appear real
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // Chrome runtime detection
        window.chrome = {
          runtime: {}
        };
      `
    });

    console.log(`✅ Anti-bot detection bypass injected via CDP`);

    return this.driver;
  }

  private async takeScreenshot(): Promise<string> {
    if (!this.driver) throw new Error('Driver not initialized');
    
    // Take screenshot and return as base64
    const screenshot = await this.driver.takeScreenshot();
    return screenshot;
  }

  private async getPageSnapshot(): Promise<string> {
    if (!this.driver) throw new Error('Driver not initialized');

    // Get page HTML
    const pageSource = await this.driver.getPageSource();
    
    // Get current URL
    const currentUrl = await this.driver.getCurrentUrl();
    
    // Get visible text content
    const bodyText = await this.driver.findElement(By.tagName('body')).getText();

    // Get all clickable elements
    const clickableElements = await this.driver.findElements(
      By.css('a, button, input[type="submit"], input[type="button"], [role="button"]')
    );

    let elementsInfo = '';
    for (let i = 0; i < Math.min(clickableElements.length, 50); i++) { // Limit to first 50 elements
      try {
        const text = await clickableElements[i].getText();
        const href = await clickableElements[i].getAttribute('href');
        const id = await clickableElements[i].getAttribute('id');
        const className = await clickableElements[i].getAttribute('class');
        
        if (text || href || id) {
          elementsInfo += `\nElement ${i}: text="${text}", href="${href}", id="${id}", class="${className}"`;
        }
      } catch (e) {
        // Element might be stale, skip it
      }
    }

    return `
Current URL: ${currentUrl}

Visible Text Content:
${bodyText.substring(0, 5000)} // Limit text to first 5000 chars

Clickable Elements:
${elementsInfo}

Page HTML Structure (first 3000 chars):
${pageSource.substring(0, 3000)}
`;
  }

  private async getPageSnapshotWithScreenshot(): Promise<{ html: string, screenshot: string }> {
    if (!this.driver) throw new Error('Driver not initialized');

    const pageSource = await this.driver.getPageSource();
    const currentUrl = await this.driver.getCurrentUrl();
    const bodyText = await this.driver.findElement(By.tagName('body')).getText();
    
    // Get clickable elements
    const clickableElements = await this.driver.findElements(
      By.css('a, button, input[type="submit"], input[type="button"], [role="button"], input[type="text"], input[type="search"]')
    );

    let elementsInfo = '';
    for (let i = 0; i < Math.min(clickableElements.length, 50); i++) {
      try {
        const tagName = await clickableElements[i].getTagName();
        const text = await clickableElements[i].getText();
        const href = await clickableElements[i].getAttribute('href');
        const id = await clickableElements[i].getAttribute('id');
        const className = await clickableElements[i].getAttribute('class');
        const placeholder = await clickableElements[i].getAttribute('placeholder');
        
        if (text || href || id || placeholder) {
          elementsInfo += `\nElement ${i} [${tagName}]: text="${text}", href="${href}", id="${id}", class="${className}", placeholder="${placeholder}"`;
        }
      } catch (e) {
        // Element might be stale, skip it
      }
    }

    const htmlSnapshot = `
Current URL: ${currentUrl}

Visible Text (first 3000 chars):
${bodyText.substring(0, 3000)}

Interactive Elements (first 50):
${elementsInfo}

Page HTML (first 2000 chars):
${pageSource.substring(0, 2000)}
`;

    const screenshot = await this.takeScreenshot();
    
    return { html: htmlSnapshot, screenshot };
  }

  private async discoverAthleteCategory(
    athleteName: string,
    country: string,
    sport: string,
    personalInfo?: any
  ): Promise<string[]> {
    console.log(`🔍 Using o3 web search to find ALL categories for ${athleteName} in ${sport}...`);
    
    try {
      const prompt = `Find ALL categories/divisions that ${athleteName} from ${country} currently competes in or has competed in within the past 2 seasons for ${sport}.

CRITICAL: Extract EVERY category/weight class the athlete competes in. Many athletes compete in multiple categories.

For different sports, categories include:
- Taekwondo/Boxing/Wrestling: Weight category (e.g., "M-58kg", "F-49kg", "-74kg", "-80kg")
- Fencing: Weapon type (e.g., "Épée", "Foil", "Sabre")
- Judo: Weight category (e.g., "-60kg", "+100kg")
- Athletics: Event specialization (e.g., "100m", "Marathon", "High Jump")

${personalInfo ? `Known athlete info:
- Gender: ${personalInfo.gender || 'Unknown'}
- Age: ${personalInfo.age || 'Unknown'}
- Category: ${personalInfo.category || 'Unknown'}
- Height: ${personalInfo.height || 'Unknown'}
- Position: ${personalInfo.position || 'Unknown'}
` : ''}

Use web search to find ALL specific categories they compete in. Return ONLY a valid JSON array of category strings.

Examples:
- Single category: ["M-58kg"]
- Multiple categories: ["-74kg", "-80kg"]
- Fencing: ["Épée"]

If no categories found, return: []`;

      const response = await this.openai.responses.create({
        model: "o3",
        tools: [{ type: "web_search_preview" }],
        input: prompt
      });

      const outputText = response.output_text?.trim() || '[]';
      console.log(`📋 Raw o3 response for category discovery: "${outputText}"`);
      
      // Try to parse JSON response
      try {
        const categories = JSON.parse(outputText);
        if (Array.isArray(categories) && categories.length > 0) {
          // Normalize categories: remove gender prefix if present, standardize kg notation
          const normalized = categories.map((cat: string) => {
            let normalized = cat.trim();
            // Remove M- or F- prefix if present (e.g., "M-74kg" -> "-74kg")
            normalized = normalized.replace(/^[MF]-/, '-');
            // Ensure consistent format
            return normalized;
          });
          
          console.log(`✅ Found ${normalized.length} categor${normalized.length > 1 ? 'ies' : 'y'}: ${normalized.join(', ')}`);
          return normalized;
        }
      } catch (parseError) {
        console.log(`⚠️ Failed to parse JSON, trying to extract category from text...`);
        // Fallback: try to extract a single category from plain text
        if (outputText.toLowerCase() !== 'null' && outputText.length > 0 && outputText.length < 50) {
          const normalized = outputText.replace(/^[MF]-/, '-');
          console.log(`✅ Found category (fallback): ${normalized}`);
          return [normalized];
        }
      }
      
      console.log(`⚠️ No specific categories found`);
      return [];
    } catch (error) {
      console.error(`❌ Error in category discovery: ${error}`);
      return [];
    }
  }

  private async executeGPT4oNavigationStep(
    athleteName: string,
    country: string,
    sport: string,
    stepNumber: number,
    personalInfo?: any,
    athleteCategories?: string[]
  ): Promise<{ action: string, completed: boolean, rankData?: any }> {
    console.log(`🤖 o3 Navigation Step ${stepNumber}...`);
    
    const { html, screenshot } = await this.getPageSnapshotWithScreenshot();
    
    const response = await this.openai.chat.completions.create({
      model: "o3",
      messages: [
        {
          role: "system",
          content: `You are controlling a Selenium WebDriver to find an athlete's ranking on a sports website.

Your goal: Navigate to find all of ${athleteName}'s ranks in ${sport}, who is from ${country}.

${athleteCategories && athleteCategories.length > 0 ? `**ATHLETE CATEGORIES:** ${athleteCategories.join(', ')}
This athlete competes in ${athleteCategories.length > 1 ? 'these categories' : 'this category'}. Use this information to select the correct weight/weapon/division filters.
${athleteCategories.length > 1 ? `IMPORTANT: Try ALL categories (${athleteCategories.join(', ')}) to find rankings. The athlete may have rankings in multiple weight classes.` : ''}
` : ''}

${personalInfo ? `**ATHLETE PERSONAL INFORMATION:**
${JSON.stringify(personalInfo, null, 2)}

Use this personal information (especially age, weight, gender, height) to help navigate weight categories and filters on the ranking website.
` : ''}

**GENERAL NAVIGATION STRATEGY:**
Sometimes in search we will have to navigate different weights (categories) to properly search for the player. Some other times using the country of the player might be beneficial. In almost all cases, to get all of the ranks of a certain athlete, we have to click on the player themselves or search for them.

**SPORT-SPECIFIC INSTRUCTIONS:**

**TAEKWONDO (worldtkd.simplycompete.com):**
This is an AngularJS application. The page may take time to load. WAIT and look for these specific elements:

**CRITICAL - EXACT ELEMENTS TO LOOK FOR:**
1. **Athlete Name Search Box**: An input field with placeholder "Search by name or by Member ID"
   - This input has ng-model="playerRankingV2.formData.searchQuery"
   - Type the athlete's full name here (e.g., "Rami Eissa")
   
2. **Weight Category Dropdown**: A dropdown with class "selectize-input" for selecting weight
   - Look for text like "Weight Category" or weight labels (M-58kg, M-68kg, M-74kg, M-80kg, etc.)
   - Click to open the dropdown, then select the athlete's weight category
   - **CRITICAL WEIGHT MAPPING**: If exact weight not available, select next HIGHER weight class
     * Example: -74kg athlete → select -80kg if -74kg not available

3. **Ranking Category Dropdown**: Another dropdown with class "selectize-input"
   - This controls which type of ranking to display (Olympic, World, Continental, National)
   - Try different ranking categories to extract ALL rankings for the athlete

**STEPS TO FOLLOW:**
1. WAIT for page elements to load (you may see them after scrolling or waiting)
2. Use select_from_dropdown to select the athlete's weight category (CRITICAL FIRST STEP for Taekwondo)
3. Type the athlete's name in the search input field (placeholder: "Search by name or by Member ID")
4. After search results load, CLICK on the athlete's name/row in the results table
5. Wait for the athlete's detail page to load
6. Extract ALL visible rankings from the athlete's profile page

**CRITICAL FOR TAEKWONDO (simplycompete.com):**
- First select weight category from dropdown
- Then type athlete name in search field
- You MUST click on the athlete's name in the results table after search
- Only AFTER clicking and loading their profile page can you extract rankings
- DO NOT try to extract from the search results table

**Important**: If the page appears blank, scroll to find the search filters and ranking table. The content may be below the navigation header.

**FENCING (fie.org/athletes/search):**
Critical Search Rule: Search with ONLY the last name OR first name. NOT both together.
- Example: Search "LIM" OR "Taehee", not "LIM Taehee"
- Searching with both names will not work on the FIE website
- After getting results, select the correct athlete from the list
- Extract all rankings visible on their profile page

Available actions:
- select_from_dropdown: Select value from AngularJS selectize dropdown (provide: dropdown_text - the visible text to select, like "M-74 kg" or "World Kyorugi Rankings")
- type_in_input: Type text into an input field (provide: element_index from Interactive Elements list, text)
- click: Click an element (provide: element_index from Interactive Elements list)
- scroll_down: Scroll down the page
- scroll_up: Scroll up the page (use this to go back to the top or find elements above)
- extract: Extract ranking data when you can see the athlete's rank number on screen
- not_found: When you've exhausted all options and cannot find the ranking

**CRITICAL**: You MUST return valid JSON only. No explanations, no markdown, just pure JSON.

**JSON Response Format:**

For navigation actions (type_in_input, click, scroll):
{
  "action": "type_in_input",
  "element_index": 5,
  "text": "Athlete Name",
  "reasoning": "Using search box to find athlete"
}

For extraction (when you see the rank):
{
  "action": "extract",
  "reasoning": "Found athlete's rankings on current page",
  "rank_data": {
    "rankings": [
      {
        "rank": "18",
        "category": "Olympic Ranking",
        "points": "55.92"
      },
      {
        "rank": "22",
        "category": "World Ranking",
        "points": "48.50"
      }
    ]
  }
}

**rank_data structure (REQUIRED when action is "extract"):**
⚠️ CRITICAL: Extract ALL rankings visible for the athlete. Many athletes have MULTIPLE rankings:
   - Olympic rankings
   - World rankings  
   - Different weight classes (e.g., M-54 kg, M-58 kg)
   - Different divisions (Senior, Junior, Olympic, World Kyorugi)
   
DO NOT extract just one ranking - look for ALL visible ranking cards, tables, or sections showing this athlete's rank.

- rankings: ARRAY of ranking objects (one for EACH visible ranking), each containing:
  - rank: STRING - The athlete's rank number (e.g., "1", "3", "267")
  - category: STRING - FULL category with weight class AND division (e.g., "M-58 kg | Olympic Senior Division | Olympic Kyorugi Rankings", "M-54 kg | World Senior Division | World Kyorugi Rankings")
  - points: STRING (optional) - Points/score if visible (e.g., "93.02", "59.34")
  - totalAthletes: STRING (optional) - Total athletes in category if visible
  - lastUpdated: STRING (optional) - Last update date if visible

Example: If you see 3 ranking boxes showing ranks 3, 1, and 267 for different weight classes, extract all 3 with their complete category names.

**Strategy Tips:**
- Try searching by athlete name in search boxes
- Filter by country (${country}) if country filters are available
- Navigate different weight categories or divisions if they're visible
- Click on athlete profiles to see their complete ranking information
- If the current site doesn't show results, you can navigate to Google to search for ranking information
- Explore tabs, dropdowns, and category filters to find all rankings

**Examples of valid responses:**

Example 1 - Selecting from AngularJS dropdown (Taekwondo):
{"action": "select_from_dropdown", "dropdown_text": "M-74 kg", "reasoning": "Selecting athlete's weight category"}

Example 2 - Clicking athlete name in search results (CRITICAL for Taekwondo):
{"action": "click", "element_index": 5, "reasoning": "Clicking on Rami Eissa in the search results to view profile"}

Example 3 - Scrolling:
{"action": "scroll_down", "reasoning": "Need to scroll down to reveal more elements or ranking table"}

Example 4 - Extracting ranks (MOST IMPORTANT - extract ALL visible rankings):
{"action": "extract", "reasoning": "On athlete's profile page with rankings visible", "rank_data": {"rankings": [{"rank": "19", "category": "M-74 kg Olympic Ranking", "points": "55.92"}]}}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Step ${stepNumber}: Find all of ${athleteName}'s rankings for ${sport} (from ${country}).

Current page info:
${html}

Analyze the screenshot and HTML. What action should we take next to find ${athleteName}'s rankings?

Remember: You need to find ALL of this athlete's rankings across different categories/weight classes. Use creative navigation strategies:
- Search by name or use country filters
- Navigate through different weight categories or divisions
- Click on athlete profiles to reveal complete ranking data
- If stuck, try alternative approaches or even search Google

**CRITICAL**: When you find the athlete's rankings, extract ALL ranking categories visible (e.g., Olympic Ranking, World Ranking, different weight classes). Do not extract just one ranking.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${screenshot}`
              }
            }
          ]
        }
      ],
      max_completion_tokens: 8000
    });

    const content = response.choices[0].message.content || '{}';
    console.log(`🔍 o3 decision: ${content.substring(0, 300)}...`);

    // Parse response - remove markdown code fences
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    try {
      const decision = JSON.parse(cleanedContent);
      
      // Validate rank_data structure when action is "extract"
      if (decision.action === 'extract' && decision.rank_data) {
        // Backward compatibility: if rank_data is a single ranking object, wrap it in an array
        let rankDataToValidate = decision.rank_data;
        if (decision.rank_data.rank && decision.rank_data.category && !decision.rank_data.rankings) {
          console.log(`⚠️ Converting single rank format to array format for backward compatibility`);
          rankDataToValidate = { rankings: [decision.rank_data] };
        }
        
        const validationResult = O3RankDataSchema.safeParse(rankDataToValidate);
        if (!validationResult.success) {
          console.error(`❌ Invalid rank_data structure:`, validationResult.error.errors);
          console.error(`Received rank_data:`, JSON.stringify(decision.rank_data, null, 2));
          return { 
            action: 'error', 
            completed: true
          };
        }
        console.log(`✅ Valid rank_data extracted (${validationResult.data.rankings.length} ranking(s)):`, JSON.stringify(validationResult.data, null, 2));
        // Normalize rank_data to rankData for type consistency
        decision.rankData = validationResult.data;
      }
      
      console.log(`✅ Action: ${decision.action} - ${decision.reasoning}`);
      return {
        ...decision,
        completed: decision.action === 'extract' || decision.action === 'not_found'
      };
    } catch (e) {
      console.error(`❌ Error parsing o3 response: ${e}`);
      console.error(`Raw content: ${content}`);
      return { action: 'error', completed: true };
    }
  }

  async fetchAthleteRankings(
    athleteName: string,
    country: string,
    sport: string,
    athleteId?: string,
    personalInfo?: any
  ): Promise<AthleteRankings | null> {
    console.log(`🤖 Fetching rankings for ${athleteName} (${sport}, ${country}) using o3 Vision Control...`);
    
    if (athleteId) {
      broadcastRankingProgress(athleteId, `Starting ranking search for ${athleteName}`, 'init');
    }

    try {
      if (athleteId) {
        broadcastRankingProgress(athleteId, 'Initializing browser...', 'browser_init');
      }
      await this.initDriver();

      // Get sport-specific ranking site
      const sportInfo = RANKING_SITES[sport as keyof typeof RANKING_SITES];
      if (!sportInfo) {
        console.log(`⚠️ No specific ranking site configured for ${sport}`);
        if (athleteId) {
          broadcastRankingProgress(athleteId, `No ranking site configured for ${sport}`, 'error', true, 'NO_SITE_CONFIGURED');
        }
        return null;
      }

      // Step 1: Discover athlete's categories using web search
      let athleteCategories: string[] = [];
      if (athleteId) {
        broadcastRankingProgress(athleteId, `Discovering athlete's categories...`, 'web_search');
      }
      athleteCategories = await this.discoverAthleteCategory(athleteName, country, sport, personalInfo);
      
      if (athleteCategories.length > 0) {
        console.log(`📋 Athlete categor${athleteCategories.length > 1 ? 'ies' : 'y'} discovered: ${athleteCategories.join(', ')}`);
        if (athleteId) {
          broadcastRankingProgress(athleteId, `Categor${athleteCategories.length > 1 ? 'ies' : 'y'} found: ${athleteCategories.join(', ')}`, 'category_found');
        }
      }

      // Step 2: Navigate to ranking website
      if (athleteId) {
        broadcastRankingProgress(athleteId, `Navigating to ${sportInfo.organization}...`, 'navigation');
      }
      console.log(`🌐 Navigating to ${sportInfo.organization}: ${sportInfo.ranking_url}`);
      await this.driver!.get(sportInfo.ranking_url);
      
      // AngularJS apps (like simplycompete.com) need special wait handling
      const isAngularJS = sportInfo.ranking_url.includes('simplycompete.com');
      if (isAngularJS) {
        console.log(`⏳ Waiting for AngularJS app to load...`);
        await this.driver!.sleep(5000); // Initial wait for Angular to bootstrap
        
        // Wait for Angular HTTP requests to complete
        try {
          await this.driver!.wait(async () => {
            const isAngularReady = await this.driver!.executeScript(`
              try {
                if (typeof angular === 'undefined') return false;
                var injector = window.angular.element('body').injector();
                if (!injector) return false;
                var $http = injector.get('$http');
                return ($http.pendingRequests.length === 0);
              } catch(e) {
                return false;
              }
            `);
            return isAngularReady;
          }, 15000);
          console.log(`✅ AngularJS app loaded and HTTP requests completed`);
          
          // Additional wait for DOM to fully render
          await this.driver!.sleep(3000);
          
          // Scroll to top to ensure filters are visible
          await this.driver!.executeScript('window.scrollTo(0, 0)');
          await this.driver!.sleep(1000);
          
          // Wait for specific elements to be visible
          await this.driver!.wait(async () => {
            const hasContent = await this.driver!.executeScript(`
              return document.querySelectorAll('input, button, .selectize-input').length > 0;
            `);
            return hasContent;
          }, 10000).catch(() => console.log(`⚠️ Could not find interactive elements`));
          
          console.log(`✅ AngularJS page fully rendered`);
          
          // Debug: Save screenshot to see what o3 will see
          try {
            const screenshot = await this.driver!.takeScreenshot();
            const fs = await import('fs');
            const path = await import('path');
            const debugDir = path.join(process.cwd(), 'debug_screenshots');
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            const debugPath = path.join(debugDir, `angular_loaded_${Date.now()}.png`);
            fs.writeFileSync(debugPath, screenshot, 'base64');
            console.log(`📸 Debug screenshot saved to: ${debugPath}`);
          } catch (screenshotError) {
            console.log(`⚠️ Could not save debug screenshot: ${screenshotError}`);
          }
        } catch (e) {
          console.log(`⚠️ Could not verify Angular status, proceeding anyway...`);
        }
      } else {
        await this.driver!.sleep(3000);
      }

      // Step 3: o3-controlled navigation loop
      const maxSteps = 10;
      let stepNumber = 1;
      let rankData = null;

      while (stepNumber <= maxSteps && !rankData) {
        if (athleteId) {
          broadcastRankingProgress(athleteId, `AI analyzing page (step ${stepNumber}/${maxSteps})...`, 'ai_analysis');
        }
        const decision = await this.executeGPT4oNavigationStep(athleteName, country, sport, stepNumber, personalInfo, athleteCategories);
        
        if (decision.action === 'extract' && decision.rankData && decision.rankData.rankings && decision.rankData.rankings.length > 0) {
          console.log(`✅ o3 extracted ${decision.rankData.rankings.length} ranking(s): ${JSON.stringify(decision.rankData)}`);
          if (athleteId) {
            const rankSummary = decision.rankData.rankings.map((r: any) => `${r.category}: #${r.rank}`).join(', ');
            broadcastRankingProgress(athleteId, `Found rankings: ${rankSummary}`, 'extract', true);
          }
          rankData = decision.rankData;
          break;
        } else if (decision.action === 'extract') {
          console.log(`⚠️ o3 tried to extract but rank data is empty or invalid, continuing...`);
        }

        if (decision.action === 'not_found' || decision.action === 'error') {
          console.log(`⚠️ o3 could not find ranking after ${stepNumber} steps`);
          if (athleteId) {
            broadcastRankingProgress(athleteId, `Ranking not found after ${stepNumber} attempts`, 'not_found', true);
          }
          break;
        }

        // Execute the action GPT-4o decided on
        try {
          const { action, element_index, text: actionText, dropdown_text } = decision as any;
          
          if (action === 'select_from_dropdown' && dropdown_text) {
            console.log(`📋 Selecting "${dropdown_text}" from AngularJS dropdown...`);
            if (athleteId) {
              broadcastRankingProgress(athleteId, `Selecting "${dropdown_text}" from dropdown...`, 'selecting');
            }
            
            // Implementation based on GPT-5 reference: click selectize-input, find ui-select-search, type and press ENTER
            const selectizeInputs = await this.driver!.findElements(By.css('div.selectize-input'));
            let selected = false;
            
            for (const selectizeInput of selectizeInputs) {
              try {
                // Click to open the dropdown
                await this.driver!.executeScript('arguments[0].click();', selectizeInput);
                await this.driver!.sleep(500);
                
                // Find the internal search input
                let searchInput;
                try {
                  searchInput = await selectizeInput.findElement(By.css('input.ui-select-search'));
                } catch {
                  // Fallback: find globally
                  searchInput = await this.driver!.findElement(By.css('input.ui-select-search'));
                }
                
                // Clear, type, and press ENTER
                await searchInput.clear();
                await searchInput.sendKeys(dropdown_text);
                await this.driver!.sleep(500);
                await searchInput.sendKeys(Key.ENTER);
                await this.driver!.sleep(2000);
                
                console.log(`✅ Selected "${dropdown_text}" from dropdown`);
                selected = true;
                break;
              } catch (e) {
                // Try next selectize input
                continue;
              }
            }
            
            if (!selected) {
              console.error(`❌ Could not select "${dropdown_text}" from any dropdown`);
            }
            // Weight category selected, now o3 should type in search field
          } else if (action === 'type_in_input' && typeof element_index === 'number' && actionText) {
            console.log(`⌨️ Typing "${actionText}" into element ${element_index}...`);
            if (athleteId) {
              broadcastRankingProgress(athleteId, `Typing "${actionText}" in search field...`, 'typing');
            }
            // Get the element from the list
            const elements = await this.driver!.findElements(
              By.css('a, button, input[type="submit"], input[type="button"], [role="button"], input[type="text"], input[type="search"]')
            );
            if (element_index < elements.length) {
              const element = elements[element_index];
              
              try {
                // Try standard Selenium method first
                await element.clear();
                await element.sendKeys(actionText);
                await element.sendKeys('\n'); // Press Enter
              } catch (sendKeysError) {
                console.log(`⚠️ sendKeys failed, trying advanced AngularJS method...`);
                
                // For AngularJS inputs, we need to use a more sophisticated approach
                await this.driver!.executeScript(`
                  var element = arguments[0];
                  var value = arguments[1];
                  
                  // Focus the element first
                  element.focus();
                  
                  // Clear existing value completely
                  element.value = '';
                  
                  // For AngularJS, we need to simulate typing character by character
                  function simulateTyping(elem, text) {
                    // Set the value
                    elem.value = text;
                    
                    // Create and dispatch input event
                    var inputEvent = new Event('input', { bubbles: true, cancelable: true });
                    elem.dispatchEvent(inputEvent);
                    
                    // Create and dispatch change event  
                    var changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    elem.dispatchEvent(changeEvent);
                    
                    // Create and dispatch keyup event
                    var keyupEvent = new KeyboardEvent('keyup', { 
                      bubbles: true, 
                      cancelable: true,
                      key: 'a',
                      keyCode: 65
                    });
                    elem.dispatchEvent(keyupEvent);
                  }
                  
                  // Simulate typing
                  simulateTyping(element, value);
                  
                  // AngularJS-specific: Update the model directly
                  if (typeof angular !== 'undefined') {
                    try {
                      var ngElement = angular.element(element);
                      var ngModel = element.getAttribute('ng-model');
                      
                      if (ngModel) {
                        // Get the scope and update the model
                        var scope = ngElement.scope();
                        
                        // Parse the ng-model path (e.g., "playerRankingV2.formData.searchQuery")
                        var modelParts = ngModel.split('.');
                        var obj = scope;
                        
                        // Navigate to the parent object
                        for (var i = 0; i < modelParts.length - 1; i++) {
                          if (!obj[modelParts[i]]) {
                            obj[modelParts[i]] = {};
                          }
                          obj = obj[modelParts[i]];
                        }
                        
                        // Set the final property
                        obj[modelParts[modelParts.length - 1]] = value;
                        
                        // Trigger digest cycle
                        if (!scope.$$phase) {
                          scope.$apply();
                        }
                        
                        // Also trigger Angular's input handler
                        ngElement.triggerHandler('input');
                        ngElement.triggerHandler('change');
                        
                        console.log('Updated ng-model: ' + ngModel + ' to: ' + value);
                      }
                    } catch (angularError) {
                      console.error('Angular model update failed:', angularError);
                      // Fallback: just ensure the value is set
                      element.value = value;
                    }
                  }
                  
                  // Final trigger of Enter key
                  var enterEvent = new KeyboardEvent('keydown', { 
                    bubbles: true, 
                    cancelable: true,
                    key: 'Enter',
                    keyCode: 13
                  });
                  element.dispatchEvent(enterEvent);
                `, element, actionText);
                
                console.log(`✅ Advanced AngularJS input method completed`);
                
                // Give Angular time to process and potentially trigger search
                await this.driver!.sleep(3000);
                
                // If on simplycompete.com, also trigger search button click as backup
                const currentUrl = await this.driver!.getCurrentUrl();
                if (currentUrl.includes('simplycompete.com')) {
                  console.log(`🔍 Looking for search button to trigger search...`);
                  try {
                    // Look for search button near the input
                    const searchButtons = await this.driver!.findElements(By.css('button[type="submit"], button.btn-search, button[ng-click*="search"]'));
                    if (searchButtons.length > 0) {
                      console.log(`🖱️ Clicking search button...`);
                      await searchButtons[0].click();
                      await this.driver!.sleep(2000);
                    }
                  } catch (e) {
                    console.log(`⚠️ Could not find/click search button`);
                  }
                }
              }
              
              await this.driver!.sleep(5000);
            } else {
              console.error(`❌ Element index ${element_index} out of range`);
            }
          } else if (action === 'click' && typeof element_index === 'number') {
            console.log(`🖱️ Clicking element ${element_index}...`);
            if (athleteId) {
              broadcastRankingProgress(athleteId, `Clicking navigation element...`, 'clicking');
            }
            const elements = await this.driver!.findElements(
              By.css('a, button, input[type="submit"], input[type="button"], [role="button"], input[type="text"], input[type="search"]')
            );
            if (element_index < elements.length) {
              const element = elements[element_index];
              try {
                // Try standard click first
                await element.click();
              } catch (e) {
                // If standard click fails, try JavaScript click
                console.log(`⚠️ Standard click failed, trying JavaScript click...`);
                await this.driver!.executeScript('arguments[0].click();', element);
              }
              await this.driver!.sleep(3000);
            } else {
              console.error(`❌ Element index ${element_index} out of range`);
            }
          } else if (action === 'scroll_down' || action === 'scroll') {
            console.log(`📜 Scrolling down...`);
            if (athleteId) {
              broadcastRankingProgress(athleteId, `Scrolling down to find ranking data...`, 'scrolling');
            }
            await this.driver!.executeScript('window.scrollBy(0, 800)');
            await this.driver!.sleep(2000);
          } else if (action === 'scroll_up') {
            console.log(`📜 Scrolling up...`);
            if (athleteId) {
              broadcastRankingProgress(athleteId, `Scrolling up to find filters...`, 'scrolling');
            }
            await this.driver!.executeScript('window.scrollBy(0, -800)');
            await this.driver!.sleep(2000);
          }
        } catch (error) {
          console.error(`❌ Error executing action: ${error}`);
        }

        stepNumber++;
      }

      // Return formatted results with all extracted rankings
      if (rankData && rankData.rankings && rankData.rankings.length > 0) {
        if (athleteId) {
          broadcastRankingProgress(athleteId, `Successfully fetched ${rankData.rankings.length} ranking(s)!`, 'complete', true);
        }
        return {
          categories: rankData.rankings.map((ranking: any) => ({
            category: ranking.category || sport,
            rank: ranking.rank,
            points: ranking.points,
            totalAthletes: ranking.totalAthletes,
            lastUpdated: ranking.lastUpdated
          })),
          source: sportInfo.organization,
          fetchedAt: new Date().toISOString()
        };
      }

      console.log(`⚠️ Could not find ranking for ${athleteName}`);
      if (athleteId) {
        broadcastRankingProgress(athleteId, `Could not find ranking`, 'complete', true);
      }
      return null;

    } catch (error) {
      console.error('❌ Error fetching rankings:', error);
      if (athleteId) {
        broadcastRankingProgress(athleteId, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', true, 'FETCH_ERROR');
      }
      return null;
    } finally {
      // Clean up
      if (this.driver) {
        await this.driver.quit();
        this.driver = null;
      }
    }
  }
}

// Export a singleton instance
const seleniumGPTService = new SeleniumGPTService();

export async function fetchAthleteRankings(
  athleteName: string,
  country: string,
  sport: string,
  athleteId?: string,
  personalInfo?: any
): Promise<AthleteRankings | null> {
  return seleniumGPTService.fetchAthleteRankings(athleteName, country, sport, athleteId, personalInfo);
}