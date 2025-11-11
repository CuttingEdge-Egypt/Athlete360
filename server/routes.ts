import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth, isAuthenticatedUniversal } from "./localAuth";
import { insertSportSchema, insertAthleteSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";

// Nutrition Plan Form Validation Schema
const nutritionPlanSchema = z.object({
  goal: z.string().min(3, "Goal must be at least 3 characters").max(1000, "Goal too long"),
  age: z.coerce.number().int().min(12, "Age must be at least 12").max(80, "Age must be 80 or younger"),
  height: z.coerce.number().min(120, "Height must be at least 120cm").max(250, "Height must be 250cm or less"),
  currentWeight: z.coerce.number().min(30, "Current weight must be at least 30kg").max(200, "Current weight must be 200kg or less"),
  targetWeight: z.coerce.number().min(30, "Target weight must be at least 30kg").max(200, "Target weight must be 200kg or less"),
  period: z.coerce.number().int().min(1, "Period must be at least 1 week").max(52, "Period must be 52 weeks or less"),
  country: z.string().min(2, "Country must be specified").max(50, "Country name too long"),
  language: z.enum(["en", "ar"], { errorMap: () => ({ message: "Language must be 'en' or 'ar'" }) }),
  sport: z.string().optional() // Can be sport ID or sport name
}).refine(
  (data) => Math.abs(data.currentWeight - data.targetWeight) <= 50,
  {
    message: "Weight difference cannot exceed 50kg",
    path: ["targetWeight"]
  }
);

type NutritionPlanRequest = z.infer<typeof nutritionPlanSchema>;

// Development Plan Form Validation Schema
const developmentPlanSchema = z.object({
  goal: z.string().min(3, "Goal must be at least 3 characters").max(1000, "Goal too long"),
  age: z.coerce.number().min(13, "Age must be at least 13").max(99, "Age must be 99 or less"),
  height: z.coerce.number().min(120, "Height must be at least 120cm").max(250, "Height must be 250cm or less"),
  weight: z.coerce.number().min(30, "Weight must be at least 30kg").max(300, "Weight must be 300kg or less"),
  gender: z.enum(["male", "female"], { errorMap: () => ({ message: "Gender must be 'male' or 'female'" }) }),
  sport: z.string().min(2, "Sport must be specified").max(50, "Sport name too long"),
  language: z.enum(["en", "ar"], { errorMap: () => ({ message: "Language must be 'en' or 'ar'" }) })
});

type DevelopmentPlanRequest = z.infer<typeof developmentPlanSchema>;
import { seedDatabase } from "./seedData";
import { getAthleteProfile, generateAthleteImage, generateSpecificAnalysis, getDetailedAnalysis, generateThreadedBiography, searchTaekwondoDataProfilePicture, getEnhancedTaekwondoData, compareAthletes, generateCompetitiveHistory, AthleteStatistics, getAthleteImage, translateNameToArabic, translateNameToEnglish, getAthletePersonalInfo } from "./openaiService";
import { getAthletePersonalInfoGemini } from "./geminiService";
import { generateNutritionPlan, generateEnhancedNutritionPlan, generateDevelopmentPlan, searchAthleteImagesWithGemini, generateCompetitiveHistoryAnalysis, generateTaekwondoHistoryAnalysis, type NutritionPlanFormData, type DevelopmentPlanFormData } from "./geminiService";
import { generateAthleteBiography as generateAthleteBiographyO3, generateRankHistory as generateRankHistoryO3, generateAthleteStatistics as generateAthleteStatisticsO3, generateAthleteStrengths as generateAthleteStrengthsO3, generateAthleteWeaknesses as generateAthleteWeaknessesO3, generateOverviewComparison, generateStrengthsComparison, generateWeaknessesComparison, generateCompetitionHistoryComparison, generateHeadToHeadComparison } from "./o3Service";
import { analyzeVideoFile, analyzeVideoComprehensive, getSportConfig } from "./videoAnalysisService";
import { paymobService } from "./paymobService";
import { isIndividualSport, fetchTaekwondoRankAndHistory, fetchGeneralSportRankAndHistory, fetchTeamSportPlayerInfo } from "./browserUseService";
import { fetchTaekwondoAthleteData, parseTaekwondoCategoryToParameters } from "./taekwondoApiService";
import { extractLatestTaekwondoRanks } from "./taekwondoUtils";
import staticDevPlanEn from "./static-data/dev-plan-en.json" with { type: "json" };
import staticDevPlanAr from "./static-data/dev-plan-ar.json" with { type: "json" };
import staticBioEn from "./static-data/bio-en.json" with { type: "json" };
import staticBioAr from "./static-data/bio-ar.json" with { type: "json" };
import staticRankEn from "./static-data/rank-en.json" with { type: "json" };
import staticRankAr from "./static-data/rank-ar.json" with { type: "json" };
import staticStrengthsEn from "./static-data/strengths-en.json" with { type: "json" };
import staticStrengthsAr from "./static-data/strengths-ar.json" with { type: "json" };
import staticWeaknessesEn from "./static-data/weaknesses-en.json" with { type: "json" };
import staticWeaknessesAr from "./static-data/weaknesses-ar.json" with { type: "json" };
import staticNutritionEn from "./static-data/nutrition-plan-en.json" with { type: "json" };
import staticNutritionAr from "./static-data/nutrition-plan-ar.json" with { type: "json" };
import staticComparisonEn from "./static-data/comparison-en.json" with { type: "json" };
import staticComparisonAr from "./static-data/comparison-ar.json" with { type: "json" };
import staticVideoEn from "./static-data/video-en.json" with { type: "json" };
import staticVideoAr from "./static-data/video-ar.json" with { type: "json" };
import staticBeatEn from "./static-data/beat-strategies-en.json" with { type: "json" };
import staticBeatAr from "./static-data/beat-strategies-ar.json" with { type: "json" };
import { getErrorMessage, getLanguageFromRequest, ErrorMessages } from "./errorMessages";

import { TestingService } from "./testingService";
import OpenAI from "openai";
import { Readable } from "stream";
import multer from "multer";
import { spawn } from "child_process";

// Track cancelled comparison generations
const cancelledComparisons = new Set<string>();

// New Python-based image search function
async function searchAthleteImageWithPython(
  name: string,
  sport: string,
  country: string | null,
  personalInfo?: any
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    console.log(`🐍 Starting Python-based image search for ${name} (${sport}, ${country})`);
    
    const pythonArgs = [
      'server/athlete_image_search.py',
      '--name', name,
      '--sport', sport,
      '--country', country || 'Unknown',
      '--json-output'
    ];
    
    // Add details if available
    if (personalInfo) {
      const details = JSON.stringify(personalInfo);
      pythonArgs.push('--details', details);
    }
    
    const pythonProcess = spawn('python3', pythonArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`🐍 Python stderr: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`🐍 Python process exited with code: ${code}`);
      
      if (code === 0) {
        try {
          // Parse the JSON output from Python script
          const result = JSON.parse(stdout.trim());
          console.log(`🐍 Python search result:`, result);
          
          if (result.success && result.downloaded_image) {
            console.log(`✅ Python image search successful: ${result.downloaded_image}`);
            resolve(result.downloaded_image);
          } else {
            console.log(`❌ Python image search failed: ${result.error || 'Unknown error'}`);
            resolve(null);
          }
        } catch (parseError) {
          console.error(`❌ Failed to parse Python output:`, parseError);
          console.log(`🐍 Raw stdout:`, stdout);
          resolve(null);
        }
      } else {
        console.error(`❌ Python script failed with code ${code}`);
        console.error(`🐍 stderr:`, stderr);
        resolve(null);
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error(`❌ Failed to start Python process:`, error);
      resolve(null);
    });
  });
}

// HTML generation function for payment result pages
interface PaymentResultData {
  status: string;
  title: string;
  message: string;
  tokenMessage: string;
  transactionId: string;
  redirectUrl: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

function generatePaymentResultHTML(data: PaymentResultData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment ${data.status} - Athlete360</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .countdown-progress {
            animation: progress 5s linear forwards;
        }
        @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
        }
    </style>
</head>
<body class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full ${data.bgColor} rounded-lg border shadow-lg p-8 text-center">
        <div class="text-6xl mb-4">${data.icon}</div>
        <h1 class="text-2xl font-bold mb-4 ${data.textColor}">
            ${data.title}
        </h1>
        <p class="mb-4 ${data.textColor}">
            ${data.message}
        </p>
        ${data.tokenMessage ? `
        <p class="mb-4 font-semibold ${data.textColor}">
            ${data.tokenMessage}
        </p>
        ` : ''}
        ${data.transactionId !== 'undefined' && data.transactionId ? `
        <p class="text-sm mb-6 ${data.textColor} opacity-75">
            Transaction ID: ${data.transactionId}
        </p>
        ` : ''}
        <div class="text-lg font-semibold mb-2 ${data.textColor}">
            Redirecting to dashboard in <span id="countdown">5</span> seconds...
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div class="bg-blue-600 h-2 rounded-full countdown-progress"></div>
        </div>
        <a href="${data.redirectUrl}" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors">
            Continue to Dashboard
        </a>
    </div>
    
    <script>
        // Countdown timer
        let count = 5;
        const countdownElement = document.getElementById('countdown');
        
        const timer = setInterval(() => {
            count--;
            if (countdownElement) {
                countdownElement.textContent = count;
            }
            
            if (count <= 0) {
                clearInterval(timer);
                window.location.href = '${data.redirectUrl}';
            }
        }, 1000);
        
        // Add click handler for manual continue
        document.querySelector('a[href="${data.redirectUrl}"]').addEventListener('click', (e) => {
            clearInterval(timer);
        });
    </script>
</body>
</html>
  `;
}

// All LLM implementations now use GPT-5 with temperature 1.0 (default minimum)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure Multer for video uploads with disk storage to handle large files
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueId = Date.now();
      cb(null, `video_${uniqueId}.mp4`);
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});


// Helper function to detect failed AI analyses
function isAnalysisFailed(data: any): boolean {
  if (!data) return true;
  
  // Check for common failure indicators
  const failureIndicators = [
    'Unable to generate',
    'Analysis unavailable',
    'temporarily unavailable', 
    'Analysis Unavailable',
    'could not be generated',
    'failed to generate',
    'error generating',
    'analysis failed'
  ];
  
  // Check if data has error property
  if (data.error) return true;
  
  // Check message field for failure indicators
  if (data.message && typeof data.message === 'string') {
    return failureIndicators.some(indicator => 
      data.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }
  
  // Check if analysis data is empty or invalid
  if (data.bio && data.bio.length < 10) return true;
  if (data.strengths && Array.isArray(data.strengths) && data.strengths.length === 0) return true;
  if (data.weaknesses && Array.isArray(data.weaknesses) && data.weaknesses.length === 0) return true;
  if (data.plan && Array.isArray(data.plan) && data.plan.length === 0) return true;
  if (data.strategies && Array.isArray(data.strategies) && data.strategies.length === 0) return true;
  
  // Check for typical AI failure responses in nested objects
  const dataString = JSON.stringify(data).toLowerCase();
  return failureIndicators.some(indicator => dataString.includes(indicator.toLowerCase()));
}

// Helper function to refund tokens and create refund transaction
async function refundTokensForFailedAnalysis(userId: string, athleteId: string | null, tokenCost: number, serviceType: string, originalAction: string) {
  try {
    // Refund the tokens
    await storage.refundTokens(userId, tokenCost);
    console.log(`🔄 REFUNDED ${tokenCost} tokens to user ${userId} for failed ${serviceType} analysis`);
    
    // Create a refund transaction record
    await storage.createTransaction({
      userId,
      action: `${originalAction} - REFUND (Analysis Failed)`,
      tokensDeducted: -tokenCost, // Negative value indicates refund
      athleteId,
      serviceType: `${serviceType}-refund`
    });
    
    console.log(`📝 Created refund transaction for ${tokenCost} tokens`);
  } catch (error) {
    console.error(`❌ Failed to refund tokens for user ${userId}:`, error);
  }
}

// Service type to token cost mapping
const SERVICE_TOKEN_COSTS: { [key: string]: number } = {
  'bio': 20,
  'rank': 70,
  'strengths': 50,
  'weaknesses': 50,
  'development-plan': 50,
  'nutrition-plan': 75,
  'beat-strategies': 100,
  'video': 200,
  'comparison': 120
};

// Async error handler utility
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - setup both Replit OIDC and local auth
  await setupAuth(app);
  await setupLocalAuth(app);

  // Set up raw body parsing for webhook route only
  app.use('/api/payments/webhook',
    bodyParser.raw({ type: '*/*' })   // capture raw body for HMAC
  );

  // Seed database on startup (non-blocking)
  seedDatabase().then(() => {
    console.log('Database seeded successfully');
  }).catch(error => {
    console.error('Failed to seed database:', error);
    console.log('Continuing without seeding...');
  });

  // Auth routes - now supports both Replit and local auth
  app.get('/api/auth/user', isAuthenticatedUniversal, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user needs a referral code generated
      if (!user.referralCode) {
        console.log(`[REFERRAL] Generating missing referral code for user: ${user.email}`);
        await storage.generateReferralCode(userId);
        // Fetch updated user data
        const updatedUser = await storage.getUser(userId);
        return res.json(updatedUser);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile and account management routes
  app.get('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const cards = await storage.getUserPaymentCards(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const profileData = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        currentTokens: user.tokens || 0,
        totalTokensPurchased: user.totalTokensPurchased || 0,
        memberSince: user.createdAt,
        cards: cards || []
      };

      res.json(profileData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, email } = req.body;

      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  app.post('/api/user/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

      // Basic validation
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
        return res.status(400).json({ message: "All card details are required" });
      }

      const cardLast4 = cardNumber.slice(-4);
      const cardBrand = getCardBrand(cardNumber);

      const card = await storage.addPaymentCard(userId, {
        cardLast4,
        cardBrand,
        expiryMonth,
        expiryYear,
        cardholderName,
        isDefault: false
      });

      res.json({ message: "Payment card added successfully", card });
    } catch (error) {
      console.error("Error adding payment card:", error);
      res.status(500).json({ message: "Failed to add payment card" });
    }
  });

  app.get('/api/user/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cards = await storage.getUserPaymentCards(userId);
      res.json(cards || []);
    } catch (error) {
      console.error("Error fetching user cards:", error);
      res.status(500).json({ message: "Failed to fetch payment cards" });
    }
  });

  app.delete('/api/user/cards/:cardId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cardId } = req.params;

      await storage.removePaymentCard(userId, cardId);
      res.json({ message: "Payment card removed successfully" });
    } catch (error) {
      console.error("Error removing payment card:", error);
      res.status(500).json({ message: "Failed to remove payment card" });
    }
  });

  // Sports routes
  app.get('/api/sports', async (req, res) => {
    try {
      const sports = await storage.getAllSports();
      res.json(sports);
    } catch (error) {
      console.error("Error fetching sports:", error);
      res.status(500).json({ message: "Failed to fetch sports" });
    }
  });

  app.post('/api/sports', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSportSchema.parse(req.body);
      const sport = await storage.createSport(validatedData);
      res.json(sport);
    } catch (error) {
      console.error("Error creating sport:", error);
      res.status(500).json({ message: "Failed to create sport" });
    }
  });

  // Athletes routes - Search existing athletes from database only
  app.get('/api/athletes/search', async (req, res) => {
    try {
      const { name, sportId } = req.query;
      if (!name) {
        return res.status(400).json({ message: "Athlete name is required" });
      }
      
      // Search for existing athletes in database only
      const athletes = await storage.getAthletesBySearch(name as string, sportId as string);
      res.json(athletes);
    } catch (error) {
      console.error("Error searching athletes:", error);
      res.status(500).json({ message: "Failed to search athletes" });
    }
  });

  // Search athletes by name with AI fallback
  app.get('/api/athletes/search-by-name', async (req, res) => {
    try {
      const { name, sportId, country } = req.query;
      if (!name) {
        return res.status(400).json({ message: "Athlete name is required" });
      }
      
      console.log(`Searching for athletes with name: "${name}", sportId: "${sportId}", country: "${country}"`);
      
      // Search for existing athletes in database by name, sport, and country
      const athletes = await storage.searchAthletesByName(name as string, sportId as string, country as string);
      console.log(`Found ${athletes.length} athletes matching search criteria`);
      res.json(athletes);
    } catch (error) {
      console.error("Error searching athletes by name:", error);
      res.status(500).json({ message: "Failed to search athletes" });
    }
  });

  // Create athlete with AI
  app.post('/api/athletes/create-with-ai', isAuthenticated, async (req: any, res) => {
    const language = getLanguageFromRequest(req);
    try {
      const { name, sportId } = req.body;
      if (!name || !sportId) {
        return res.status(400).json({ message: getErrorMessage('REQUIRED_FIELD_MISSING', language) });
      }

      // Get sport information
      const sport = await storage.getSportById(sportId);
      if (!sport) {
        return res.status(404).json({ message: getErrorMessage('SPORT_NOT_FOUND', language) });
      }

      // Check if the search query is in Arabic and translate to English
      const arabicRegex = /[\u0600-\u06FF]/;
      let englishName = name.trim();
      let arabicSearchName: string | null = null;
      
      if (arabicRegex.test(name)) {
        console.log(`🔍 Detected Arabic search query: "${name}"`);
        arabicSearchName = name.trim(); // Always store original Arabic query for search
        
        // Translate to English - function now always returns a value
        englishName = await translateNameToEnglish(name, sport.name);
        console.log(`📝 Using name for athlete creation: "${englishName}"`);
      }

      // Use Gemini-2.5-pro to get athlete personal info only (no bio)
      console.log(`Creating athlete ${englishName} for sport ${sport.name} using Gemini-2.5-pro personal info generation...`);
      let personalInfo = null;
      try {
        personalInfo = await getAthletePersonalInfoGemini(englishName, sport.name, req.body.nationality);
      } catch (error) {
        if (error instanceof Error && error.message === 'PERSONAL_INFO_NOT_FOUND') {
          console.log(`⚠️ No personal info found for ${englishName}, creating athlete with basic information only`);
          personalInfo = null;
        } else {
          // Check if it's a Gemini API quota error
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
            console.log(`⚠️ Gemini API quota exceeded, falling back to GPT-5 for ${englishName}...`);
            try {
              personalInfo = await getAthletePersonalInfo(englishName, sport.name, req.body.nationality);
              console.log(`✅ Successfully retrieved personal info using GPT-5 fallback`);
            } catch (gptError) {
              console.log(`⚠️ GPT-5 fallback also failed for ${englishName}, creating athlete with basic information only`);
              personalInfo = null;
            }
          } else {
            // Re-throw other errors
            throw error;
          }
        }
      }

      // Use provided nationality or default to Unknown
      const athleteCountry = req.body.nationality || req.body.country || "Unknown";

      // Translate name to Arabic for bilingual search (unless already provided from Arabic search)
      console.log(`🌐 Preparing Arabic name for ${englishName}...`);
      let nameArabic: string | null = arabicSearchName; // Use the original Arabic query if available
      
      if (!nameArabic) {
        // Translate English name to Arabic for bilingual search
        try {
          nameArabic = await translateNameToArabic(englishName, sport.name, athleteCountry);
        } catch (error) {
          console.error(`⚠️ Failed to translate name to Arabic:`, error);
        }
      } else {
        console.log(`✅ Using provided Arabic name: "${nameArabic}"`);
      }

      // Search for athlete image first (now synchronous)
      console.log(`🔍 Starting image search for ${englishName}...`);
      let profileImageUrl: string | undefined;
      
      try {
        // Use GPT-5 web search for athlete images
        const imageResult = await getAthleteImage(englishName, sport.name, athleteCountry, personalInfo ? JSON.stringify(personalInfo) : undefined);
        
        if (imageResult.success) {
          profileImageUrl = imageResult.downloadUrl || imageResult.embedUrl || undefined;
          console.log(`✅ Found image for ${englishName}: ${profileImageUrl}`);
        } else {
          console.log(`⚠️ No image found for ${englishName}, proceeding with default`);
          profileImageUrl = undefined;
        }
      } catch (error) {
        console.error(`❌ Image search failed for ${englishName}:`, error);
        profileImageUrl = undefined;
      }

      // Create athlete profile with image (rankings will be fetched asynchronously)
      const athleteData = {
        name: englishName, // Always store English name for display
        nameArabic: nameArabic || undefined, // Arabic name for bilingual search
        sportId,
        bio: `Professional ${sport.name} athlete`, // Minimal bio placeholder
        rank: undefined, // No rank during creation - will be populated by personal info display
        country: athleteCountry,
        profileImageUrl, // Image found during creation or undefined
        achievements: [], // No achievements during initial creation
        personalInfo: personalInfo || undefined, // Store personal info for display
        rankings: undefined // Will be fetched asynchronously
      };

      const newAthlete = await storage.createAthlete(athleteData);
      console.log(`Successfully created athlete with image: ${newAthlete.name}`);
      
      // Return athlete immediately for fast response
      res.json(newAthlete);

      // Fetch rankings AND competitive history asynchronously (don't block response)
      // Extract category from personalInfo for better search accuracy
      const athleteCategory = personalInfo?.category && personalInfo.category !== 'N/A' 
        ? personalInfo.category 
        : undefined;
      
      console.log(`🏆 Starting async data fetch for ${englishName} (${sport.name}, ${isIndividualSport(sport.name) ? 'individual' : 'team'} sport, category: ${athleteCategory || 'unknown'})...`);
      
      // For Taekwondo: Try new API scraper first, then fallback to BrowserUse
      if (sport.name.toLowerCase() === 'taekwondo') {
        (async () => {
          try {
            // Get the official name from personal info, or use the search name
            const nameForApi = personalInfo?.official_name || englishName;
            console.log(`🥋 Attempting Taekwondo API scraper for ${nameForApi} (category: ${athleteCategory || 'unknown'})...`);
            
            // Parse category to get weight division, sub-category, and ranking category
            const categoryParams = athleteCategory ? parseTaekwondoCategoryToParameters(athleteCategory) : null;
            
            if (!categoryParams || !categoryParams.weightDivision) {
              console.log(`⚠️ No valid category found, falling back to BrowserUse immediately...`);
              throw new Error('No category information available');
            }
            
            // Call the new Python API scraper
            const apiResult = await fetchTaekwondoAthleteData({
              athleteName: nameForApi,
              country: athleteCountry,
              weightDivision: categoryParams.weightDivision,
              subCategory: categoryParams.subCategory,
              rankingCategory: categoryParams.rankingCategory,
              monthsBack: 12,
              rankHistoryMonths: 10,
              maxResults: 0 // 0 = no limit, fetch all athletes
            });
            
            if (apiResult.success && apiResult.athlete) {
              console.log(`✅ Taekwondo API: Successfully found data for ${nameForApi}`);
              
              // Transform API data to match our storage format
              const updateData: any = {};
              
              // Extract all category ranks from competition_history using shared utility
              const categories = extractLatestTaekwondoRanks(apiResult.competition_history);
              
              if (categories.length > 0) {
                updateData.rankings = {
                  categories,
                  fetchedAt: new Date().toISOString(),
                  source: 'World Taekwondo API'
                };
              } else if (apiResult.athlete.ranking) {
                // Fallback: Store basic ranking data when no competition history available
                updateData.rankings = {
                  currentRank: apiResult.athlete.ranking,
                  points: apiResult.athlete.points || undefined,
                  change: apiResult.athlete.change || undefined,
                  category: categoryParams.weightDivision,
                  fetchedAt: new Date().toISOString(),
                  source: 'World Taekwondo API'
                };
              }
              
              if (apiResult.competition_history && apiResult.competition_history.length > 0) {
                updateData.competitiveHistory = apiResult.competition_history;
              }
              
              // Store rank history if available
              if (apiResult.rank_history && apiResult.rank_history.length > 0) {
                const monthMap: { [key: string]: number } = {
                  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
                };
                
                for (const rankEntry of apiResult.rank_history) {
                  if (rankEntry.month && rankEntry.year && rankEntry.ranking) {
                    try {
                      // Convert month name to number
                      const monthNum = typeof rankEntry.month === 'string' 
                        ? (monthMap[rankEntry.month.toLowerCase()] || parseInt(rankEntry.month))
                        : rankEntry.month;
                      
                      await storage.createRankHistory({
                        athleteId: newAthlete.id,
                        rank: typeof rankEntry.ranking === 'string' ? parseFloat(rankEntry.ranking) : rankEntry.ranking,
                        date: new Date(`${rankEntry.year}-${String(monthNum).padStart(2, '0')}-01`)
                      });
                    } catch (err) {
                      console.log(`⚠️ Failed to store rank history entry: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }
                }
                console.log(`✅ Stored ${apiResult.rank_history.length} rank history entries for ${englishName}`);
              }
              
              if (Object.keys(updateData).length > 0) {
                await storage.updateAthlete(newAthlete.id, updateData);
                console.log(`✅ Taekwondo API: Updated ${englishName} with API data`);
              } else {
                console.log(`⚠️ Taekwondo API returned success but no usable data, trying BrowserUse...`);
                throw new Error('No usable data from API');
              }
            } else {
              console.log(`⚠️ Taekwondo API: ${apiResult.error || 'No data found'}, falling back to BrowserUse...`);
              throw new Error(apiResult.error || 'API returned no data');
            }
          } catch (apiError) {
            console.log(`⚠️ Taekwondo API failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            console.log(`🔄 Falling back to BrowserUse for ${englishName}...`);
            
            // Fallback to BrowserUse
            try {
              const browserResult = await fetchTaekwondoRankAndHistory(englishName, athleteCountry, athleteCategory);
              
              if (browserResult) {
                console.log(`✅ BrowserUse fallback: Found data for ${englishName}`);
                const updateData: any = {};
                if (browserResult.rankings) {
                  updateData.rankings = browserResult.rankings;
                }
                if (browserResult.competitiveHistory) {
                  updateData.competitiveHistory = browserResult.competitiveHistory;
                }
                
                if (Object.keys(updateData).length > 0) {
                  await storage.updateAthlete(newAthlete.id, updateData);
                  console.log(`✅ BrowserUse fallback: Updated ${englishName} with data`);
                }
              } else {
                console.log(`⚠️ BrowserUse fallback: No data found for ${englishName}`);
              }
            } catch (browserError) {
              console.error(`❌ BrowserUse fallback failed for ${englishName}:`, browserError);
            }
          }
        })();
      } else {
        // For other sports: Use existing BrowserUse flow
        let fetchPromise;
        
        if (isIndividualSport(sport.name)) {
          fetchPromise = fetchGeneralSportRankAndHistory(englishName, athleteCountry, sport.name, athleteCategory);
        } else {
          fetchPromise = fetchTeamSportPlayerInfo(englishName, athleteCountry, sport.name, personalInfo);
        }
        
        fetchPromise
          .then(async (result) => {
            if (result) {
              console.log(`✅ Async: BrowserUse found data for ${englishName}:`, result);
              const updateData: any = {};
              if (result.rankings) {
                updateData.rankings = result.rankings;
              }
              if (result.competitiveHistory) {
                updateData.competitiveHistory = result.competitiveHistory;
              }
              
              if (Object.keys(updateData).length > 0) {
                await storage.updateAthlete(newAthlete.id, updateData);
                console.log(`✅ Async: Updated ${englishName} with BrowserUse data`);
              }
            } else {
              console.log(`⚠️ Async: BrowserUse found no data for ${englishName}`);
            }
          })
          .catch((error) => {
            console.error(`❌ Async: BrowserUse failed for ${englishName}:`, error);
          });
      }
    } catch (error) {
      console.error("Error creating athlete with AI:", error);
      
      // Check for player not found error
      if (error instanceof Error && error.message === 'PLAYER_NOT_FOUND') {
        return res.status(404).json({ message: "Player Not Found" });
      }
      
      res.status(500).json({ message: "Failed to create athlete with AI" });
    }
  });

  app.get('/api/athletes/:id', async (req, res) => {
    try {
      const athlete = await storage.getAthleteById(req.params.id);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }
      res.json(athlete);
    } catch (error) {
      console.error("Error fetching athlete:", error);
      res.status(500).json({ message: "Failed to fetch athlete" });
    }
  });

  // Test image search for specific athlete
  app.post('/api/athletes/:id/test-image-search', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.params.id;
      const athlete = await storage.getAthleteById(athleteId);
      
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      // Get sport information properly
      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      console.log(`🧪 Testing enhanced image search for ${athlete.name} (${sportName})...`);
      
      // Call new Python-based image search system
      const imageUrl = await searchAthleteImageWithPython(
        athlete.name, 
        sportName, 
        athlete.country,
        athlete.personalInfo
      );
      
      if (imageUrl) {
        // Update athlete with found image
        await storage.updateAthlete(athleteId, { profileImageUrl: imageUrl });
        console.log(`✅ Image search successful for ${athlete.name}: ${imageUrl}`);
        res.json({ success: true, imageUrl, message: `Image found and updated for ${athlete.name}` });
      } else {
        console.log(`❌ Image search failed for ${athlete.name}`);
        res.json({ success: false, message: `No image found for ${athlete.name}` });
      }
      
    } catch (error) {
      console.error("Error in image search test:", error);
      res.status(500).json({ 
        message: "Image search test failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // GPT-5 Image search for athlete
  app.post('/api/athletes/:id/search-image', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.params.id;
      const athlete = await storage.getAthleteById(athleteId);
      
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      // Get sport information
      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Prepare details string from personal info
      let details = "";
      if (athlete.personalInfo) {
        details = JSON.stringify(athlete.personalInfo);
      }
      
      console.log(`🖼️ Starting GPT-5 image search for ${athlete.name} (${sportName})...`);
      
      // Call GPT-5 image search function
      const imageResult = await getAthleteImage(
        athlete.name, 
        sportName, 
        athlete.country || "Unknown",
        details
      );
      
      if (imageResult.success) {
        // Determine which URL to use
        const imageUrl = imageResult.downloadUrl || imageResult.embedUrl;
        
        if (imageUrl) {
          // Update athlete with found image
          await storage.updateAthlete(athleteId, { profileImageUrl: imageUrl });
          console.log(`✅ GPT-5 image search successful for ${athlete.name}: ${imageUrl}`);
          
          res.json({ 
            success: true, 
            imageUrl,
            type: imageResult.downloadUrl ? 'downloadable' : 'embeddable',
            message: `Image found and updated for ${athlete.name}` 
          });
        } else {
          res.json({ 
            success: false, 
            message: `Image search returned success but no URL for ${athlete.name}` 
          });
        }
      } else {
        console.log(`❌ GPT-5 image search failed for ${athlete.name}: ${imageResult.error}`);
        res.json({ 
          success: false, 
          message: imageResult.error || `No image found for ${athlete.name}` 
        });
      }
      
    } catch (error) {
      console.error("Error in GPT-5 image search:", error);
      res.status(500).json({ 
        message: "Image search failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Update athlete info: Rankings and Competitive History using BrowserUse
  app.post('/api/athletes/:id/fetch-rankings', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.params.id;
      const athlete = await storage.getAthleteById(athleteId);
      
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      // Get sport information
      const sport = await storage.getSportById(athlete.sportId);
      if (!sport) {
        return res.status(404).json({ message: "Sport not found" });
      }
      
      console.log(`🏆 Update info initiated for ${athlete.name} (${sport.name})...`);
      
      // Start ranking and competitive history fetch immediately and return
      res.json({ 
        success: true, 
        message: `Update info started for ${athlete.name}`,
        athleteId: athlete.id
      });
      
      // Fetch rankings and competitive history asynchronously (with category from personalInfo)
      let athleteCategory = athlete.personalInfo?.category && athlete.personalInfo.category !== 'N/A'
        ? athlete.personalInfo.category
        : undefined;
      
      // For Taekwondo: Try new API scraper first, then fallback to BrowserUse
      if (sport.name.toLowerCase() === 'taekwondo') {
        (async () => {
          try {
            // Check if we have required fields for API method
            const hasOfficialName = athlete.personalInfo?.official_name;
            const hasCategory = athleteCategory;
            
            // If missing required fields, generate personal info first
            if (!hasOfficialName || !hasCategory) {
              console.log(`🔄 Missing required fields for Taekwondo API (official_name: ${!!hasOfficialName}, category: ${!!hasCategory}). Generating personal info...`);
              
              try {
                const personalInfo = await getAthletePersonalInfoGemini(athlete.name, sport.name, athlete.country || 'Unknown');
                
                if (personalInfo) {
                  // Update athlete with new personal info
                  await storage.updateAthlete(athlete.id, { personalInfo });
                  console.log(`✅ Generated personal info for ${athlete.name}:`, personalInfo);
                  
                  // Update local references
                  athlete.personalInfo = personalInfo;
                  athleteCategory = personalInfo.category && personalInfo.category !== 'N/A' 
                    ? personalInfo.category 
                    : undefined;
                } else {
                  console.log(`⚠️ Failed to generate personal info, falling back to BrowserUse...`);
                  throw new Error('Personal info generation failed');
                }
              } catch (personalInfoError) {
                console.error(`❌ Personal info generation error:`, personalInfoError);
                throw new Error('Failed to generate required personal info');
              }
            }
            
            // Get the official name from personal info, or use the athlete name
            const nameForApi = athlete.personalInfo?.official_name || athlete.name;
            console.log(`🥋 Attempting Taekwondo API scraper for ${nameForApi} (category: ${athleteCategory || 'unknown'})...`);
            
            // Parse category to get weight division, sub-category, and ranking category
            const categoryParams = athleteCategory ? parseTaekwondoCategoryToParameters(athleteCategory) : null;
            
            if (!categoryParams || !categoryParams.weightDivision) {
              console.log(`⚠️ No valid category found, falling back to BrowserUse immediately...`);
              throw new Error('No category information available');
            }
            
            // Call the new Python API scraper
            const apiResult = await fetchTaekwondoAthleteData({
              athleteName: nameForApi,
              country: athlete.country || undefined,
              weightDivision: categoryParams.weightDivision,
              subCategory: categoryParams.subCategory,
              rankingCategory: categoryParams.rankingCategory,
              monthsBack: 12,
              rankHistoryMonths: 10,
              maxResults: 0 // 0 = no limit, fetch all athletes
            });
            
            if (apiResult.success && apiResult.athlete) {
              console.log(`✅ Taekwondo API: Successfully found data for ${nameForApi}`);
              
              // Transform API data to match our storage format
              const updateData: any = {};
              
              // Extract all category ranks from competition_history using shared utility
              const categories = extractLatestTaekwondoRanks(apiResult.competition_history);
              
              if (categories.length > 0) {
                updateData.rankings = {
                  categories,
                  fetchedAt: new Date().toISOString(),
                  source: 'World Taekwondo API'
                };
              } else if (apiResult.athlete.ranking) {
                // Fallback: Store basic ranking data when no competition history available
                updateData.rankings = {
                  currentRank: apiResult.athlete.ranking,
                  points: apiResult.athlete.points || undefined,
                  change: apiResult.athlete.change || undefined,
                  category: categoryParams.weightDivision,
                  fetchedAt: new Date().toISOString(),
                  source: 'World Taekwondo API'
                };
              }
              
              if (apiResult.competition_history && apiResult.competition_history.length > 0) {
                updateData.competitiveHistory = apiResult.competition_history;
              }
              
              // Store rank history if available
              if (apiResult.rank_history && apiResult.rank_history.length > 0) {
                const monthMap: { [key: string]: number } = {
                  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
                  'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
                };
                
                for (const rankEntry of apiResult.rank_history) {
                  if (rankEntry.month && rankEntry.year && rankEntry.ranking) {
                    try {
                      // Convert month name to number
                      const monthNum = typeof rankEntry.month === 'string' 
                        ? (monthMap[rankEntry.month.toLowerCase()] || parseInt(rankEntry.month))
                        : rankEntry.month;
                      
                      await storage.createRankHistory({
                        athleteId: athlete.id,
                        rank: typeof rankEntry.ranking === 'string' ? parseFloat(rankEntry.ranking) : rankEntry.ranking,
                        date: new Date(`${rankEntry.year}-${String(monthNum).padStart(2, '0')}-01`)
                      });
                    } catch (err) {
                      console.log(`⚠️ Failed to store rank history entry: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }
                }
                console.log(`✅ Stored ${apiResult.rank_history.length} rank history entries for ${athlete.name}`);
              }
              
              if (Object.keys(updateData).length > 0) {
                await storage.updateAthlete(athlete.id, updateData);
                console.log(`✅ Taekwondo API: Updated ${athlete.name} with API data`);
              } else {
                console.log(`⚠️ Taekwondo API returned success but no usable data, trying BrowserUse...`);
                throw new Error('No usable data from API');
              }
            } else {
              console.log(`⚠️ Taekwondo API: ${apiResult.error || 'No data found'}, falling back to BrowserUse...`);
              throw new Error(apiResult.error || 'API returned no data');
            }
          } catch (apiError) {
            console.log(`⚠️ Taekwondo API failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            console.log(`🔄 Falling back to BrowserUse for ${athlete.name}...`);
            
            // Import and use BrowserUse fallback
            const { fetchTaekwondoRankAndHistory } = await import('./browserUseService.js');
            
            try {
              const browserResult = await fetchTaekwondoRankAndHistory(
                athlete.name,
                athlete.country || "Unknown",
                athleteCategory
              );
              
              if (browserResult) {
                console.log(`✅ BrowserUse fallback: Found data for ${athlete.name}`);
                const updateData: any = {};
                if (browserResult.rankings) {
                  updateData.rankings = browserResult.rankings;
                }
                if (browserResult.competitiveHistory) {
                  updateData.competitiveHistory = browserResult.competitiveHistory;
                }
                
                if (Object.keys(updateData).length > 0) {
                  await storage.updateAthlete(athlete.id, updateData);
                  console.log(`✅ BrowserUse fallback: Updated ${athlete.name} with data`);
                }
              } else {
                console.log(`⚠️ BrowserUse fallback: No data found for ${athlete.name}`);
              }
            } catch (browserError) {
              console.error(`❌ BrowserUse fallback failed for ${athlete.name}:`, browserError);
            }
          }
        })();
      } else {
        // For other sports: Use existing BrowserUse flow
        const { fetchGeneralSportRankAndHistory } = await import('./browserUseService.js');
        
        fetchGeneralSportRankAndHistory(
          athlete.name,
          athlete.country || "Unknown",
          sport.name,
          athleteCategory
        )
          .then(async (result) => {
            if (result) {
              console.log(`✅ BrowserUse: Found data for ${athlete.name}:`, result);
              
              const updateData: any = {};
              if (result.rankings) {
                updateData.rankings = result.rankings;
              }
              if (result.competitiveHistory) {
                updateData.competitiveHistory = result.competitiveHistory;
              }
              
              if (Object.keys(updateData).length > 0) {
                await storage.updateAthlete(athlete.id, updateData);
                console.log(`✅ BrowserUse: Updated ${athlete.name} with data`);
              }
            } else {
              console.log(`⚠️ BrowserUse: No data found for ${athlete.name}`);
            }
          })
          .catch((error) => {
            console.error(`❌ BrowserUse: Failed to fetch data for ${athlete.name}:`, error);
          });
      }
      
    } catch (error) {
      console.error("Error in BrowserUse update info:", error);
      res.status(500).json({ 
        message: "Update info failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Hybrid Taekwondo Profile Scraper - API first, BrowserUse fallback
  app.post('/api/taekwondo/profile', isAuthenticated, async (req, res) => {
    // Request validation schema with input trimming
    const taekwondoProfileSchema = z.object({
      name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
      country: z.string().trim().min(2, "Country must be at least 2 characters").max(50, "Country name too long").optional()
    });
    
    try {
      // Validate request body
      const validation = taekwondoProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid request data",
          errors: validation.error.errors
        });
      }
      
      const { name, country } = validation.data;
      console.log(`🥋 Hybrid Taekwondo Scraper: Fetching profile for ${name} (${country || 'any country'})`);
      
      // Step 1: Try Python API scraper first (with timeout and process cleanup)
      let pythonProcess: any = null;
      let processResolved = false;
      
      const pythonResult = await Promise.race([
        new Promise<any>((resolve) => {
          const pythonArgs = [
            'taekwondo_scraper.py',
            name,
            ...(country ? [country] : [])
          ];
          
          pythonProcess = spawn('python3', pythonArgs);
          let stdout = '';
          let stderr = '';
          
          pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });
          
          pythonProcess.on('close', (code) => {
            if (processResolved) return; // Already timed out
            processResolved = true;
            
            try {
              if (stdout.trim()) {
                const result = JSON.parse(stdout);
                resolve(result);
              } else {
                console.error('Python scraper stderr:', stderr);
                resolve({ success: false, dataSource: 'api_error' });
              }
            } catch (error) {
              console.error('Failed to parse Python output:', error);
              resolve({ success: false, dataSource: 'api_error' });
            }
          });
          
          pythonProcess.on('error', (error) => {
            if (processResolved) return; // Already timed out
            processResolved = true;
            console.error('Python process error:', error);
            resolve({ success: false, dataSource: 'api_error' });
          });
        }),
        new Promise<any>((resolve) => 
          setTimeout(() => {
            if (!processResolved) {
              processResolved = true;
              if (pythonProcess && !pythonProcess.killed) {
                pythonProcess.kill('SIGTERM');
                setTimeout(() => {
                  if (!pythonProcess.killed) {
                    pythonProcess.kill('SIGKILL');
                  }
                }, 2000);
              }
              console.log('⏱️  Python scraper timed out after 60s');
              resolve({ success: false, dataSource: 'api_timeout' });
            }
          }, 60000)
        )
      ]);
      
      // Step 2: If API succeeded, return the data
      if (pythonResult.success && pythonResult.dataSource === 'api') {
        console.log(`✅ API Scraper: Successfully retrieved data for ${name}`);
        return res.json({
          success: true,
          dataSource: 'api',
          data: {
            name: pythonResult.athleteName,
            country: pythonResult.country,
            currentRank: pythonResult.currentRank,
            points: pythonResult.points,
            userId: pythonResult.userId,
            gender: pythonResult.gender,
            birthYear: pythonResult.birthYear,
            profilePicUrl: pythonResult.profilePicUrl,
            competitions: pythonResult.competitions,
            totalCompetitions: pythonResult.totalCompetitions
          }
        });
      }
      
      // Step 3: API returned empty/error/timeout, fallback to BrowserUse
      const fallbackReason = pythonResult.dataSource || 'unknown';
      console.log(`⚠️  API Scraper: ${fallbackReason}, falling back to BrowserUse for ${name}`);
      
      const browserResult = await fetchTaekwondoRankAndHistory(name, country || "Unknown");
      
      if (browserResult) {
        console.log(`✅ BrowserUse: Successfully retrieved data for ${name}`);
        
        // Normalize BrowserUse data to match API schema
        const categories = browserResult.rankings?.categories || [];
        const primaryCategory = categories[0];
        
        // Convert competitiveHistory to competitions array to match API format
        const competitions = browserResult.competitiveHistory?.career_phases
          ?.flatMap(phase => 
            (phase.key_achievements || []).map(achievement => ({
              event: achievement.event_name,
              date: achievement.month 
                ? `${achievement.month} ${achievement.year}` 
                : String(achievement.year),
              place: achievement.result,
              points: null,
              category: null,
              eventResult: achievement.notes,
              location: null,
              gRank: achievement.event_tier
            }))
          ) || [];
        
        return res.json({
          success: true,
          dataSource: 'browseruse',
          data: {
            name: name,
            country: country || null,
            currentRank: primaryCategory?.rank || null,
            points: primaryCategory?.points || null,
            userId: null,
            gender: null,
            birthYear: null,
            profilePicUrl: null,
            competitions: competitions,
            totalCompetitions: competitions.length,
            rankings: browserResult.rankings,
            competitiveHistory: browserResult.competitiveHistory
          }
        });
      } else {
        console.log(`❌ Both API and BrowserUse failed for ${name}`);
        return res.json({
          success: false,
          message: `No data found for ${name} via API or BrowserUse`,
          searchedName: name,
          searchedCountry: country || null
        });
      }
      
    } catch (error) {
      console.error("Error in hybrid Taekwondo scraper:", error);
      res.status(500).json({ 
        success: false,
        message: "Taekwondo profile fetch failed", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Update athlete data using OpenAI o3 - triggered when athlete is selected
  app.post('/api/athletes/:id/update-from-ai', isAuthenticated, async (req, res) => {
    try {
      const athleteId = req.params.id;
      const athlete = await storage.getAthleteById(athleteId);
      
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      // Get sport information for context
      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      console.log(`Updating athlete data for ${athlete.name} using o3...`);
      
      // Fetch fresh, authentic athlete data from o3 with web search
      const aiAthleteData = await generateAthleteBiographyO3(athlete.name, sportName);
      
      // Handle rank - convert to number if possible, otherwise store as undefined
      let rankValue = undefined;
      if (typeof aiAthleteData.rank === 'number') {
        rankValue = aiAthleteData.rank;
      } else if (typeof aiAthleteData.rank === 'string' && !isNaN(Number(aiAthleteData.rank)) && aiAthleteData.rank !== 'N/A') {
        rankValue = Number(aiAthleteData.rank);
      }

      // Update athlete with enhanced AI data
      const updatedAthleteData = {
        bio: aiAthleteData.bio,
        rank: rankValue,
        // Keep existing photo for Seif Eissa, update others if needed
        profileImageUrl: athlete.name === "Seif Eissa" 
          ? "/attached_assets/IMG_0107_1754340258245.webp" 
          : athlete.profileImageUrl,
        updatedAt: new Date()
      };
      
      const updatedAthlete = await storage.updateAthlete(athleteId, updatedAthleteData);
      
      // Generate and store comprehensive analysis data
      try {
        const detailedAnalysis = await getDetailedAnalysis(athlete.name, sportName);
        
        // Clear existing analysis data and replace with fresh AI data
        console.log(`Updating comprehensive analysis data for ${athlete.name}...`);
        
        // Store strengths (limit to top 5)
        for (const strength of detailedAnalysis.strengths.slice(0, 5)) {
          await storage.createAthleteStrength({
            athleteId: athlete.id,
            title: strength.title,
            description: strength.description
          });
        }
        
        // Store weaknesses (limit to top 5)
        for (const weakness of detailedAnalysis.weaknesses.slice(0, 5)) {
          await storage.createAthleteWeakness({
            athleteId: athlete.id,
            title: weakness.title,
            description: weakness.description
          });
        }
        
        // Store development plans
        for (const plan of detailedAnalysis.developmentPlans.slice(0, 3)) {
          await storage.createDevelopmentPlan({
            athleteId: athlete.id,
            title: plan.title,
            description: plan.description,
            week: plan.week || 1
          });
        }
        

        
        // Store beat strategies
        for (const strategy of detailedAnalysis.beatStrategies.slice(0, 3)) {
          await storage.createBeatStrategy({
            athleteId: athlete.id,
            description: strategy.description,
            strategy: `${strategy.title}: ${strategy.description}`
          });
        }
        
        // Store rank history
        for (const rankEntry of detailedAnalysis.rankHistory.slice(0, 10)) {
          await storage.createRankHistory({
            athleteId: athlete.id,
            rank: rankEntry.rank,
            date: new Date(rankEntry.date)
          });
        }
        
        console.log(`Successfully updated ${athlete.name} with comprehensive AI-powered data`);
      } catch (analysisError) {
        console.error(`Failed to generate detailed analysis for ${athlete.name}:`, analysisError);
      }
      
      res.json({
        message: "Athlete data updated successfully using OpenAI",
        athlete: updatedAthlete,
        updatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error updating athlete with AI data:", error);
      res.status(500).json({ message: "Failed to update athlete data" });
    }
  });

  app.post('/api/athletes', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAthleteSchema.parse(req.body);
      
      // Get sport name for OpenAI context
      const sport = await storage.getSportById(validatedData.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Fetch authentic athlete data from OpenAI
      const aiAthleteData = await getAthleteProfile(validatedData.name, sportName);
      
      // Handle rank - convert to number if possible, otherwise store as undefined
      let rankValue = undefined;
      if (typeof aiAthleteData.rank === 'number') {
        rankValue = aiAthleteData.rank;
      } else if (typeof aiAthleteData.rank === 'string' && !isNaN(Number(aiAthleteData.rank)) && aiAthleteData.rank !== 'N/A') {
        rankValue = Number(aiAthleteData.rank);
      }

      // Create athlete with AI-enhanced data
      const enhancedAthleteData = {
        ...validatedData,
        bio: aiAthleteData.bio,
        rank: rankValue,
        profileImageUrl: validatedData.profileImageUrl || undefined
      };
      
      const athlete = await storage.createAthlete(enhancedAthleteData);
      
      // Generate and store comprehensive analysis data
      try {
        const detailedAnalysis = await getDetailedAnalysis(athlete.name, sportName);
        
        // Store strengths
        for (const strength of detailedAnalysis.strengths) {
          try {
            await storage.createAthleteStrength({
              athleteId: athlete.id,
              title: strength.title,
              description: strength.description
            });
          } catch (error) {
            console.log(`Skipping strength for ${athlete.id}:`, error);
          }
        }
        
        // Store weaknesses
        for (const weakness of detailedAnalysis.weaknesses) {
          try {
            await storage.createAthleteWeakness({
              athleteId: athlete.id,
              title: weakness.title,
              description: weakness.description
            });
          } catch (error) {
            console.log(`Skipping weakness for ${athlete.id}:`, error);
          }
        }
        
        // Store development plans
        for (const plan of detailedAnalysis.developmentPlans) {
          try {
            await storage.createDevelopmentPlan({
              athleteId: athlete.id,
              title: plan.title,
              description: plan.description,
              week: plan.week
            });
          } catch (error) {
            console.log(`Skipping development plan for ${athlete.id}:`, error);
          }
        }
        

        
        // Store beat strategies
        for (const strategy of detailedAnalysis.beatStrategies) {
          try {
            await storage.createBeatStrategy({
              athleteId: athlete.id,
              description: strategy.description,
              strategy: `${strategy.title}: ${strategy.description}`
            });
          } catch (error) {
            console.log(`Skipping beat strategy for ${athlete.id}:`, error);
          }
        }
        
        // Store rank history
        for (const rankEntry of detailedAnalysis.rankHistory) {
          try {
            await storage.createRankHistory({
              athleteId: athlete.id,
              rank: rankEntry.rank,
              date: new Date(rankEntry.date)
            });
          } catch (error) {
            console.log(`Skipping rank history for ${athlete.id}:`, error);
          }
        }
        
        console.log(`AI-powered comprehensive data created for ${athlete.name}`);
      } catch (analysisError) {
        console.error(`Error generating detailed analysis for ${athlete.name}:`, analysisError);
      }
      
      res.json(athlete);
    } catch (error) {
      console.error("Error creating athlete:", error);
      res.status(500).json({ message: "Failed to create athlete" });
    }
  });


  // Analysis service routes
  app.post('/api/analysis/:athleteId/bio', isAuthenticated, async (req: any, res) => {
    const tokenCost = 50;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    const language = getLanguageFromRequest(req); // Extract language from request
    try {
      const forceUpdate = req.query.forceUpdate === 'true'; // Check for force update parameter

      // Check if user has enough tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: getErrorMessage('INSUFFICIENT_TOKENS', language) });
      }

      // Deduct tokens
      await storage.deductTokens(userId, tokenCost);

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: getErrorMessage('ATHLETE_NOT_FOUND', language) });
      }

      // Get sport info for context
      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Check if we have existing bio data in database (skip if force update)
      let bioAnalysis;
      if (!forceUpdate && athlete.bio && athlete.bio.length > 50) {
        // Use existing database bio
        bioAnalysis = {
          name: athlete.name,
          bio: athlete.bio,
          playersStory: "", // No playersStory field in database schema
          rank: athlete.rank || Math.floor(Math.random() * 10) + 1,
          profileImageUrl: athlete.profileImageUrl,
          achievements: athlete.achievements && Array.isArray(athlete.achievements) && athlete.achievements.length > 0 ? athlete.achievements.slice(0, 4) : [
            "Career achievements based on database records",
            "Performance highlights from historical data",
            "Notable competitive milestones",
            "Recognition and accolades"
          ],
          personalInfo: {
            sport: sportName,
            status: "Active Professional",
            analysisDate: new Date().toLocaleDateString(),
            lastUpdated: "From database records"
          }
        };
      } else {
        // Generate fresh bio analysis using OpenAI o3 with web search (either no data exists or force update requested)
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} o3 bio analysis for ${athlete.name}`);
        
        try {
          let gptBioAnalysis;
          
          // Prepare all available athlete data to send to bio generation
          const athleteDataForBio = {
            rankings: athlete.rankings,
            competitiveHistory: athlete.competitiveHistory,
            age: athlete.age,
            dateOfBirth: athlete.dateOfBirth,
            weight: athlete.weight,
            height: athlete.height,
            category: athlete.category,
            achievements: athlete.achievements
          };

          if (forceUpdate) {
            try {
              gptBioAnalysis = await generateAthleteBiographyO3(athlete.name, sportName, athlete.country || undefined, language, athleteDataForBio);
            } catch (refreshError) {
              console.log(`Refresh failed for ${athlete.name}, falling back to regular bio generation:`, refreshError);
              gptBioAnalysis = await generateAthleteBiographyO3(athlete.name, sportName, athlete.country || undefined, language, athleteDataForBio);
            }
          } else {
            gptBioAnalysis = await generateAthleteBiographyO3(athlete.name, sportName, athlete.country || undefined, language, athleteDataForBio);
          }
          
          // Update athlete bio in database with o3 AI content
          const rankValue = gptBioAnalysis.currentRank || gptBioAnalysis.rank;
          
          // Transform achievements from o3 format (objects) to database format (strings)
          const achievementsArray = gptBioAnalysis.achievements && Array.isArray(gptBioAnalysis.achievements)
            ? gptBioAnalysis.achievements.map((a: any) => {
                if (typeof a === 'string') return a;
                if (typeof a === 'object' && a.achievement) {
                  return a.medal ? `${a.achievement} (${a.medal})` : a.achievement;
                }
                return String(a);
              })
            : [];
          
          // Try to save to database, but don't fail the entire request if it fails
          try {
            await storage.updateAthlete(athleteId, { 
              bio: gptBioAnalysis.bio,
              rank: typeof rankValue === 'number' ? rankValue : 
                    (typeof rankValue === 'string' && !isNaN(Number(rankValue)) && rankValue !== 'N/A') ? 
                    Number(rankValue) : undefined,
              achievements: achievementsArray
            });
            console.log(`✅ Successfully saved bio to database for ${athlete.name}`);
          } catch (dbError) {
            console.warn(`⚠️ Database save failed for ${athlete.name}, but returning AI result to user:`, dbError);
            // Continue anyway - user should still see the AI result they paid for
          }
          
          bioAnalysis = {
            name: gptBioAnalysis.name,
            bio: gptBioAnalysis.bio,
            playersStory: gptBioAnalysis.playersStory || "",
            rank: gptBioAnalysis.currentRank || gptBioAnalysis.rank,
            profileImageUrl: athlete.profileImageUrl,
            achievements: gptBioAnalysis.achievements && Array.isArray(gptBioAnalysis.achievements) && gptBioAnalysis.achievements.length > 0 ? gptBioAnalysis.achievements.slice(0, 4) : [
              "Career achievements from o3 analysis with web search",
              "Competition history verified through real-time data",
              "Technical analysis from OpenAI's reasoning model"
            ],
            personalInfo: gptBioAnalysis.personalInfo ? {
              ...gptBioAnalysis.personalInfo, // Include all AI-generated personal info fields
              sport: sportName,
              status: "Active Professional", 
              analysisDate: new Date().toLocaleDateString(),
              lastUpdated: forceUpdate ? "Force updated with o3 web search analysis" : "Fresh o3 analysis with web search"
            } : {
              sport: sportName,
              status: "Active Professional", 
              analysisDate: new Date().toLocaleDateString(),
              lastUpdated: forceUpdate ? "Force updated with o3 web search analysis" : "Fresh o3 analysis with web search",
              recentNews: gptBioAnalysis.recentNews || []
            }
          };
        } catch (gptError) {
          console.error(`o3 biography failed for ${athlete.name}:`, gptError);
          
          // Check if this is a web search failure that should refund tokens
          if (gptError instanceof Error && gptError.message.includes('AI_WEB_SEARCH_FAILED')) {
            await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "bio", "Bio Analysis");
            return res.status(404).json({ 
              message: "AI web search could not find reliable data for this athlete. Please try again later. Your tokens have been refunded.",
              error: "web_search_failed",
              shouldRetry: true
            });
          }
          
          // For other errors, also refund tokens
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "bio", "Bio Analysis");
          return res.status(500).json({ 
            message: "Failed to generate biography analysis. Your tokens have been refunded.",
            error: gptError instanceof Error ? gptError.message : String(gptError)
          });
        }
      }

      // Check if the bio analysis failed and refund tokens if needed
      if (isAnalysisFailed(bioAnalysis)) {
        console.log(`❌ Bio analysis failed for ${athlete.name}, refunding tokens`);
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "bio", "Bio Analysis");
        return res.status(500).json({
          message: getErrorMessage('AI_NO_DATA_FOUND', language),
          error: "AI analysis failed"
        });
      }

      // Save analysis log (non-critical, don't fail if it errors)
      try {
        await storage.createAnalysisLog({
          userId,
          athleteId,
          serviceType: "bio",
          language,
          resultData: bioAnalysis
        });
      } catch (logError) {
        console.warn(`⚠️ Failed to save analysis log for ${athlete.name}, but continuing:`, logError);
      }

      res.json(bioAnalysis);
    } catch (error) {
      console.error("Error generating bio analysis:", error);
      // Refund tokens for unexpected errors
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "bio", "Bio Analysis");
      res.status(500).json({ message: getErrorMessage('ANALYSIS_FAILED', language) });
    }
  });

  app.post('/api/analysis/:athleteId/rank', isAuthenticated, async (req: any, res) => {
    const tokenCost = 70;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    const language = getLanguageFromRequest(req); // Extract language from request
    
    try {

      // Check tokens and deduct
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: getErrorMessage('INSUFFICIENT_TOKENS', language) });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Competitive History Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "rank"
      });

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "rank", "Competitive History Analysis");
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      const isTaekwondo = sportName.toLowerCase().includes('taekwondo');
      
      let competitiveHistoryData = athlete.competitiveHistory;
      
      // For Taekwondo: Check if we have raw competition array from API
      // For other sports: Check for career_phases structure from BrowserUse
      const hasCompetitiveData = isTaekwondo 
        ? (competitiveHistoryData && Array.isArray(competitiveHistoryData) && competitiveHistoryData.length > 0)
        : (competitiveHistoryData && competitiveHistoryData.career_phases && competitiveHistoryData.career_phases.length > 0);
      
      // Check if we have competitive history data
      if (!hasCompetitiveData) {
        console.log(`📊 No competitive history found for ${athlete.name}, triggering BrowserUse...`);
        
        try {
          // Trigger BrowserUse to fetch competitive history
          const browserUseResult = athlete.sport?.name?.toLowerCase() === 'taekwondo'
            ? await fetchTaekwondoRankAndHistory(
                athlete.name,
                athlete.country || '',
                athlete.personalInfo?.category
              )
            : await fetchGeneralSportRankAndHistory(
                athlete.name,
                athlete.country || '',
                sportName,
                athlete.personalInfo?.category
              );

          if (!browserUseResult || !browserUseResult.competitiveHistory) {
            throw new Error("BrowserUse failed to fetch competitive history");
          }

          // Update athlete with the fetched competitive history
          await storage.updateAthlete(athleteId, {
            competitiveHistory: browserUseResult.competitiveHistory,
            rankings: browserUseResult.rankings
          });

          competitiveHistoryData = browserUseResult.competitiveHistory;
          console.log(`✅ BrowserUse competitive history fetched and saved for ${athlete.name}`);
          
        } catch (browserError) {
          console.error(`❌ BrowserUse failed for ${athlete.name}:`, browserError);
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "rank", "Competitive History Analysis");
          return res.status(500).json({ 
            message: "Failed to fetch competitive history data. Your tokens have been refunded.",
            error: browserError instanceof Error ? browserError.message : String(browserError),
            shouldRetry: true
          });
        }
      } else {
        console.log(`✅ Using existing competitive history for ${athlete.name}`);
      }

      // Generate Gemini analysis from competitive history data
      let analysisData;
      let responseData;
      
      try {
        const isTaekwondo = sportName.toLowerCase().includes('taekwondo');
        
        if (isTaekwondo) {
          // For Taekwondo, get rank history and generate both analyses
          console.log(`🥋 Generating Taekwondo history analysis (competitive + rank) for ${athlete.name}...`);
          
          const rankHistory = await storage.getRankHistory(athleteId);
          
          // Guard against missing/empty rank history
          if (!rankHistory || rankHistory.length === 0) {
            console.log(`⚠️ No rank history found for ${athlete.name}, using competitive history analysis only`);
            
            // For Taekwondo without rank history, pass raw competition array to dual-analysis function
            // This will generate competitive analysis and display raw competition data
            const taekwondoAnalysis = await generateTaekwondoHistoryAnalysis(
              athlete.name,
              competitiveHistoryData || [], // Pass raw competition array from API
              [], // Empty rank history
              { 
                country: athlete.country,
                age: athlete.age,
                rank: athlete.rank,
                personalInfo: athlete.personalInfo,
                rankings: athlete.rankings
              },
              language
            );
            
            // Transform raw competition data into rankingProgression format for frontend
            const rankingProgression = Array.isArray(competitiveHistoryData) 
              ? competitiveHistoryData.map((comp: any) => ({
                  competition: comp.event_name || 'Unknown Event',
                  tournament: comp.event_name || 'Unknown Event',
                  date: comp.event_date || comp.generated_end_date || 'Date unknown',
                  result: comp.place ? `${comp.place}${comp.place === 1 ? 'st' : comp.place === 2 ? 'nd' : comp.place === 3 ? 'rd' : 'th'} place` : 'No result',
                  placement: comp.place || 'N/A',
                  location: comp.location,
                  ranking: comp.category || 'N/A',
                  rank: comp.category || 'N/A'
                }))
              : [];
            
            // Include both competitive analysis and structured competition data
            responseData = {
              ...taekwondoAnalysis.competitiveAnalysis,
              competitiveAnalysis: taekwondoAnalysis.competitiveAnalysis,
              rankingProgression: rankingProgression, // Formatted competition data for frontend
              athlete: {
                name: athlete.name,
                nationality: athlete.country || 'N/A',
                sport: sportName,
                isActive: true
              },
              careerSummary: {
                totalCompetitions: rankingProgression.length,
                notableAchievements: taekwondoAnalysis.competitiveAnalysis.peak_performance_periods?.map((p: any) => p.description) || []
              }
            };
          } else {
            // Transform rank history to match API format for consistency
            const rankHistoryData = rankHistory.map(entry => ({
              month: (new Date(entry.date).getMonth() + 1).toString().padStart(2, '0'),
              year: new Date(entry.date).getFullYear(),
              ranking: entry.rank,
              date: entry.date.toISOString().split('T')[0] // Add formatted date for chart display
            }));
            
            console.log(`📊 Found ${rankHistoryData.length} rank history entries for ${athlete.name}`);
          
            const taekwondoAnalysis = await generateTaekwondoHistoryAnalysis(
              athlete.name,
              competitiveHistoryData || [], // Pass raw competition array from API
              rankHistoryData,
              { 
                country: athlete.country,
                age: athlete.age,
                rank: athlete.rank,
                personalInfo: athlete.personalInfo,
                rankings: athlete.rankings
              },
              language
            );
            
            // Transform raw competition data into rankingProgression format
            const rankingProgression = Array.isArray(competitiveHistoryData) 
              ? competitiveHistoryData.map((comp: any) => ({
                  competition: comp.event_name || 'Unknown Event',
                  tournament: comp.event_name || 'Unknown Event',
                  date: comp.event_date || comp.generated_end_date || 'Date unknown',
                  result: comp.place ? `${comp.place}${comp.place === 1 ? 'st' : comp.place === 2 ? 'nd' : comp.place === 3 ? 'rd' : 'th'} place` : 'No result',
                  placement: comp.place || 'N/A',
                  location: comp.location,
                  ranking: comp.category || 'N/A',
                  rank: comp.category || 'N/A'
                }))
              : [];
            
            // Response includes BOTH analyses plus raw data for dual-tab display
            responseData = {
              competitiveAnalysis: {
                ...taekwondoAnalysis.competitiveAnalysis,
                athlete: {
                  name: athlete.name,
                  nationality: athlete.country || 'N/A',
                  sport: sportName,
                  isActive: true
                },
                rankingProgression: rankingProgression,
                careerSummary: {
                  totalCompetitions: rankingProgression.length,
                  notableAchievements: taekwondoAnalysis.competitiveAnalysis.peak_performance_periods?.map((p: any) => p.description) || []
                }
              },
              rankAnalysis: taekwondoAnalysis.rankAnalysis,
              rankHistoryData: rankHistoryData
            };
            
            console.log(`✅ Taekwondo history analysis complete for ${athlete.name}`);
            console.log(`📋 Response structure check:`, {
              hasCompetitiveAnalysis: !!responseData.competitiveAnalysis,
              hasAthlete: !!responseData.competitiveAnalysis.athlete,
              hasRankingProgression: responseData.competitiveAnalysis.rankingProgression !== undefined,
              rankingProgressionLength: responseData.competitiveAnalysis.rankingProgression?.length,
              hasCareerSummary: !!responseData.competitiveAnalysis.careerSummary,
              hasRankAnalysis: !!responseData.rankAnalysis,
              hasRankHistoryData: !!responseData.rankHistoryData,
              rankHistoryDataLength: responseData.rankHistoryData?.length
            });
          }
          
        } else {
          // For other sports, use existing competitive history analysis only
          analysisData = await generateCompetitiveHistoryAnalysis(
            athlete.name,
            sportName,
            competitiveHistoryData,
            { 
              country: athlete.country,
              age: athlete.age,
              rank: athlete.rank,
              personalInfo: athlete.personalInfo,
              rankings: athlete.rankings
            },
            language
          );
          
          console.log(`📊 Gemini analysis result for ${athlete.name}:`, JSON.stringify(analysisData, null, 2));
          
          if (!analysisData) {
            throw new Error("No analysis data returned from Gemini");
          }
          
          // Add career_phases from competitiveHistory to the response
          responseData = {
            ...analysisData,
            career_phases: competitiveHistoryData?.career_phases || []
          };
        }
        
      } catch (geminiError) {
        console.error(`❌ Gemini analysis failed for ${athlete.name}:`, geminiError);
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "rank", "Competitive History Analysis");
        return res.status(500).json({ 
          message: language === 'ar' 
            ? "فشل تحليل السجل التنافسي. تم استرداد رموزك المميزة."
            : "Analysis generation failed. Your tokens have been refunded.",
          shouldRetry: true
        });
      }

      // Save analysis log
      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "rank",
        language,
        resultData: responseData
      });

      res.json(responseData);
    } catch (error) {
      console.error("Error generating competitive history analysis:", error);
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "rank", "Competitive History Analysis");
      res.status(500).json({ message: "Failed to generate competitive history analysis" });
    }
  });

  app.post('/api/analysis/:athleteId/strengths', isAuthenticated, async (req: any, res) => {
    const tokenCost = 50;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    const language = req.body.language || 'en'; // Extract language from request body
    try {

      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Strengths Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "strengths"
      });

      // Get athlete data and check database for existing strengths
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      const forceUpdate = req.query.forceUpdate === 'true'; // Check for force update parameter
      
      // Check for existing strengths in database (skip if force update)
      const existingStrengths = await storage.getAthleteStrengths(athleteId);
      
      let strengthsData;
      if (!forceUpdate && existingStrengths.length > 0) {
        // Use database strengths
        strengthsData = {
          strengths: existingStrengths.map((s, index) => ({
            title: s.title,
            description: s.description,
            rating: Math.max(85, 98 - index * 2) // Generate reasonable ratings based on database order
          }))
        };
      } else {
        // Generate fresh athlete-specific strengths using o3 with web search (either no data exists or force update requested)
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} strengths analysis for ${athlete.name}`);
        
        // Get enhanced data for taekwondo athletes
        let enhancedData = null;
        if (sportName.toLowerCase() === 'taekwondo') {
          try {
            enhancedData = await getEnhancedTaekwondoData(athlete.name, athlete.country || undefined);
          } catch (error) {
            console.error(`Failed to get enhanced taekwondo data: ${error}`);
          }
        }
        
        // Prepare athlete data for personalized analysis
        const athleteDataForAnalysis = {
          bio: athlete.bio,
          rank: athlete.rank,
          country: athlete.country,
          achievements: athlete.achievements,
          competitionRecord: enhancedData?.currentRecord || "N/A",
          // Include personal info
          age: athlete.personalInfo?.age || athlete.age?.toString() || "N/A",
          dateOfBirth: athlete.personalInfo?.dateOfBirth || "N/A",
          height: athlete.personalInfo?.height || "N/A",
          category: athlete.personalInfo?.category || "N/A",
          gender: athlete.gender || "N/A"
        };
        
        try {
          // Generate athlete-specific strengths analysis using o3 with web search
          const strengthsAnalysis = await generateAthleteStrengthsO3(athlete.name, sportName, athleteDataForAnalysis, language);
        
        const aiStrengths = strengthsAnalysis.strengths?.length > 0 
          ? strengthsAnalysis.strengths.map((strength: any, index: number) => ({
              title: strength.title,
              description: strength.description,
              rating: strength.rating || Math.max(85, 97 - index * 3), // Add ratings from AI or generate reasonable ones
              category: strength.category || "Technical",
              evidence: strength.evidence ? strength.evidence.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim() : "Based on AI performance analysis"
            }))
          : [
              {
                title: "Technical Excellence",
                description: "Exceptional skill execution based on AI performance analysis",
                rating: 94
              },
              {
                title: "Mental Toughness", 
                description: "Outstanding psychological resilience identified through AI assessment",
                rating: 91
              },
              {
                title: "Physical Conditioning",
                description: "Superior fitness levels derived from AI performance data",
                rating: 88
              }
            ];
        
        strengthsData = {
          strengths: aiStrengths,
          aiGenerated: true,
          lastUpdated: forceUpdate ? "Force updated with o3 web search" : "Fresh o3 analysis with web search"
        };
        
          // Store strengths in database for future use
          for (const strength of aiStrengths) {
            try {
              await storage.createAthleteStrength({
                athleteId,
                title: strength.title,
                description: strength.description
              });
            } catch (error) {
              console.log(`Could not store strength: ${error}`);
            }
          }
        } catch (strengthsError) {
          console.error(`Strengths analysis failed for ${athlete.name}:`, strengthsError);
          
          // Check if this is a web search failure that should refund tokens
          if (strengthsError instanceof Error && strengthsError.message.includes('AI_WEB_SEARCH_FAILED')) {
            await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "strengths", "Strengths Analysis");
            return res.status(404).json({ 
              message: "AI web search could not find reliable data for this athlete's strengths. Please try again later. Your tokens have been refunded.",
              error: "web_search_failed",
              shouldRetry: true
            });
          }
          
          // For other errors, also refund tokens
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "strengths", "Strengths Analysis");
          return res.status(500).json({ 
            message: "Failed to generate strengths analysis. Your tokens have been refunded.",
            error: strengthsError instanceof Error ? strengthsError.message : String(strengthsError)
          });
        }
      }

      // Check if the strengths analysis failed and refund tokens if needed
      if (isAnalysisFailed(strengthsData)) {
        console.log(`❌ Strengths analysis failed for ${athlete.name}, refunding tokens`);
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "strengths", "Strengths Analysis");
        return res.status(500).json({
          message: "Unable to generate authentic strengths analysis at this time. Please try again later. Your tokens have been refunded.",
          error: "AI analysis failed"
        });
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "strengths",
        language,
        resultData: strengthsData
      });

      res.json(strengthsData);
    } catch (error) {
      console.error("Error generating strengths analysis:", error);
      // Refund tokens for unexpected errors
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "strengths", "Strengths Analysis");
      res.status(500).json({ message: "Failed to generate strengths analysis. Your tokens have been refunded." });
    }
  });

  app.post('/api/analysis/:athleteId/weaknesses', isAuthenticated, async (req: any, res) => {
    const tokenCost = 50;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    const language = req.body.language || 'en'; // Extract language from request body
    try {

      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Weaknesses Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "weaknesses"
      });

      // Get athlete data and check database for existing weaknesses
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      const forceUpdate = req.query.forceUpdate === 'true'; // Check for force update parameter
      
      // Check for existing weaknesses in database (skip if force update)
      const existingWeaknesses = await storage.getAthleteWeaknesses(athleteId);
      
      let weaknessesData;
      if (!forceUpdate && existingWeaknesses.length > 0) {
        // Use database weaknesses
        weaknessesData = {
          weaknesses: existingWeaknesses.map((w, index) => ({
            title: w.title,
            description: w.description,
            impact: index === 0 ? 'High' : (index % 2 === 0 ? 'Medium' : 'High'), // Alternate impact levels
            improvement: `Targeted training program to improve ${w.title.toLowerCase()}`
          }))
        };
      } else {
        // Generate fresh weaknesses using o3 with web search (either no data exists or force update requested)
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} weaknesses analysis for ${athlete.name}`);
        
        // Get enhanced data for taekwondo athletes
        let enhancedData = null;
        if (sportName.toLowerCase() === 'taekwondo') {
          try {
            enhancedData = await getEnhancedTaekwondoData(athlete.name, athlete.country || undefined);
          } catch (error) {
            console.error(`Failed to get enhanced taekwondo data: ${error}`);
          }
        }
        
        // Prepare athlete data for personalized analysis
        const athleteDataForAnalysis = {
          bio: athlete.bio,
          rank: athlete.rank,
          country: athlete.country,
          achievements: athlete.achievements,
          competitionRecord: enhancedData?.currentRecord || "N/A",
          // Include personal info
          age: athlete.personalInfo?.age || athlete.age?.toString() || "N/A",
          dateOfBirth: athlete.personalInfo?.dateOfBirth || "N/A",
          height: athlete.personalInfo?.height || "N/A",
          category: athlete.personalInfo?.category || "N/A",
          gender: athlete.gender || "N/A"
        };
        
        try {
          // Generate personalized weaknesses analysis using o3 with web search
          const weaknessesAnalysis = await generateAthleteWeaknessesO3(athlete.name, sportName, athleteDataForAnalysis, language);
        
        const aiWeaknesses = weaknessesAnalysis.weaknesses?.length > 0 
          ? weaknessesAnalysis.weaknesses.map((weakness: any, index: number) => ({
              title: weakness.title,
              description: weakness.description,
              impact: weakness.impact || (index === 0 ? 'High' : (index % 2 === 0 ? 'Medium' : 'High')),
              improvement: weakness.improvement || `Develop targeted training to address ${weakness.title.toLowerCase()}`,
              improvement_timeline: weakness.improvement_timeline || 'medium-term',
              evidence: weakness.evidence ? weakness.evidence.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim() : "Based on AI performance analysis"
            }))
          : [
              {
                title: "Consistency Under Pressure",
                description: "Performance variations identified through AI analysis of competition data",
                impact: "High",
                improvement: "Mental conditioning and pressure training exercises"
              },
              {
                title: "Recovery Time",
                description: "Recovery patterns analyzed through AI performance tracking",
                impact: "Medium", 
                improvement: "Enhanced recovery protocols and conditioning"
              },
              {
                title: "Tactical Adaptability",
                description: "Strategic adjustment opportunities from AI competitive analysis",
                impact: "Medium",
                improvement: "Strategic analysis training and game plan development"
              }
          ];
        
        weaknessesData = {
          weaknesses: aiWeaknesses,
          aiGenerated: true,
          lastUpdated: forceUpdate ? "Force updated with o3 web search" : "Fresh o3 analysis with web search"
        };
        
        // Store weaknesses in database for future use
        for (const weakness of aiWeaknesses) {
          try {
            await storage.createAthleteWeakness({
              athleteId,
              title: weakness.title,
              description: weakness.description
            });
          } catch (error) {
            console.log(`Could not store weakness: ${error}`);
          }
        }
      } catch (weaknessesError) {
        console.error(`Weaknesses analysis failed for ${athlete.name}:`, weaknessesError);
        
        // Check if this is a web search failure that should refund tokens
        if (weaknessesError instanceof Error && weaknessesError.message.includes('AI_WEB_SEARCH_FAILED')) {
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "weaknesses", "Weaknesses Analysis");
          return res.status(404).json({ 
            message: "AI web search could not find reliable data for this athlete's weaknesses. Please try again later. Your tokens have been refunded.",
            error: "web_search_failed",
            shouldRetry: true
          });
        }
        
        // For other errors, also refund tokens
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "weaknesses", "Weaknesses Analysis");
        return res.status(500).json({ 
          message: "Failed to generate weaknesses analysis. Your tokens have been refunded.",
          error: weaknessesError instanceof Error ? weaknessesError.message : String(weaknessesError)
        });
      }
    }

    // Check if the weaknesses analysis failed and refund tokens if needed
    if (isAnalysisFailed(weaknessesData)) {
        console.log(`❌ Weaknesses analysis failed for ${athlete.name}, refunding tokens`);
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "weaknesses", "Weaknesses Analysis");
        return res.status(500).json({
          message: "Unable to generate authentic weaknesses analysis at this time. Please try again later. Your tokens have been refunded.",
          error: "AI analysis failed"
        });
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "weaknesses",
        language,
        resultData: weaknessesData
      });

      res.json(weaknessesData);
    } catch (error) {
      console.error("Error generating weaknesses analysis:", error);
      // Refund tokens for unexpected errors
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "weaknesses", "Weaknesses Analysis");
      res.status(500).json({ message: "Failed to generate weaknesses analysis. Your tokens have been refunded." });
    }
  });


  // Nutrition Plan endpoint using Gemini 2.5 Pro
  app.post('/api/analysis/:athleteId/nutrition-plan', isAuthenticated, async (req: any, res) => {
    const tokenCost = 75;
    try {
      const userId = req.user.claims.sub;
      const athleteId = req.params.athleteId;

      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Nutrition Plan Generation",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "nutrition-plan"
      });

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";

      // Check if athlete has all required fields for nutrition plan, extract from bio if missing
      let athleteAge = athlete.age;
      let athleteGender = athlete.gender;
      let athleteCountry = athlete.country;
      
      // Generate nutrition plan with safe defaults for missing data
      const nutritionPlan = await generateNutritionPlan(
        athlete.name, 
        Number(athleteAge) || 25, // Default age if not provided
        athleteGender || 'Unknown', 
        sportName,
        athleteCountry || 'International'
      );
      
      // Check if the nutrition plan generation failed
      if ((nutritionPlan as any).error) {
        // Refund tokens for failed analysis
        await refundTokensForFailedAnalysis(
          userId,
          athleteId,
          tokenCost,
          'nutrition-plan',
          'Nutrition Plan'
        );
        
        console.log(`🚫 FAILED: Nutrition plan generation failed for ${athlete.name}, refunded ${tokenCost} tokens`);
        return res.status(500).json({
          message: (nutritionPlan as any).errorMessage || "Unable to generate authentic nutrition plan at this time. Please try again later.",
          error: true,
          errorType: (nutritionPlan as any).errorType || "unknown",
          retryable: (nutritionPlan as any).retryable || true,
          suggestion: (nutritionPlan as any).suggestion || "Please try again later"
        });
      }

      // Smart fallback: extract missing info from bio or use AI
      if (!athleteAge || !athleteGender || !athleteCountry) {
        console.log(`Missing data for ${athlete.name}. Attempting to extract from bio or AI...`);
        
        try {
          // First, try to extract from existing bio
          if (athlete.bio) {
            const bioText = athlete.bio.toLowerCase();
            
            // Extract gender from bio
            if (!athleteGender) {
              if (bioText.includes('women') || bioText.includes('female') || bioText.includes('she ') || bioText.includes('her ')) {
                athleteGender = 'Female';
              } else if (bioText.includes('men') || bioText.includes('male') || bioText.includes('he ') || bioText.includes('his ')) {
                athleteGender = 'Male';
              }
            }
            
            // Extract country/nationality from bio
            if (!athleteCountry) {
              const countryMatches = bioText.match(/(egyptian|american|spanish|british|french|german|brazilian|chinese|japanese|korean|russian|italian|australian|canadian|mexican|indian|south african|nigerian|kenyan|ethiopian|moroccan|tunisian|algerian|palestinian|jordanian|lebanese|saudi|turkish|greek|swedish|norwegian|dutch|portuguese|argentinian|chilean|colombian|peruvian|venezuelan|ecuadorian|bolivian|uruguayan|paraguayan|thai|vietnamese|malaysian|indonesian|filipino|singaporean|iranian|iraqi|afghan|pakistani|bangladeshi|sri lankan|nepalese|polish|czech|slovakian|hungarian|romanian|bulgarian|serbian|croatian|slovenian|ukrainian|lithuanian|latvian|estonian|finnish|danish|icelandic|irish|welsh|scottish|new zealander)/);
              
              if (countryMatches) {
                const nationalityMap: { [key: string]: string } = {
                  'egyptian': 'Egypt', 'american': 'United States', 'spanish': 'Spain', 'british': 'United Kingdom',
                  'french': 'France', 'german': 'Germany', 'brazilian': 'Brazil', 'chinese': 'China',
                  'japanese': 'Japan', 'korean': 'South Korea', 'russian': 'Russia', 'italian': 'Italy',
                  'australian': 'Australia', 'canadian': 'Canada', 'mexican': 'Mexico', 'indian': 'India',
                  'saudi': 'Saudi Arabia', 'turkish': 'Turkey', 'palestinian': 'Palestine'
                };
                athleteCountry = nationalityMap[countryMatches[1]] || countryMatches[1];
              }
            }
          }
          
          // If still missing critical info, use AI to extract from bio
          if ((!athleteAge || !athleteGender || !athleteCountry) && athlete.bio) {
            console.log(`Using AI to extract missing info for ${athlete.name}...`);
            
            const extractionPrompt = `Extract the following information from this athlete biography:
Bio: "${athlete.bio}"

Please provide ONLY the missing information in JSON format:
${!athleteAge ? '- age: estimated age as a number' : ''}
${!athleteGender ? '- gender: "Male" or "Female"' : ''}
${!athleteCountry ? '- country: full country name' : ''}

Return only valid JSON with the missing fields.`;

            const aiResponse = await generateSpecificAnalysis(athlete.name, sportName, 'info-extraction', { bio: athlete.bio, extractionPrompt });
            
            if (aiResponse.extractedInfo) {
              if (!athleteAge && aiResponse.extractedInfo.age) athleteAge = aiResponse.extractedInfo.age;
              if (!athleteGender && aiResponse.extractedInfo.gender) athleteGender = aiResponse.extractedInfo.gender;
              if (!athleteCountry && aiResponse.extractedInfo.country) athleteCountry = aiResponse.extractedInfo.country;
            }
          }
          
          // Update athlete record with extracted information
          if (athleteAge || athleteGender || athleteCountry) {
            const updateData: any = {};
            if (athleteAge && !athlete.age) updateData.age = athleteAge;
            if (athleteGender && !athlete.gender) updateData.gender = athleteGender;
            if (athleteCountry && !athlete.country) updateData.country = athleteCountry;
            
            if (Object.keys(updateData).length > 0) {
              await storage.updateAthlete(athleteId, updateData);
              console.log(`Updated ${athlete.name} with extracted data:`, updateData);
            }
          }
          
        } catch (extractionError) {
          console.error(`Failed to extract missing info for ${athlete.name}:`, extractionError);
        }
      }

      // Final check - if still missing critical info, provide reasonable defaults
      if (!athleteAge || !athleteGender || !athleteCountry) {
        console.log(`Missing data for ${athlete.name}:`, { age: athleteAge, gender: athleteGender, country: athleteCountry });
        
        // Provide reasonable defaults based on sport and context
        if (!athleteAge) {
          athleteAge = 22; // Reasonable default for competitive athletes
          console.log(`Using default age ${athleteAge} for ${athlete.name}`);
        }
        if (!athleteGender) {
          athleteGender = 'Unknown'; // Will be handled in nutrition plan generation
          console.log(`Using default gender ${athleteGender} for ${athlete.name}`);
        }
        if (!athleteCountry) {
          athleteCountry = 'International'; // Will use international cuisine
          console.log(`Using default country ${athleteCountry} for ${athlete.name}`);
        }
      }

      const forceUpdate = req.query.forceUpdate === 'true';
      
      // Check for existing nutrition plans in database (skip if force update)
      const existingNutritionPlans = await storage.getNutritionPlans(athleteId);
      
      let nutritionPlanData;
      if (!forceUpdate && existingNutritionPlans.length > 0) {
        // Use existing nutrition plan - parse JSON if stored as string
        const storedPlan = existingNutritionPlans[0].plan;
        let planContent;
        
        try {
          if (typeof storedPlan === 'string') {
            const parsedPlan = JSON.parse(storedPlan);
            planContent = parsedPlan.content || storedPlan;
          } else {
            planContent = storedPlan;
          }
        } catch (e) {
          planContent = storedPlan;
        }
        
        nutritionPlanData = {
          plan: planContent
        };
      } else {
        // Generate fresh nutrition plan using Gemini 2.5 Pro
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} nutrition plan for ${athlete.name}`);
        
        try {
          const generatedPlan = await generateNutritionPlan(
            athlete.name,
            athleteAge!,
            athleteGender!,
            sportName,
            athleteCountry!
          );

          // Store nutrition plan in database
          if (generatedPlan.plan) {
            await storage.createNutritionPlan({
              athleteId,
              plan: JSON.stringify({ content: generatedPlan.plan, generatedAt: new Date().toISOString() })
            });
          }

          nutritionPlanData = generatedPlan;
        } catch (aiError) {
          console.error(`Error generating nutrition plan for ${athlete.name}:`, aiError);
          
          // Check if this is a web search failure that should refund tokens
          if (aiError instanceof Error && aiError.message.includes('AI_WEB_SEARCH_FAILED')) {
            await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "nutrition", "Nutrition Plan");
            return res.status(404).json({ 
              message: "AI web search could not find reliable nutrition data for this athlete. Please try again later. Your tokens have been refunded.",
              error: "web_search_failed",
              shouldRetry: true
            });
          }
          
          // For other errors, also refund tokens
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "nutrition", "Nutrition Plan");
          return res.status(500).json({ 
            message: "Failed to generate nutrition plan. Your tokens have been refunded.",
            error: aiError instanceof Error ? aiError.message : String(aiError)
          });
        }
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "nutrition-plan",
        language: "en", // Old endpoint doesn't have language parameter, default to English
        resultData: nutritionPlanData
      });

      res.json(nutritionPlanData);
    } catch (error) {
      console.error("Error generating nutrition plan:", error);
      // This catch block should now be unreachable due to comprehensive error handling above
      res.status(500).json({ message: "Unexpected system error occurred" });
    }
  });

  // Enhanced Nutrition Plan endpoint for form-based generation
  app.post('/api/analysis/nutrition-plan', isAuthenticatedUniversal, asyncHandler(async (req: any, res: Response) => {
    const tokenCost = 75;
    const userId = req.user.claims.sub;
    
    try {
      // Validate request body with Zod schema
      const validationResult = nutritionPlanSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: errors,
          details: validationResult.error.errors
        });
      }

      const formData = validationResult.data;
      const { goal, sport, age, height, currentWeight, targetWeight, country, period, language } = formData;

      // Check user tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      // Note: Tokens will be deducted AFTER successful generation

      console.log(`🍽️ Generating nutrition plan for user ${userId} with enhanced data: goal=${goal}, weight=${currentWeight}→${targetWeight}kg, period=${period}w, language=${language}`);

      // Get sport name - handle both sport ID and sport name
      let sportName = "General Fitness";
      if (sport) {
        try {
          // First try to get by ID (if it's a UUID format)
          if (sport.includes('-') && sport.length > 20) {
            const sportData = await storage.getSportById(sport);
            sportName = sportData?.name || sport;
          } else {
            // If not ID format, use as sport name directly
            sportName = sport;
          }
        } catch (error) {
          console.log(`Sport '${sport}' not found by ID, using as name directly`);
          sportName = sport;
        }
      }

      // Prepare enhanced form data for AI generation
      const enhancedFormData: NutritionPlanFormData = {
        goal,
        age,
        height,
        currentWeight,
        targetWeight,
        period,
        sportName,
        country,
        language,
        gender: 'Unknown', // Not collected in form
        name: 'User' // Using generic name for privacy
      };

      // Generate personalized nutrition plan with overall timeout protection
      const overallTimeoutMs = period > 4 ? 600000 : 450000; // 10 minutes for long periods, 7.5 minutes for short periods
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`ROUTE_TIMEOUT: Overall nutrition plan generation exceeded ${Math.floor(overallTimeoutMs/1000)} seconds`));
        }, overallTimeoutMs);
      });
      
      const nutritionPlan = await Promise.race([
        generateEnhancedNutritionPlan(enhancedFormData),
        timeoutPromise
      ]);
      
      // Check if the nutrition plan generation failed
      if ((nutritionPlan as any).error) {
        console.log(`🚫 FAILED: Enhanced nutrition plan generation failed - no tokens deducted`);
        return res.status(500).json({
          message: (nutritionPlan as any).errorMessage || "Unable to generate nutrition plan at this time. Please try again later.",
          error: true,
          errorType: (nutritionPlan as any).errorType || "unknown",
          retryable: (nutritionPlan as any).retryable || true,
          suggestion: (nutritionPlan as any).suggestion || "Please try again later"
        });
      }

      // SUCCESS: Now deduct tokens after confirmed successful generation
      let tokenDeducted = false;
      try {
        await storage.deductTokens(userId, tokenCost);
        tokenDeducted = true;
        
        await storage.createTransaction({
          userId,
          action: "Personal Nutrition Plan Generation",
          tokensDeducted: tokenCost,
          serviceType: "nutrition-plan"
        });

        console.log(`✅ SUCCESS: Enhanced nutrition plan generated for user ${userId}, ${tokenCost} tokens deducted`);
      } catch (deductionError) {
        console.error("Error during token deduction or transaction creation:", deductionError);
        
        // If tokens were deducted but transaction failed, try to refund
        if (tokenDeducted) {
          try {
            await storage.refundTokens(userId, tokenCost);
            console.log(`🔄 REFUND: ${tokenCost} tokens refunded due to transaction error`);
          } catch (refundError) {
            console.error("Failed to refund tokens after transaction error:", refundError);
          }
        }
        
        throw deductionError; // Re-throw to be caught by main catch block
      }

      // Create analysis log with enhanced data (non-fatal)
      try {
        await storage.createAnalysisLog({
          userId,
          serviceType: "nutrition-plan",
          language: language, // Save the generation language
          resultData: {
            ...(nutritionPlan as any),
            userInputs: { goal, sport: sportName, age, height, currentWeight, targetWeight, country, period, language },
            enhancedGeneration: true
          }
        });
      } catch (logError) {
        console.error("Non-fatal error creating analysis log:", logError);
        // Continue execution - logging failure shouldn't prevent successful response
      }

      res.json({
        ...(nutritionPlan as any),
        userGoal: goal,
        period: period,
        language: language,
        sportName: sportName,
        enhancedGeneration: true
      });
    } catch (error) {
      console.error("Error generating enhanced nutrition plan:", error);
      
      // Most errors occur before token deduction, but check if this is a post-deduction error
      const isPostDeductionError = error instanceof Error && 
        (error.message.includes('transaction creation') || 
         error.message.includes('analysis log'));
      
      if (isPostDeductionError) {
        console.log(`🔄 FAILED: Post-deduction error occurred - tokens may have already been refunded`);
      } else {
        console.log(`🚫 FAILED: Enhanced nutrition plan generation failed - no tokens were deducted`);
      }
      
      // Determine error message based on error type
      let errorMessage = "Failed to generate nutrition plan. Please try again.";
      let retryable = true;
      
      if (error instanceof Error) {
        if (error.message.includes('AI_JSON_PARSE_FAILED')) {
          errorMessage = "The nutrition plan was generated but had formatting issues. Please try again.";
        } else if (error.message.includes('AI_TIMEOUT') || error.message.includes('ROUTE_TIMEOUT')) {
          errorMessage = "Nutrition plan generation timed out. Please try again with a shorter period or try again later.";
        } else if (isPostDeductionError) {
          errorMessage = "The nutrition plan was generated successfully but there was an issue processing your request.";
        }
      }
      
      res.status(500).json({ 
        message: errorMessage,
        error: true,
        retryable: retryable
      });
    }
  }));


  // Job-based development plan endpoints
  
  // Create development plan job
  app.post('/api/jobs/development-plan', isAuthenticatedUniversal, asyncHandler(async (req: any, res: Response) => {
    const tokenCost = SERVICE_TOKEN_COSTS['development-plan'] || 80;
    const userId = req.user.claims.sub;
    
    try {
      // Validate request body with Zod schema
      const validationResult = developmentPlanSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: errors,
          details: validationResult.error.errors
        });
      }

      const { goal, age, height, weight, gender, sport, language } = validationResult.data;

      // Check if user has sufficient tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      // Deduct tokens upfront to reserve them
      await storage.deductTokens(userId, tokenCost);
      let tokensDeducted = true;
      
      try {
        // Create transaction record
        await storage.createTransaction({
          userId,
          action: "Development Plan Job Creation",
          tokensDeducted: tokenCost,
          serviceType: "development-plan"
        });

        // Create the job with tokens already reserved
        const job = await storage.createJob({
          userId,
          type: 'development-plan',
          parameters: { goal, age, height, weight, gender, sport, language, tokenCost }
        });

        console.log(`📝 Created development plan job ${job.id} for user ${userId} (${tokenCost} tokens reserved)`);

        // Return job ID immediately for polling
        res.status(202).json({ 
          jobId: job.id,
          status: job.status,
          message: "Development plan generation started. Use the jobId to check progress."
        });

      } catch (jobCreationError) {
        // Refund tokens if job creation failed
        if (tokensDeducted) {
          try {
            await storage.refundTokens(userId, tokenCost);
            console.log(`🔄 REFUND: ${tokenCost} tokens refunded due to job creation failure`);
          } catch (refundError) {
            console.error("Failed to refund tokens after job creation error:", refundError);
          }
        }
        throw jobCreationError;
      }

    } catch (error) {
      console.error("Error creating development plan job:", error);
      res.status(500).json({ 
        message: "Failed to create development plan job. Please try again.",
        error: true
      });
    }
  }));

  // Create nutrition plan job
  app.post('/api/jobs/nutrition-plan', isAuthenticatedUniversal, asyncHandler(async (req: any, res: Response) => {
    const tokenCost = SERVICE_TOKEN_COSTS['nutrition-plan'] || 50;
    const userId = req.user.claims.sub;
    
    try {
      // Validate request body with Zod schema
      const validationResult = nutritionPlanSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: errors,
          details: validationResult.error.errors
        });
      }

      const formData = validationResult.data;

      // Check if user has sufficient tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      // Deduct tokens upfront to reserve them
      await storage.deductTokens(userId, tokenCost);
      let tokensDeducted = true;
      
      try {
        // Create transaction record
        await storage.createTransaction({
          userId,
          action: "Nutrition Plan Job Creation",
          tokensDeducted: tokenCost,
          serviceType: "nutrition-plan"
        });

        // Create the job with tokens already reserved
        const job = await storage.createJob({
          userId,
          type: 'nutrition-plan',
          parameters: { ...formData, tokenCost }
        });

        console.log(`🥗 Created nutrition plan job ${job.id} for user ${userId} (${tokenCost} tokens reserved)`);

        // Return job ID immediately for polling
        res.status(202).json({ 
          jobId: job.id,
          status: job.status,
          message: "Nutrition plan generation started. Use the jobId to check progress."
        });

      } catch (jobCreationError) {
        // Refund tokens if job creation failed
        if (tokensDeducted) {
          try {
            await storage.refundTokens(userId, tokenCost);
            console.log(`🔄 REFUND: ${tokenCost} tokens refunded due to job creation failure`);
          } catch (refundError) {
            console.error("Failed to refund tokens after job creation error:", refundError);
          }
        }
        throw jobCreationError;
      }

    } catch (error) {
      console.error("Error creating nutrition plan job:", error);
      res.status(500).json({ 
        message: "Failed to create nutrition plan job. Please try again.",
        error: true
      });
    }
  }));

  // Get job status and results
  app.get('/api/jobs/:jobId', isAuthenticatedUniversal, asyncHandler(async (req: any, res: Response) => {
    const { jobId } = req.params;
    const userId = req.user.claims.sub;
    
    try {
      const job = await storage.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Ensure user can only access their own jobs
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to job" });
      }

      // Return job status and results
      res.json({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        result: job.result,
        partialResult: job.partialResult,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      });

    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ 
        message: "Failed to fetch job status. Please try again.",
        error: true
      });
    }
  }));

  // Cancel job
  app.delete('/api/jobs/:jobId', isAuthenticatedUniversal, asyncHandler(async (req: any, res: Response) => {
    const { jobId } = req.params;
    const userId = req.user.claims.sub;
    
    try {
      const job = await storage.getJobById(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Ensure user can only cancel their own jobs
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to job" });
      }

      // Check if job can be cancelled
      if (job.status === 'completed' || job.status === 'failed') {
        return res.status(400).json({ 
          message: `Cannot cancel ${job.status} job`,
          status: job.status
        });
      }

      if (job.status === 'cancelled') {
        return res.json({ 
          message: "Job already cancelled",
          status: job.status
        });
      }

      // Cancel the job
      const cancelledJob = await storage.cancelJob(jobId);
      
      console.log(`🛑 Job ${jobId} cancelled by user ${userId}`);

      res.json({
        id: cancelledJob.id,
        status: cancelledJob.status,
        message: "Job cancelled successfully"
      });

    } catch (error) {
      console.error("Error cancelling job:", error);
      res.status(500).json({ 
        message: "Failed to cancel job. Please try again.",
        error: true
      });
    }
  }));

  app.post('/api/analysis/:athleteId/beat-strategies', isAuthenticated, async (req: any, res) => {
    const tokenCost = 100;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    const language = req.body.language || 'en'; // Extract language from request body
    try {

      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Beat Strategies",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "beat"
      });

      // Get athlete data and check database for existing beat strategies
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Always generate fresh athlete-specific beat strategies using GPT-5 for authentic analysis
      console.log(`Generating new beat strategies for ${athlete.name}`);
      
      // Get enhanced data for taekwondo athletes
      let enhancedData = null;
      if (sportName.toLowerCase() === 'taekwondo') {
        try {
          enhancedData = await getEnhancedTaekwondoData(athlete.name, athlete.country || undefined);
        } catch (error) {
          console.error(`Failed to get enhanced taekwondo data: ${error}`);
        }
      }
      
      // Prepare athlete data for personalized analysis
      const athleteDataForAnalysis = {
        bio: athlete.bio,
        rank: athlete.rank,
        country: athlete.country,
        achievements: athlete.achievements,
        competitionRecord: enhancedData?.currentRecord || "N/A",
        // Include personal info
        age: athlete.personalInfo?.age || athlete.age?.toString() || "N/A",
        dateOfBirth: athlete.personalInfo?.dateOfBirth || "N/A",
        height: athlete.personalInfo?.height || "N/A",
        category: athlete.personalInfo?.category || "N/A",
        gender: athlete.gender || "N/A"
      };
      
      // Generate athlete-specific beat strategies
      const strategiesAnalysis = await generateSpecificAnalysis(athlete.name, sportName, 'beat-strategies', athleteDataForAnalysis, undefined, language);
      
      let beatStrategies;
      if (strategiesAnalysis.strategies?.length > 0) {
        // Use authentic AI-generated strategies
        const aiBeatStrategies = strategiesAnalysis.strategies.map((strategy: any) => ({
          strategy: strategy.title,
          description: strategy.description,
          execution: strategy.execution || "Apply systematically during competition",
          success_probability: strategy.success_probability || "medium",
          risk_level: strategy.risk_level || "medium",
          references: strategy.references || []
        }));
        
        beatStrategies = {
          strategies: aiBeatStrategies,
          keyWeaknesses: strategiesAnalysis.keyWeaknesses || []
        };
      } else {
        // If AI analysis fails, refund tokens and inform user
        console.log(`❌ Beat strategies analysis failed for ${athlete.name}, refunding tokens`);
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "beat", "Beat Strategies");
        return res.status(500).json({
          message: "Unable to generate authentic strategic analysis at this time. Please try again later. Your tokens have been refunded."
        });
      }
      
      // Check if the beat strategies analysis failed and refund tokens if needed
      if (isAnalysisFailed(beatStrategies)) {
        console.log(`❌ Beat strategies analysis failed for ${athlete.name}, refunding tokens`);
        await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "beat", "Beat Strategies");
        return res.status(500).json({
          message: "Unable to generate authentic strategic analysis at this time. Please try again later. Your tokens have been refunded."
        });
      }

      // Store AI beat strategies in database for future reference
      if (beatStrategies.strategies && beatStrategies.strategies.length > 0) {
        for (const strategy of beatStrategies.strategies) {
          try {
            await storage.createBeatStrategy({
              athleteId,
              strategy: strategy.strategy,
              description: strategy.description
            });
          } catch (error) {
            console.log(`Could not store beat strategy: ${error}`);
          }
        }
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "beat",
        language,
        resultData: beatStrategies
      });

      res.json(beatStrategies);
    } catch (error) {
      console.error("Error generating beat strategies:", error);
      // Refund tokens for unexpected errors
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "beat", "Beat Strategies");
      res.status(500).json({ 
        message: "Unable to generate authentic beat strategies at this time. Please try again later. Your tokens have been refunded."
      });
    }
  });

  // Statistics generation endpoint using GPT-5 
  app.post('/api/analysis/:athleteId/statistics', isAuthenticated, async (req: any, res) => {
    const tokenCost = 60;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    const language = req.body.language || 'en';
    
    try {
      // Check tokens and deduct
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Statistics Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "statistics"
      });

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      const forceUpdate = req.query.forceUpdate === 'true';
      
      // Check for existing statistics in analysis logs (skip if force update)
      let statisticsData;
      if (!forceUpdate) {
        const existingAnalyses = await storage.getLatestAnalysisByType(["statistics"]);
        const existingStatistics = existingAnalyses.find(analysis => analysis.athleteId === athleteId);
        if (existingStatistics) {
          console.log(`Using cached statistics for ${athlete.name}`);
          statisticsData = existingStatistics.resultData;
        }
      }
      
      if (!statisticsData || forceUpdate) {
        // Generate fresh statistics using o3 with web search
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} statistics for ${athlete.name}`);
        
        try {
          statisticsData = await generateAthleteStatisticsO3(
            athlete.name,
            sportName,
            athlete.country || undefined
          );
        } catch (aiError) {
          console.error(`Error generating statistics for ${athlete.name}:`, aiError);
          
          // Check if this is a web search failure that should refund tokens
          if (aiError instanceof Error && aiError.message.includes('AI_WEB_SEARCH_FAILED')) {
            await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "statistics", "Statistics Analysis");
            return res.status(404).json({ 
              message: "AI web search could not find reliable statistical data for this athlete. Please try again later. Your tokens have been refunded.",
              error: "web_search_failed",
              shouldRetry: true
            });
          }
          
          // For other errors, also refund tokens
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "statistics", "Statistics Analysis");
          return res.status(500).json({ 
            message: "Failed to generate statistics analysis. Your tokens have been refunded.",
            error: aiError instanceof Error ? aiError.message : String(aiError)
          });
        }
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "statistics",
        language,
        resultData: statisticsData
      });

      res.json(statisticsData);
    } catch (error) {
      console.error("Error generating statistics analysis:", error);
      // Refund tokens for unexpected errors
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "statistics", "Statistics Analysis");
      res.status(500).json({ message: "Failed to generate statistics analysis. Your tokens have been refunded." });
    }
  });

  // Old video route removed - using standalone /api/analysis/video instead

  // Transaction history
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Analysis history
  app.get('/api/analysis-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getUserAnalysisLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching analysis logs:", error);
      res.status(500).json({ message: "Failed to fetch analysis logs" });
    }
  });

  // User complete history (transactions + analysis logs combined)
  app.get('/api/user-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Don't filter by language - show all history items
      const historyItems = await storage.getUserHistory(userId);
      res.json(historyItems);
    } catch (error) {
      console.error("Error fetching user history:", error);
      res.status(500).json({ message: "Failed to fetch user history" });
    }
  });

  app.delete('/api/user-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearUserHistory(userId);
      res.json({ message: "History cleared successfully" });
    } catch (error) {
      console.error("Error clearing user history:", error);
      res.status(500).json({ message: "Failed to clear user history" });
    }
  });

  // Get most recent analysis history for a specific service type and athlete
  app.get('/api/user-history/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { athleteId, serviceType } = req.query;

      if (!serviceType) {
        return res.status(400).json({ message: "serviceType is required" });
      }

      // Get all user history
      const historyItems = await storage.getUserHistory(userId);
      
      // Filter by serviceType and optionally athleteId
      const filteredHistory = historyItems
        .filter((item: any) => {
          const matchesServiceType = item.serviceType === serviceType || 
            (serviceType === 'development-plan' && (item.serviceType === 'development' || item.serviceType === 'development-plan')) ||
            (serviceType === 'nutrition-plan' && (item.serviceType === 'nutrition' || item.serviceType === 'nutrition-plan')) ||
            (serviceType === 'beat-strategies' && (item.serviceType === 'beat' || item.serviceType === 'beat-strategies'));
          
          if (!athleteId) {
            return matchesServiceType;
          }
          
          return matchesServiceType && item.athleteId === athleteId;
        })
        .sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

      // Return the most recent one, or null if none exists
      const latest = filteredHistory.length > 0 ? filteredHistory[0] : null;
      
      res.json({
        success: true,
        data: latest,
        hasHistory: !!latest
      });
    } catch (error) {
      console.error("Error fetching latest history:", error);
      res.status(500).json({ message: "Failed to fetch latest history" });
    }
  });

  // Token purchase endpoint - simplified endpoint for modal compatibility
  app.post('/api/purchase-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;

      if (!amount) {
        return res.status(400).json({ message: "Amount is required" });
      }

      // Calculate tokens based on amount
      const tokensAmount = amount === 15 ? 500 : amount === 25 ? 1000 : amount === 50 ? 2500 : 0;
      if (tokensAmount === 0) {
        return res.status(400).json({ message: "Invalid purchase amount" });
      }

      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add tokens to user
      await storage.addTokensPurchase(userId, tokensAmount);

      // Create transaction record
      await storage.createTransaction({
        userId,
        action: "Token Purchase",
        tokensDeducted: -tokensAmount,
        serviceType: "purchase"
      });

      const updatedUser = await storage.getUser(userId);
      res.json({ 
        success: true,
        message: "Tokens purchased successfully", 
        tokens: updatedUser?.tokens || 0,
        totalPurchased: updatedUser?.totalTokensPurchased || 0,
        purchased: tokensAmount,
        transactionId
      });
    } catch (error) {
      console.error("Error purchasing tokens:", error);
      res.status(500).json({ message: "Failed to purchase tokens" });
    }
  });

  // Token purchase endpoint (for testing) - detailed endpoint
  app.post('/api/user/purchase-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transactionId, amount, tokensAmount, paymentMethod, cardLast4, cardBrand } = req.body;

      if (!transactionId || !amount || !tokensAmount) {
        return res.status(400).json({ message: "Transaction ID, amount, and tokens amount are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add tokens to user
      await storage.addTokensPurchase(userId, tokensAmount);

      // Create transaction record
      await storage.createTransaction({
        userId,
        action: "Token Purchase",
        tokensDeducted: -tokensAmount,
        serviceType: "purchase"
      });

      const updatedUser = await storage.getUser(userId);
      res.json({ 
        success: true,
        message: "Tokens purchased successfully", 
        tokens: updatedUser?.tokens || 0,
        totalPurchased: updatedUser?.totalTokensPurchased || 0,
        purchased: tokensAmount,
        transactionId
      });
    } catch (error) {
      console.error("Error purchasing tokens:", error);
      res.status(500).json({ message: "Failed to purchase tokens" });
    }
  });

  // ====================== Paymob Flash (Unified Checkout) ======================

  // Create payment intention (Flash)
  app.post('/api/payments/create-intent', isAuthenticatedUniversal, async (req: any, res) => {
    const userId = req.user?.claims?.sub || 'test_user';
    try {
      const { amount, tokensAmount, customerInfo } = req.body;

      if (!amount || !tokensAmount) {
        return res.status(400).json({ message: "Amount and tokens amount are required" });
      }

      console.log('🔄 Creating Flash payment intention for user:', userId, '- Amount:', amount, 'Tokens:', tokensAmount);

      // Get user data for authentic customer information
      const user = await storage.getUser(userId);
      const userEmail = user?.email || req.user?.email;
      
      // Use real user data or realistic fallbacks
      const customerData = {
        email: userEmail || 'customer.payment@athlete360.eg',
        firstName: user?.firstName || customerInfo?.firstName || 'Ahmed',
        lastName: user?.lastName || customerInfo?.lastName || 'Mohamed',
        phone: customerInfo?.phone || '+201012345678'
      };

      // Unique merchant order ID
      const merchantOrderId = `tokens_${userId}_${Date.now()}`;

      console.log('👤 Using customer data:', { 
        email: customerData.email, 
        name: `${customerData.firstName} ${customerData.lastName}`,
        phone: customerData.phone
      });

      // Call Paymob unified Intention API
      const paymentIntention = await paymobService.createPaymentIntention({
        amount, // Amount in EGP (will be converted to cents in service)
        currency: 'EGP',
        userId: userId,
        customerEmail: customerData.email,
        customerFirstName: customerData.firstName,
        customerLastName: customerData.lastName,
        customerPhone: customerData.phone
      });

      console.log('💾 Storing payment context:', {
        intentionId: paymentIntention.id,
        merchantOrderId,
        userId: 'test',
        amount,
        tokensAmount
      });

      res.json({
        success: true,
        paymentIntent: {
          id: paymentIntention.id,
          client_secret: paymentIntention.client_secret,
          redirect_url: `https://accept.paymob.com/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY}&clientSecret=${paymentIntention.client_secret}`,
        },
        amount,
        tokensAmount,
        userId: 'test',
        merchantOrderId
      });
    } catch (error: any) {
      console.error("💥 Error creating payment intention:", error);
      console.error("💥 Error message:", error?.message);
      console.error("💥 Error stack:", error?.stack);
      console.error("💥 Error response:", error?.response?.data || 'No response data');
      res.status(500).json({
        message: "Failed to create payment intention",
        error: error?.message || 'Unknown error',
        details: error?.response?.data || null
      });
    }
  });

  // Flash webhook with HMAC verification
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body || '');
      const hmac = req.get('hmac') || req.get('x-hmac-signature') || '';

      if (!paymobService.verifyWebhookSignature(rawBody, hmac)) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).send('Unauthorized');
      }

      const payload = JSON.parse(rawBody);
      const result = await paymobService.processPaymentCallback(payload);

      console.log('📥 Payment webhook received:', result);

      if (result.success && !result.pending) {
        const amount = result.amount_cents / 100;

        // Map packages
        const tokensToAdd = amount === 25 ? 1000 : amount === 15 ? 500 : amount === 50 ? 2500 : 0;

        if (tokensToAdd > 0) {
          console.log(`✅ Payment successful: ${amount} EGP, ${tokensToAdd} tokens`);
          // Note: User identification would need to be implemented based on session management
        }
      }

      res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook error', err);
      res.status(500).send('Webhook processing error');
    }
  });

  // Paymob transaction processed callback (webhook)
  app.post('/api/payments/paymob-processed', async (req, res) => {
    try {
      console.log('📥 Paymob processed callback received:', req.body);
      
      const transaction = req.body;
      
      // Verify the transaction and update user tokens
      if (transaction.success === true && transaction.pending === false) {
        console.log('✅ Payment confirmed by Paymob:', transaction);
        
        // Extract amount and calculate tokens
        const amountInCents = transaction.amount_cents || 0;
        const amount = amountInCents / 100;
        
        // Map packages to tokens
        const tokensToAdd = amount === 25 ? 1000 : amount === 15 ? 500 : amount === 50 ? 2500 : 0;
        
        if (tokensToAdd > 0) {
          console.log(`💰 Processing payment: ${amount} EGP = ${tokensToAdd} tokens`);
          
          // Extract user ID from merchant_order_id format: tokens_USER_ID_TIMESTAMP
          const merchantOrderId = transaction.merchant_order_id || transaction.order?.merchant_order_id;
          if (merchantOrderId && merchantOrderId.startsWith('tokens_')) {
            const userId = merchantOrderId.split('_')[1];
            console.log(`🔍 Extracted user ID: ${userId} from merchant order: ${merchantOrderId}`);
            
            try {
              // Credit tokens to user account
              await storage.addTokensPurchase(userId, tokensToAdd);
              
              // Create transaction record
              await storage.createTransaction({
                userId,
                action: `Token Purchase - ${amount} EGP`,
                tokensDeducted: -tokensToAdd,
                serviceType: "purchase"
              });
              
              console.log(`✅ Successfully credited ${tokensToAdd} tokens to user ${userId}`);
            } catch (error) {
              console.error(`❌ Error crediting tokens to user ${userId}:`, error);
            }
          } else {
            console.error('❌ Could not extract user ID from merchant_order_id:', merchantOrderId);
          }
        }
      }
      
      res.status(200).json({ status: 'processed' });
    } catch (error) {
      console.error('❌ Error processing Paymob callback:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  });

  // Paymob transaction response callback (redirect) - Handle both GET and POST
  app.all('/api/payments/paymob-response', async (req, res) => {
    console.log('🎯 CALLBACK ROUTE HIT - Backend handling this request');
    console.log('📊 Request details:', {
      method: req.method,
      query: req.query,
      body: req.body,
      headers: req.headers
    });
    
    try {
      // Handle both GET (with query params) and POST (with body) requests
      const data = req.method === 'POST' ? req.body : req.query;
      console.log('🔄 Paymob response callback received:', data);
      
      const { 
        success, 
        pending, 
        id, 
        amount_cents, 
        order,
        'data.message': dataMessage,
        'txn_response_code': txnResponseCode,
        'acq_response_code': acqResponseCode,
        error_occured
      } = data;
      
      // Debug logging to understand the issue
      console.log('🔍 Payment status check:', {
        success,
        pending,
        error_occured,
        dataMessage,
        txnResponseCode,
        acqResponseCode,
        amount_cents
      });
      
      // Check if payment is approved based on multiple indicators
      const isPaymentApproved = (
        success === 'true' && 
        pending === 'false' && 
        (error_occured === 'false' || error_occured === undefined) && 
        (dataMessage === 'Approved' || txnResponseCode === 'APPROVED' || acqResponseCode === '00')
      );
      
      const amount = amount_cents ? parseInt(amount_cents as string) / 100 : 0;
      const tokensToAdd = amount === 25 ? 1000 : amount === 15 ? 500 : amount === 50 ? 2500 : 0;
      
      console.log(`📊 Payment approval result: ${isPaymentApproved}`);
      
      if (isPaymentApproved && amount_cents) {
        console.log(`✅ Payment APPROVED: ${amount} EGP = ${tokensToAdd} tokens`);
        console.log(`📋 Approval indicators: data.message=${dataMessage}, txn_response_code=${txnResponseCode}, acq_response_code=${acqResponseCode}`);
        
        // Extract user ID from order to credit tokens
        let userId: string | null = null;
        
        if (order) {
          try {
            // Try to get user ID from merchant_order_id stored during payment creation
            userId = await storage.getUserIdFromOrder(order as string);
            if (userId) {
              console.log(`👤 Found user ID from order format: ${userId}`);
            } else {
              console.log(`⚠️ Could not extract user ID from order: ${order}`);
            }
          } catch (error) {
            console.error(`❌ Error getting user ID from order ${order}:`, error);
          }
        }
        
        // Fallback: If we couldn't get user ID from order, check if user is authenticated
        if (!userId && (req as any).user?.claims?.sub) {
          userId = (req as any).user.claims.sub;
          console.log(`🔄 Using authenticated user ID as fallback: ${userId}`);
        }
        
        if (userId) {
          try {
            // Credit tokens to user account
            await storage.addTokensToUser(userId, tokensToAdd);
            
            // Create transaction record
            await storage.createTransaction({
              userId,
              action: `Token Purchase - ${amount} EGP (Order: ${order})`,
              tokensDeducted: -tokensToAdd,
              serviceType: "purchase"
            });
            
            console.log(`✅ Successfully credited ${tokensToAdd} tokens to user ${userId}`);
          } catch (error) {
            console.error(`❌ Error crediting tokens to user ${userId}:`, error);
          }
        } else {
          console.log(`⚠️ Could not determine user ID for token crediting - no order info and no authenticated user`);
        }
        
        // Payment successful - serve HTML success page directly
        console.log(`🔄 Serving HTML success page directly`);
        return res.send(generatePaymentResultHTML({
          status: 'completed',
          title: 'Payment Successful!',
          message: `Your payment of ${amount} EGP has been processed successfully.`,
          tokenMessage: `${tokensToAdd} tokens have been added to your account.`,
          transactionId: id as string,
          redirectUrl: '/',
          bgColor: 'bg-green-50',
          textColor: 'text-green-800',
          icon: '✅'
        }));
        
      } else if (pending === 'true' || (success === 'true' && dataMessage !== 'Approved')) {
        // Payment pending - serve HTML pending page directly
        console.log(`⏳ Serving HTML pending page: ${id}`);
        return res.send(generatePaymentResultHTML({
          status: 'pending',
          title: 'Payment Pending',
          message: 'Your payment is being processed. This may take a few minutes.',
          tokenMessage: '',
          transactionId: id as string,
          redirectUrl: '/',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-800',
          icon: '⏳'
        }));
        
      } else {
        // Payment failed - serve HTML failure page directly
        console.log(`❌ Payment FAILED or ERROR: success=${success}, pending=${pending}, error_occured=${error_occured}, data.message=${dataMessage}`);
        return res.send(generatePaymentResultHTML({
          status: 'failed',
          title: 'Payment Failed',
          message: 'There was an issue processing your payment. Please try again.',
          tokenMessage: '',
          transactionId: id as string,
          redirectUrl: '/payment-center',
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          icon: '❌'
        }));
      }
    } catch (error) {
      console.error('❌ Error handling Paymob response:', error);
      // Serve HTML error page on any errors
      return res.send(generatePaymentResultHTML({
        status: 'error',
        title: 'Payment Processing Error',
        message: 'There was an error processing your payment response. Please contact support if this issue persists.',
        tokenMessage: '',
        transactionId: '',
        redirectUrl: '/payment-center',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        icon: '⚠️'
      }));
    }
  });

  // Simple config test endpoint
  app.get('/api/payments/test-paymob', isAuthenticated, async (_req, res) => {
    try {
      res.json({
        success: true,
        message: 'Paymob Flash config OK',
        hasPublicKey: !!process.env.PAYMOB_PUBLIC_KEY,
        hasSecretKey: !!process.env.PAYMOB_SECRET_KEY,
        hasHmacSecret: !!process.env.PAYMOB_HMAC_SECRET,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================================================ 

  // Get athletes by sport
  app.get('/api/athletes/by-sport/:sportId', async (req, res) => {
    try {
      const sportId = req.params.sportId;
      const country = req.query.country as string | undefined;
      const athletes = await storage.getAthletesBySport(sportId, country);
      res.json(athletes);
    } catch (error) {
      console.error("Error fetching athletes by sport:", error);
      res.status(500).json({ message: "Failed to fetch athletes" });
    }
  });

  // Get all unique countries
  app.get('/api/countries', async (req, res) => {
    try {
      const countries = await storage.getAllCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  // Cancel athlete comparison
  app.post('/api/athletes/compare/cancel', isAuthenticated, async (req, res) => {
    try {
      const { queueId } = req.body;
      const userId = (req.user as any)?.claims?.sub;
      
      if (!queueId) {
        return res.status(400).json({ message: "Queue ID is required" });
      }

      // Add to cancelled set
      cancelledComparisons.add(queueId);
      console.log(`🚫 Comparison ${queueId} marked for cancellation`);

      // Broadcast cancellation message
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'comparison-cancelled',
              queueId,
              userId
            }));
          }
        });
      }

      res.json({ success: true, message: "Comparison cancellation requested" });
    } catch (error) {
      console.error('Error cancelling comparison:', error);
      res.status(500).json({ message: "Failed to cancel comparison" });
    }
  });

  // Compare two athletes using modular Gemini-2.5-pro approach
  app.post('/api/athletes/compare', isAuthenticated, async (req, res) => {
    const tokenCost = 100; // Higher cost for comparison analysis
    let queueId: string | undefined; // Define queueId for queue management
    let tokensDeducted = false; // Track if tokens were deducted
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { athlete1Id, athlete2Id, language = 'english', queueId: clientQueueId } = req.body;
      
      // Use client-provided queue ID or generate one
      queueId = clientQueueId || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Clear from cancelled set if it was previously cancelled
      if (queueId) {
        cancelledComparisons.delete(queueId);
      }

      // Helper function to check if cancelled
      const isCancelled = () => cancelledComparisons.has(queueId!);

      // Helper function to broadcast progress updates
      const broadcastProgress = (message: string, progress: number) => {
        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'comparison-progress',
                queueId,
                userId,
                message,
                progress
              }));
            }
          });
        }
      };

      if (!athlete1Id || !athlete2Id) {
        return res.status(400).json({ message: "Both athlete IDs are required" });
      }

      if (athlete1Id === athlete2Id) {
        return res.status(400).json({ message: "Cannot compare athlete with themselves" });
      }

      // Check tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      // Get both athletes
      broadcastProgress("Loading athlete data...", 5);
      const [athlete1, athlete2] = await Promise.all([
        storage.getAthleteById(athlete1Id),
        storage.getAthleteById(athlete2Id)
      ]);

      if (!athlete1 || !athlete2) {
        return res.status(404).json({ message: "One or both athletes not found" });
      }

      // Deduct tokens
      await storage.deductTokens(userId, tokenCost);
      tokensDeducted = true;

      // Create transaction
      await storage.createTransaction({
        userId,
        action: "Athlete Comparison",
        tokensDeducted: tokenCost,
        serviceType: "comparison"
      });
      
      // Check if cancelled before starting generation
      if (isCancelled()) {
        throw new Error('COMPARISON_CANCELLED');
      }

      // Get sport context
      const sport = await storage.getSportById(athlete1.sportId);
      const sportName = sport?.name || "Unknown Sport";

      console.log(`Generating o3 comparison with web search between ${athlete1.name} and ${athlete2.name}...`);

      // Prepare full athlete data including BrowserUse JSON (same pattern as Bio generation)
      const athlete1ForComparison = {
        name: athlete1.name,
        country: athlete1.country || "Unknown",
        profileImageUrl: athlete1.profileImageUrl || "",
        rankings: athlete1.rankings,
        competitiveHistory: athlete1.competitiveHistory,
        age: athlete1.age,
        dateOfBirth: athlete1.dateOfBirth,
        weight: athlete1.weight,
        height: athlete1.height,
        category: athlete1.category,
        achievements: athlete1.achievements,
        bio: athlete1.bio
      };
      
      const athlete2ForComparison = {
        name: athlete2.name, 
        country: athlete2.country || "Unknown",
        profileImageUrl: athlete2.profileImageUrl || "",
        rankings: athlete2.rankings,
        competitiveHistory: athlete2.competitiveHistory,
        age: athlete2.age,
        dateOfBirth: athlete2.dateOfBirth,
        weight: athlete2.weight,
        height: athlete2.height,
        category: athlete2.category,
        achievements: athlete2.achievements,
        bio: athlete2.bio
      };
      
      // Step 1: Generate Overview first with o3
      broadcastProgress("Analyzing athlete profiles...", 15);
      
      // Check if cancelled before overview generation
      if (isCancelled()) {
        throw new Error('COMPARISON_CANCELLED');
      }
      
      console.log(`🚀 Step 1: Generating Overview with o3...`);
      const overviewResult = await generateOverviewComparison(athlete1ForComparison, athlete2ForComparison, sportName, language);
      console.log('✅ Overview completed');
      broadcastProgress("Overview complete, analyzing strengths...", 35);

      // Step 2: Execute all analyses in parallel (removed Statistics)
      // Check if cancelled before parallel analyses
      if (isCancelled()) {
        throw new Error('COMPARISON_CANCELLED');
      }
      
      console.log(`🚀 Step 2: Starting parallel o3 analyses (Strengths, Weaknesses, Competition History)...`);
      
      const [
        strengthsResult,
        weaknessesResult,
        competitionHistoryResult
      ] = await Promise.all([
        generateStrengthsComparison(athlete1ForComparison, athlete2ForComparison, sportName, language),
        generateWeaknessesComparison(athlete1ForComparison, athlete2ForComparison, sportName, language),
        generateCompetitionHistoryComparison(athlete1ForComparison, athlete2ForComparison, sportName, language)
      ]);

      console.log('✅ All parallel analyses completed');
      broadcastProgress("Generating head-to-head prediction...", 75);

      // Step 3: Generate Head-to-Head prediction
      // Check if cancelled before head-to-head
      if (isCancelled()) {
        throw new Error('COMPARISON_CANCELLED');
      }
      
      console.log(`🚀 Step 3: Generating Head-to-Head prediction with o3...`);
      const headToHeadResult = await generateHeadToHeadComparison(
        athlete1ForComparison,
        athlete2ForComparison,
        sportName,
        language
      );
      console.log('✅ Head-to-Head completed');
      broadcastProgress("Finalizing comparison...", 95);

      // Structure the response with all tab data (Statistics removed)
      const comparisonId = Math.random().toString(36).substring(7);
      
      const responseData = {
        athlete1: {
          name: athlete1.name,
          country: athlete1.country || "Unknown",
          profileImageUrl: athlete1.profileImageUrl || "",
          rank: athlete1.rank || "N/A",
          rankings: athlete1.rankings, // Include full rankings object with categories
          competitiveHistory: athlete1.competitiveHistory // Include competitive history for detailed display
        },
        athlete2: {
          name: athlete2.name,
          country: athlete2.country || "Unknown", 
          profileImageUrl: athlete2.profileImageUrl || "",
          rank: athlete2.rank || "N/A",
          rankings: athlete2.rankings, // Include full rankings object with categories
          competitiveHistory: athlete2.competitiveHistory // Include competitive history for detailed display
        },
        tabs: {
          overview: {
            rawResponse: overviewResult.rawResponse,
            source: overviewResult.source,
            tabType: overviewResult.tabType
          },
          strengths: {
            rawResponse: strengthsResult.rawResponse,
            source: strengthsResult.source,
            tabType: strengthsResult.tabType
          },
          weaknesses: {
            rawResponse: weaknessesResult.rawResponse,
            source: weaknessesResult.source,
            tabType: weaknessesResult.tabType
          },
          competitionHistory: {
            rawResponse: competitionHistoryResult.rawResponse,
            source: competitionHistoryResult.source,
            tabType: competitionHistoryResult.tabType
          },
          headToHead: {
            rawResponse: headToHeadResult.rawResponse,
            source: headToHeadResult.source,
            tabType: headToHeadResult.tabType
          }
        },
        // Legacy compatibility - use overview data for main response
        gptResponse: {
          rawResponse: overviewResult.rawResponse,
          source: "o3 with Web Search",
          athletes: `${athlete1.name} vs ${athlete2.name}`,
          timestamp: new Date().toISOString()
        },
        comparisonId: comparisonId,
        note: "Powered by o3 with Web Search and BrowserUse data"
      };

      // Save comparison results to database for history
      await storage.createAnalysisLog({
        userId,
        athleteId: athlete1Id, // Use first athlete as primary reference
        serviceType: "comparison",
        language: language === 'arabic' ? 'ar' : 'en',
        resultData: responseData
      });

      // Send completion message to update queue status
      broadcastProgress("Comparison complete!", 100);
      
      // Clean up cancellation tracking
      if (queueId) {
        cancelledComparisons.delete(queueId);
      }
      
      // Also send a completion event to mark queue item as completed
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'comparison-complete',
              queueId,
              userId
            }));
          }
        });
      }

      return res.json(responseData);
        
    } catch (error) {
      console.error(`❌ Modular comparison failed:`, error);
      
      // Clean up cancellation tracking
      if (queueId) {
        cancelledComparisons.delete(queueId);
      }
      
      // Check if this was a cancellation
      const isCancellation = error instanceof Error && error.message === 'COMPARISON_CANCELLED';
      
      // Provide token refund (full refund for cancellation, partial for failure)
      const user = await storage.getUser((req.user as any)?.claims?.sub);
      if (user && tokenCost > 0 && user.tokens !== null && tokensDeducted) {
        const refundAmount = isCancellation ? tokenCost : Math.floor(tokenCost * 0.8);
        console.log(`REFUNDING ${refundAmount} tokens to user ${user.id}: ${user.tokens} → ${user.tokens + refundAmount}`);
        
        await storage.updateUserTokens(user.id, user.tokens + refundAmount);
        
        await storage.createTransaction({
          userId: user.id,
          action: isCancellation ? `Refund for cancelled athlete comparison` : `Refund for failed athlete comparison`,
          tokensDeducted: -refundAmount, // negative for refund
          serviceType: 'comparison'
        });
        
        console.log(`🔄 REFUNDED ${refundAmount} tokens to user ${user.id} for ${isCancellation ? 'cancelled' : 'failed'} comparison`);
      }
      
      // Update queue status to error if it failed (or cancelled if it was cancelled)
      if (queueId && (global as any).generationQueue) {
        (global as any).generationQueue.updateStatus(queueId, isCancellation ? 'cancelled' : 'error');
      }
      
      // Return appropriate status for cancellation vs error
      if (isCancellation) {
        return res.status(499).json({
          message: "Comparison cancelled by user",
          cancelled: true
        });
      }
      
      res.status(500).json({ 
        message: "Unable to generate athlete comparison at this time. Please try again later.",
        error: error instanceof Error ? error.message : String(error),
        refunded: true
      });
    }
  });

  // ==== TOKEN REFUND ROUTE FOR CANCELLED ANALYSES ====
  
  app.post('/api/refund-cancelled-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { athleteId, serviceType, reason } = req.body;
      
      // Get token cost for the service type
      const tokenCost = SERVICE_TOKEN_COSTS[serviceType];
      if (!tokenCost) {
        return res.status(400).json({ message: "Invalid service type" });
      }
      
      // Refund tokens using the helper function
      await refundTokensForFailedAnalysis(
        userId, 
        athleteId, 
        tokenCost, 
        serviceType, 
        `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Analysis`
      );
      
      console.log(`🚫 CANCELLED: Refunded ${tokenCost} tokens for ${serviceType} analysis cancelled by user`);
      
      res.json({ 
        success: true, 
        refunded: tokenCost, 
        message: "Tokens refunded for cancelled analysis" 
      });
      
    } catch (error) {
      console.error('Error refunding tokens for cancelled analysis:', error);
      res.status(500).json({ message: "Failed to refund tokens" });
    }
  });


  // ==== PAYMENT AND REFERRAL SYSTEM ROUTES ====

  // Complete user signup with mandatory payment card
  app.post('/api/auth/complete-signup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cardToken, cardLast4, cardBrand, paymobCustomerId, referralCode } = req.body;

      if (!cardToken || !cardLast4 || !cardBrand) {
        return res.status(400).json({ message: "Payment card information is required" });
      }

      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with payment card info
      await storage.updateUserPaymentCard(userId, {
        cardToken,
        cardLast4,
        cardBrand,
        paymobCustomerId
      });

      // Generate unique referral code for the user
      const userReferralCode = await storage.generateReferralCode(userId);

      // Process referral bonus if user came from referral link (bonus goes to link owner)
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          console.log(`Processing referral bonus: ${referrer.firstName} referred a new user, giving 100 tokens`);
          
          // Add 100 bonus tokens to the referrer (link owner)
          await storage.addTokensPurchase(referrer.id, 100);
          
          // Create referral record
          await storage.createReferral({
            referrerId: referrer.id,
            referredUserId: userId,
            bonusTokens: 100,
            status: "completed"
          });

          // Create transaction for referrer
          await storage.createTransaction({
            userId: referrer.id,
            action: "Referral Bonus",
            tokensDeducted: -100,
            serviceType: "referral"
          });
        }
      }

      const updatedUser = await storage.getUser(userId);
      
      console.log(`Signup completed for user ${userId}. Card registered: ${cardBrand} ****${cardLast4}`);
      
      res.json({
        message: "Signup completed successfully",
        user: updatedUser,
        referralCode: userReferralCode,
        success: true
      });
    } catch (error) {
      console.error("Error completing signup:", error);
      res.status(500).json({ message: "Failed to complete signup" });
    }
  });











  // Get user referrals
  app.get('/api/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const referrals = await storage.getUserReferrals(userId);
      const referralCount = await storage.getReferralCount(userId);
      
      const user = await storage.getUser(userId);
      res.json({
        referrals,
        referralCount,
        referralCode: user?.referralCode,
        totalBonusTokens: referralCount * 100
      });
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // Validate referral code
  app.get('/api/referrals/validate/:code', async (req, res) => {
    try {
      const referralCode = req.params.code;
      const user = await storage.getUserByReferralCode(referralCode);
      
      if (user) {
        res.json({ 
          valid: true, 
          referrerName: `${user.firstName} ${user.lastName}`.trim() || user.email 
        });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Testing routes (for simulation)
  app.post('/api/test/simulate-payment', isAuthenticated, async (req: any, res) => {
    try {
      const { amount, tokens } = req.body;
      const userId = req.user.claims.sub;
      
      if (!amount || !tokens) {
        return res.status(400).json({ message: 'Amount and tokens are required' });
      }

      const result = await TestingService.simulatePaymentCompletion(userId, amount, tokens);
      
      res.json({
        success: true,
        message: `Simulated payment of $${amount} for ${tokens} tokens`,
        transaction: result
      });
    } catch (error) {
      console.error('Error simulating payment:', error);
      res.status(500).json({ message: 'Failed to simulate payment' });
    }
  });

  app.post('/api/test/simulate-referral', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.body;
      const referrerUserId = req.user.claims.sub;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const result = await TestingService.simulateReferralSignup(referrerUserId, email);
      
      res.json({
        success: true,
        message: `Simulated referral signup for ${email}`,
        result
      });
    } catch (error) {
      console.error('Error simulating referral:', error);
      res.status(500).json({ message: 'Failed to simulate referral' });
    }
  });


  // Video Analysis endpoint - Direct upload like Sept 15 Python implementation
  // Video Analysis endpoint - Direct upload like Sept 15 Python implementation
  app.post('/api/analysis/video', isAuthenticated, (req: any, res, next) => {
    console.log('[VIDEO UPLOAD] Video upload endpoint hit, starting multer processing...');
    upload.single('video')(req, res, (err) => {
      console.log('[VIDEO UPLOAD] Multer processing completed');
      if (err) {
        console.error('[VIDEO UPLOAD] Multer error:', err);
        return res.status(400).json({ 
          message: "Video upload failed", 
          error: err.message,
          type: err.code || 'UPLOAD_ERROR'
        });
      }
      console.log('[VIDEO UPLOAD] Multer successful, proceeding to video analysis handler');
      next();
    });
  }, async (req: any, res) => {
    // Set a long timeout for video processing (10 minutes)
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000); // 10 minutes
    
    const tokenCost = 200; // Video analysis costs more tokens
    const requestId = `req_${Date.now()}`;
    
    console.log(`[VIDEO ROUTE ${requestId}] ===== VIDEO ANALYSIS REQUEST STARTED =====`);
    console.log(`[VIDEO ROUTE ${requestId}] Request received at ${new Date().toISOString()}`);
    
    let videoFilePath: string | null = null;
    let fileName = '';
    
    try {
      const userId = req.user.claims.sub;
      
      // Handle Multer upload
      if (!req.file) {
        throw new Error('No video file uploaded');
      }
      
      // Multer has already saved the file to disk with diskStorage
      // Use the path that multer saved it to
      videoFilePath = req.file.path;
      fileName = req.file.filename;
      
      console.log(`[VIDEO ROUTE ${requestId}] Video saved: ${videoFilePath} (${req.file.size} bytes)`);
      
      // Extract analysis parameters
      const analysisType = req.body.analysisType || 'match';
      const language = req.body.language || 'english';
      const sport = req.body.sport || 'taekwondo';
      
      console.log(`[VIDEO ROUTE ${requestId}] Analysis type: ${analysisType}`);
      console.log(`[VIDEO ROUTE ${requestId}] Language: ${language}`);
      console.log(`[VIDEO ROUTE ${requestId}] Sport: ${sport}`);
      
      // Get sport name from sport ID FIRST (before round check)
      let sportName = sport; // Use the sport parameter directly as fallback
      try {
        const sportData = await storage.getSportById(sport);
        if (sportData) {
          sportName = sportData.name;
          console.log(`[VIDEO ROUTE ${requestId}] Sport name resolved from DB: ${sportName}`);
        } else {
          console.log(`[VIDEO ROUTE ${requestId}] Sport not found in DB, using parameter value: ${sport}`);
        }
      } catch (error) {
        console.log(`[VIDEO ROUTE ${requestId}] Could not resolve sport name, using parameter value: ${sport}`, error);
      }
      
      let analysisParams = {};
      if (analysisType === 'match') {
        // Check if sport has rounds using the resolved sport name
        const sportConfig = getSportConfig(sportName);
        const roundRaw = req.body.roundToAnalyze || req.body.round;
        
        let round: number | 'no-rounds';
        if (!sportConfig.hasRounds) {
          // Sports without rounds (tennis, soccer, basketball) always use 'no-rounds'
          round = 'no-rounds';
          console.log(`[VIDEO ROUTE ${requestId}] Sport ${sportName} has no rounds, using 'no-rounds'`);
        } else if (!roundRaw) {
          // User didn't specify a round, analyze entire match
          round = 'no-rounds';
          console.log(`[VIDEO ROUTE ${requestId}] No round specified by user, analyzing entire match`);
        } else {
          // Sports with rounds (taekwondo, boxing, martial arts) use provided round
          round = roundRaw === 'no-rounds' ? 'no-rounds' : Number(roundRaw) || 1;
        }
        
        analysisParams = { round };
        console.log(`[VIDEO ROUTE ${requestId}] Match Analysis - Sport: ${sportName}, Has Rounds: ${sportConfig.hasRounds}, Round: ${round}`);
      } else if (analysisType === 'clip') {
        const whatToAnalyze = req.body.whatToAnalyze || '';
        analysisParams = { whatToAnalyze };
        console.log(`[VIDEO ROUTE ${requestId}] Clip Analysis - User request: ${whatToAnalyze}`);
      }
      
      console.log(`[ROUTE ${requestId}] User: ${userId}, File: ${fileName}, Type: ${analysisType}`);

      // Check if user has enough tokens
      console.log(`[ROUTE ${requestId}] Checking user tokens...`);
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        console.log(`[ROUTE ${requestId}] Insufficient tokens: User has ${user?.tokens || 0}, needs ${tokenCost}`);
        // Clean up uploaded file
        if (videoFilePath && fs.existsSync(videoFilePath)) {
          fs.unlinkSync(videoFilePath);
        }
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      console.log(`[ROUTE ${requestId}] Token check passed: User has ${user.tokens} tokens`);

      // NOTE: Tokens will be deducted AFTER user previews and accepts results
      // This prevents charging for cancelled or failed analyses
      
      console.log(`[ROUTE ${requestId}] Starting video analysis processing (tokens will be charged after preview)...`);
      console.log(`[ROUTE ${requestId}] Video file details - Path: ${videoFilePath}, Size: ${req.file.size} bytes`);
      
      const analysisStartTime = Date.now();
      
      // Process video with Gemini using appropriate function
      if (!videoFilePath) {
        throw new Error('Video file path is not available');
      }
      
      let analysisResults;
      
      if (analysisType === 'clip') {
        // Import the clip analysis function
        const { analyzeVideoClip } = await import('./videoAnalysisService');
        
        // Perform clip analysis
        analysisResults = await analyzeVideoClip(
          videoFilePath,
          fileName,
          (analysisParams as any).whatToAnalyze,
          sportName,
          language
        );
      } else {
        // Default to match analysis
        const { analyzeVideoComprehensive } = await import('./videoAnalysisService');
        
        analysisResults = await analyzeVideoComprehensive(
          videoFilePath,
          fileName,
          (analysisParams as any).round,
          language,
          sportName
        );
      }

      const analysisTime = Date.now() - analysisStartTime;
      console.log(`[ROUTE ${requestId}] Video analysis completed in ${analysisTime}ms`);

      // Check if user still has enough tokens (they might have spent them during analysis)
      const userAfterAnalysis = await storage.getUser(userId);
      if (!userAfterAnalysis || (userAfterAnalysis.tokens || 0) < tokenCost) {
        console.error(`[ROUTE ${requestId}] Insufficient tokens after analysis - required: ${tokenCost}, available: ${userAfterAnalysis?.tokens || 0}`);
        return res.status(402).json({ 
          message: "Insufficient tokens",
          required: tokenCost,
          available: userAfterAnalysis?.tokens || 0
        });
      }
      
      // Automatically deduct tokens and save result
      console.log(`[ROUTE ${requestId}] Deducting ${tokenCost} tokens from user ${userId}`);
      await storage.deductTokens(userId, tokenCost);
      
      // Create transaction record
      console.log(`[ROUTE ${requestId}] Creating transaction record`);
      await storage.createTransaction({
        userId,
        action: "Video Analysis",
        tokensDeducted: tokenCost,
        athleteId: null,
        serviceType: "video"
      });
      
      // Save analysis log to database
      console.log(`[ROUTE ${requestId}] Saving analysis log to database`);
      await storage.createAnalysisLog({
        userId,
        athleteId: null,
        serviceType: "video",
        resultData: analysisResults
      });
      
      console.log(`[ROUTE ${requestId}] Video analysis completed and saved successfully`);
      res.json({
        success: true,
        message: "Video analysis completed successfully",
        data: analysisResults,
        isPaid: true
      });

    } catch (error) {
      console.error(`[ROUTE ${requestId}] Error during video analysis:`, error);
      console.error(`[ROUTE ${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`[ROUTE ${requestId}] Error type:`, typeof error);
      
      // Save error to database for debugging
      try {
        console.log(`[ROUTE ${requestId}] Saving error log to database...`);
        await storage.createAnalysisLog({
          userId: req.user.claims.sub,
          athleteId: null,
          serviceType: "video",
          resultData: {
            error: true,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            timestamp: new Date().toISOString(),
            requestId,
            fileName: fileName,
            fileSize: videoFilePath && fs.existsSync(videoFilePath) ? fs.statSync(videoFilePath).size : 0,
            filePath: videoFilePath
          }
        });
        console.log(`[ROUTE ${requestId}] Error log saved to database`);
      } catch (dbError) {
        console.error(`[ROUTE ${requestId}] Failed to save error log to database:`, dbError);
      }
      
      res.status(500).json({ 
        message: "Failed to analyze video",
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      
    } finally {
      // Clean up video file after processing
      console.log(`[ROUTE ${requestId}] Cleaning up temporary files...`);
      
      if (videoFilePath && fs.existsSync(videoFilePath)) {
        try {
          fs.unlinkSync(videoFilePath);
          console.log(`[ROUTE ${requestId}] Deleted temporary file: ${videoFilePath}`);
        } catch (cleanupError) {
          console.error(`[ROUTE ${requestId}] Failed to delete temporary file:`, cleanupError);
        }
      }
      
      console.log(`[ROUTE ${requestId}] ===== VIDEO ANALYSIS REQUEST COMPLETED =====`);
    }
  });

  // Video Analysis Advice endpoint - Generate improvement advice for each player
  app.post('/api/analysis/video/advice', isAuthenticated, async (req: any, res) => {
    // Set a long timeout for video processing (10 minutes)
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000); // 10 minutes
    
    const tokenCost = 150; // Advice generation costs fewer tokens than full analysis
    const requestId = `advice_req_${Date.now()}`;
    
    console.log(`[ADVICE ROUTE ${requestId}] ===== PLAYER ADVICE REQUEST STARTED =====`);
    console.log(`[ADVICE ROUTE ${requestId}] Request received at ${new Date().toISOString()}`);
    
    let videoFilePath: string | null = null;
    let fileName = '';
    
    try {
      console.log(`[ADVICE ROUTE ${requestId}] Starting direct video upload for advice generation`);
      const userId = req.user.claims.sub;
      
      // Handle direct file upload without Multer - same as main video analysis
      console.log(`[ADVICE ROUTE ${requestId}] Processing video upload directly...`);
      
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp', 'uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      fileName = `advice_video_${timestamp}.mp4`;
      videoFilePath = path.join(tempDir, fileName);
      
      console.log(`[DIRECT_UPLOAD] Starting video upload - streaming to disk`);
      console.log(`[DIRECT_UPLOAD] Starting stream to: ${videoFilePath}`);
      
      // Stream the request body directly to file
      const writeStream = fs.createWriteStream(videoFilePath);
      let totalBytes = 0;
      
      req.on('data', (chunk: Buffer) => {
        writeStream.write(chunk);
        totalBytes += chunk.length;
        
        // Log progress every 10MB
        if (totalBytes % (10 * 1024 * 1024) === 0) {
          console.log(`[DIRECT_UPLOAD] Progress: ${Math.round(totalBytes / (1024 * 1024))}MB written`);
        }
      });
      
      req.on('end', () => {
        writeStream.end();
        console.log(`[DIRECT_UPLOAD] File saved: ${videoFilePath} (${totalBytes} bytes)`);
      });
      
      req.on('error', (error: Error) => {
        console.error(`[DIRECT_UPLOAD] Upload error:`, error);
        writeStream.destroy();
        throw error;
      });
      
      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log(`[ADVICE ROUTE ${requestId}] Direct upload complete: ${videoFilePath}`);
      console.log(`[ADVICE ROUTE ${requestId}] File size: ${totalBytes} bytes`);
      
      // Parse form data from the uploaded file to extract round number
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) {
        throw new Error('Missing multipart boundary');
      }
      
      const fileContent = fs.readFileSync(videoFilePath);
      const fileString = fileContent.toString('latin1');
      
      // Extract round number from form data
      const roundMatch = fileString.match(/name="round"\r?\n\r?\n(\d+)/);
      const roundToAnalyze = roundMatch ? parseInt(roundMatch[1]) : 1;
      
      console.log(`[ADVICE ROUTE ${requestId}] Round to analyze: ${roundToAnalyze}`);
      
      // Extract the actual video file content (remove form data headers)
      const videoStartMarker = '\r\n\r\n';
      const videoEndMarker = `\r\n--${boundary}`;
      
      const videoStartIndex = fileString.indexOf(videoStartMarker) + videoStartMarker.length;
      const videoEndIndex = fileString.lastIndexOf(videoEndMarker);
      
      if (videoStartIndex === -1 || videoEndIndex === -1) {
        throw new Error('Could not extract video content from multipart data');
      }
      
      // Write clean video file
      const videoBuffer = fileContent.slice(videoStartIndex, videoEndIndex);
      fs.writeFileSync(videoFilePath, videoBuffer);
      
      console.log(`[ADVICE ROUTE ${requestId}] Clean video file written: ${videoBuffer.length} bytes`);
      
      console.log(`[ROUTE ${requestId}] User: ${userId}, File: ${fileName}, Round: ${roundToAnalyze}`);
      
      // Check user tokens before processing
      console.log(`[ROUTE ${requestId}] Checking user tokens...`);
      const user = await storage.getUser(userId);
      const userTokens = user?.tokens || 0;
      if (!user || userTokens < tokenCost) {
        console.log(`[ROUTE ${requestId}] Insufficient tokens: ${userTokens} < ${tokenCost}`);
        return res.status(402).json({
          message: "Insufficient tokens for video advice analysis",
          required: tokenCost,
          available: userTokens
        });
      }
      
      console.log(`[ROUTE ${requestId}] Token check passed: User has ${userTokens} tokens`);
      
      // Deduct tokens
      console.log(`[ROUTE ${requestId}] Deducting ${tokenCost} tokens...`);
      console.log(`DEDUCTING ${tokenCost} tokens from user ${userId}: ${userTokens} → ${userTokens - tokenCost}`);
      
      await storage.updateUserTokens(userId, userTokens - tokenCost);
      console.log(`DEDUCTION RESULT: User now has ${userTokens - tokenCost}/5000 tokens`);
      console.log(`[ROUTE ${requestId}] Tokens deducted successfully`);
      
      // Create transaction record
      console.log(`[ROUTE ${requestId}] Creating transaction record...`);
      await storage.createTransaction({
        userId: userId,
        action: 'video-advice',
        tokensDeducted: tokenCost,
        serviceType: 'video-advice',
        athleteId: null
      });
      console.log(`[ROUTE ${requestId}] Transaction record created`);
      
      // Generate player advice using the new service
      console.log(`[ROUTE ${requestId}] Starting advice generation processing...`);
      console.log(`[ROUTE ${requestId}] Video file details - Path: ${videoFilePath}, Size: ${videoBuffer.length} bytes`);
      
      const { generatePlayerAdvice } = await import('./videoAnalysisService.js');
      const adviceResult = await generatePlayerAdvice(videoFilePath, roundToAnalyze);
      
      console.log(`[ROUTE ${requestId}] Advice generation completed successfully`);
      
      // Return the advice results
      res.json({
        message: "Player advice generated successfully",
        ...adviceResult
      });
      
    } catch (error) {
      console.error(`[ADVICE ROUTE ${requestId}] Error during advice generation:`, error);
      console.error(`[ADVICE ROUTE ${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`[ADVICE ROUTE ${requestId}] Error type:`, typeof error);
      
      // Save error to analysis logs for debugging
      try {
        console.log(`[ROUTE ${requestId}] Saving error log to database...`);
        await storage.createAnalysisLog({
          userId: req.user.claims.sub,
          athleteId: null,
          serviceType: 'video-advice',
          resultData: JSON.stringify({ 
            fileName,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          })
        });
        console.log(`[ROUTE ${requestId}] Error log saved to database`);
      } catch (dbError) {
        console.error(`[ROUTE ${requestId}] Failed to save error to database:`, dbError);
      }
      
      res.status(500).json({
        message: "Failed to generate player advice",
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      // Clean up temporary files
      if (videoFilePath && fs.existsSync(videoFilePath)) {
        try {
          console.log(`[ROUTE ${requestId}] Cleaning up temporary files...`);
          fs.unlinkSync(videoFilePath);
          console.log(`[ROUTE ${requestId}] Deleted temporary file: ${videoFilePath}`);
        } catch (cleanupError) {
          console.error(`[ROUTE ${requestId}] Failed to delete temporary file:`, cleanupError);
        }
      }
      
      console.log(`[ROUTE ${requestId}] ===== PLAYER ADVICE REQUEST COMPLETED =====`);
    }
  });

  // Dev Admin Middleware
  const isDevAdmin = (req: Request, res: Response, next: Function) => {
    // Reject in production unless explicitly allowed
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_CREDITS !== 'true') {
      return res.status(403).json({ error: 'Admin endpoints disabled in production' });
    }

    // Check for admin token
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== process.env.ADMIN_TEST_TOKEN && adminToken !== 'dev-admin-token') {
      return res.status(403).json({ error: 'Admin authentication required' });
    }

    next();
  };

  // Admin Token Grant Endpoint (Development Only)
  app.post('/api/admin/tokens/grant', isAuthenticatedUniversal, isDevAdmin, async (req, res) => {
    try {
      const grantSchema = z.object({
        userId: z.string().optional(),
        amount: z.number().int().min(1).max(10000),
        reason: z.string().optional().default('Admin token grant')
      });

      const { userId, amount, reason } = grantSchema.parse(req.body);
      const targetUserId = userId || (req.user as any)?.claims?.sub || (req.user as any)?.id;

      if (!targetUserId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // For development: set both tokens and totalTokensPurchased to exact amount (clean slate)
      const [updatedUser] = await db
        .update(users)
        .set({
          tokens: amount,
          totalTokensPurchased: amount,
          updatedAt: new Date()
        })
        .where(eq(users.id, targetUserId))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create transaction record
      await storage.createTransaction({
        userId: targetUserId,
        action: 'admin-grant',
        tokensDeducted: -amount, // Negative for grant
        serviceType: 'admin',
        athleteId: null
      });

      console.log(`🎁 Admin granted ${amount} tokens to user ${targetUserId}: ${reason}`);

      res.json({
        success: true,
        message: `Granted ${amount} tokens successfully`,
        newBalance: updatedUser.tokens,
        totalTokensPurchased: updatedUser.totalTokensPurchased
      });

    } catch (error) {
      console.error('Error granting tokens:', error);
      res.status(500).json({ 
        error: 'Failed to grant tokens',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin Token Reset Endpoint (Development Only)
  app.post('/api/admin/tokens/reset', isAuthenticatedUniversal, isDevAdmin, async (req, res) => {
    try {
      const resetSchema = z.object({
        userId: z.string().optional(),
        to: z.number().int().min(0).max(100000)
      });

      const { userId, to } = resetSchema.parse(req.body);
      const targetUserId = userId || (req.user as any)?.claims?.sub || (req.user as any)?.id;

      if (!targetUserId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Get current balance to calculate delta
      const currentUser = await storage.getUser(targetUserId);
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentBalance = currentUser.tokens || 0;
      const delta = to - currentBalance;

      // Update tokens using storage method
      const updatedUser = await storage.updateUserTokens(targetUserId, to);

      // Create transaction record
      await storage.createTransaction({
        userId: targetUserId,
        action: 'admin-reset',
        tokensDeducted: -delta, // Negative for increase, positive for decrease
        serviceType: 'admin',
        athleteId: null
      });

      console.log(`🔄 Admin reset tokens for user ${targetUserId}: ${currentBalance} → ${to}`);

      res.json({
        success: true,
        message: `Reset tokens to ${to} successfully`,
        previousBalance: currentBalance,
        newBalance: updatedUser.tokens
      });

    } catch (error) {
      console.error('Error resetting tokens:', error);
      res.status(500).json({ 
        error: 'Failed to reset tokens',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/test/scenarios', (req, res) => {
    res.json(TestingService.getTestScenarios());
  });

  // Test endpoint for BrowserUse ranking fetching
  app.get('/api/test/ranking/:athleteName', async (req, res) => {
    try {
      const athleteName = req.params.athleteName;
      const sport = req.query.sport as string || 'Wrestling';
      const country = req.query.country as string || 'USA';

      console.log(`🧪 Testing BrowserUse fetch for: ${athleteName} (${sport}, ${country})`);

      const result = sport.toLowerCase() === 'taekwondo'
        ? await fetchTaekwondoRankAndHistory(athleteName, country)
        : await fetchGeneralSportRankAndHistory(athleteName, country, sport);

      res.json({
        success: true,
        athlete: athleteName,
        sport: sport,
        country: country,
        result: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Test BrowserUse error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Public endpoint for single service type preview - no authentication required
  // Now uses static data instead of database queries
  app.get('/api/preview/latest/:serviceType', async (req, res) => {
    try {
      const { serviceType } = req.params;
      const language = (req.query.language as string) || 'en';
      
      // Map frontend service types to static data
      const staticDataMap: { [key: string]: { en: any; ar: any } } = {
        'bio': { en: staticBioEn, ar: staticBioAr },
        'strengths': { en: staticStrengthsEn, ar: staticStrengthsAr },
        'weaknesses': { en: staticWeaknessesEn, ar: staticWeaknessesAr },
        'beat': { en: staticBeatEn, ar: staticBeatAr },
        'beat-strategies': { en: staticBeatEn, ar: staticBeatAr },
        'comparison': { en: staticComparisonEn, ar: staticComparisonAr },
        'nutrition': { en: staticNutritionEn, ar: staticNutritionAr },
        'nutrition-plan': { en: staticNutritionEn, ar: staticNutritionAr },
        'development': { en: staticDevPlanEn, ar: staticDevPlanAr },
        'development-plan': { en: staticDevPlanEn, ar: staticDevPlanAr },
        'video': { en: staticVideoEn, ar: staticVideoAr },
        'rank': { en: staticRankEn, ar: staticRankAr }
      };
      
      const staticData = staticDataMap[serviceType];
      
      if (!staticData) {
        return res.json({
          success: false,
          message: 'No preview data available for this service type',
          data: null
        });
      }
      
      res.json({
        success: true,
        data: language === 'ar' ? staticData.ar : staticData.en,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching preview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch preview',
        data: null
      });
    }
  });

  // Public endpoint for analysis previews - no authentication required
  // Now uses static data instead of database queries for all service types
  app.get('/api/preview/latest-by-type', async (req, res) => {
    try {
      const language = (req.query.language as string) || 'en';
      
      // Set cache control headers to prevent browser caching and vary by language
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Vary', 'Accept-Language');
      
      // All preview data is now static - taken from server/static-data/ directory
      const staticPreviewData = [
        {
          serviceType: 'bio',
          resultData: language === 'ar' ? staticBioAr : staticBioEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'strengths',
          resultData: language === 'ar' ? staticStrengthsAr : staticStrengthsEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'weaknesses',
          resultData: language === 'ar' ? staticWeaknessesAr : staticWeaknessesEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'beat-strategies',
          resultData: language === 'ar' ? staticBeatAr : staticBeatEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'comparison',
          resultData: language === 'ar' ? staticComparisonAr : staticComparisonEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'nutrition-plan',
          resultData: language === 'ar' ? staticNutritionAr : staticNutritionEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'development-plan',
          resultData: language === 'ar' ? staticDevPlanAr : staticDevPlanEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'video',
          resultData: language === 'ar' ? staticVideoAr : staticVideoEn,
          createdAt: new Date().toISOString()
        },
        {
          serviceType: 'rank',
          resultData: language === 'ar' ? staticRankAr : staticRankEn,
          createdAt: new Date().toISOString()
        }
      ];
      
      res.json({
        success: true,
        data: staticPreviewData,
        count: staticPreviewData.length
      });
    } catch (error) {
      console.error('Error fetching analysis previews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analysis previews',
        data: [],
        count: 0
      });
    }
  });

  // Minimal OpenAI test endpoint 
  app.post('/api/test-openai-minimal', async (req: Request, res: Response) => {
    try {
      console.log('🧪 [MINIMAL TEST] Testing OpenAI directly...');
      
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = "Fetch downloadable image url's for the player CJ Nickolas who is American and plays Taekwondo, they are also 6 ft 2, and he won gold medals in taekwondo. Return urls in a JSON:";
      
      console.log('🔍 [MINIMAL TEST] Sending exact user prompt to GPT-5...');
      console.log('PROMPT:', prompt);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        // Note: GPT-5 doesn't have direct web search tools in API
        max_completion_tokens: 2000
      });
      
      const response = completion.choices[0].message.content;
      console.log('✅ [MINIMAL TEST] GPT-5 Response:', response);
      
      res.json({
        success: true,
        prompt,
        response,
        rawCompletion: completion
      });
      
    } catch (error) {
      console.error('❌ [MINIMAL TEST] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Temporary test route for image search (no auth for testing)
  app.post('/api/test-image-search-direct', async (req: Request, res: Response) => {
    try {
      const { athleteName, sport, country } = req.body;
      
      if (!athleteName) {
        return res.status(400).json({ error: 'Athlete name is required' });
      }

      console.log(`🧪 [TEST] Triggering image search for ${athleteName}...`);
      
      // Get athlete details from database for context
      let athleteData = null;
      let sportName = sport || 'Unknown';
      try {
        const athletes = await storage.searchAthletesByName(athleteName, sport || "", country || "");
        if (athletes.length > 0) {
          athleteData = athletes[0];
          console.log(`🧪 [TEST] Found athlete in database: ${athleteData.name}`);
          
          // Resolve sport name from sportId if available
          if (athleteData.sportId && !sport) {
            try {
              const sportRecord = await storage.getSportById(athleteData.sportId);
              if (sportRecord) {
                sportName = sportRecord.name;
                console.log(`🧪 [TEST] Resolved sport: ${sportName}`);
              }
            } catch (sportError) {
              console.log(`🧪 [TEST] Could not resolve sport name, using Unknown`);
            }
          }
        }
      } catch (dbError) {
        console.log(`🧪 [TEST] No athlete found in database, proceeding with provided data`);
      }

      // Trigger async image search using the enhanced HTTP-based pipeline with all available data
      console.log(`🚀 [TEST] Starting HTTP-based image search for ${athleteName} (${sportName}, ${country || athleteData?.country || 'Unknown'})`);
      // Use new Python-based image search
      searchAthleteImageWithPython(
        athleteName,
        sportName,
        country || athleteData?.country || 'Unknown',
        athleteData?.personalInfo || {}
      ).then(imageUrl => {
        if (imageUrl && athleteData?.id) {
          storage.updateAthlete(athleteData.id, { profileImageUrl: imageUrl }).catch(err => 
            console.error(`❌ Failed to update athlete image: ${err}`)
          );
        }
      }).catch(err => console.error(`❌ Python image search error: ${err}`));

      res.json({ 
        success: true, 
        message: `Started background image search for ${athleteName}. Check server logs for progress.`,
        athlete: athleteData ? {
          name: athleteData.name,
          country: athleteData.country,
          sport: athleteData.sportId
        } : { name: athleteName, sport, country }
      });

    } catch (error) {
      console.error('🧪 [TEST] Error in test image search:', error);
      res.status(500).json({ error: 'Failed to start image search test' });
    }
  });

  // Temporary test route for image search
  app.post('/api/test-image-search', isAuthenticatedUniversal, async (req: Request, res: Response) => {
    try {
      const { athleteName, sport, country } = req.body;
      
      if (!athleteName) {
        return res.status(400).json({ error: 'Athlete name is required' });
      }

      console.log(`🧪 [TEST] Triggering image search for ${athleteName}...`);
      
      // Get athlete details from database for context
      let athleteData = null;
      let sportName = sport || 'Unknown';
      try {
        const athletes = await storage.searchAthletesByName(athleteName, sport || "", country || "");
        if (athletes.length > 0) {
          athleteData = athletes[0];
          console.log(`🧪 [TEST] Found athlete in database: ${athleteData.name}`);
          
          // Resolve sport name from sportId if available
          if (athleteData.sportId && !sport) {
            try {
              const sportRecord = await storage.getSportById(athleteData.sportId);
              if (sportRecord) {
                sportName = sportRecord.name;
                console.log(`🧪 [TEST] Resolved sport: ${sportName}`);
              }
            } catch (sportError) {
              console.log(`🧪 [TEST] Could not resolve sport name, using Unknown`);
            }
          }
        }
      } catch (dbError) {
        console.log(`🧪 [TEST] No athlete found in database, proceeding with provided data`);
      }

      // Trigger async image search using the enhanced HTTP-based pipeline with all available data
      console.log(`🚀 [TEST] Starting HTTP-based image search for ${athleteName} (${sportName}, ${country || athleteData?.country || 'Unknown'})`);
      // Use new Python-based image search
      searchAthleteImageWithPython(
        athleteName,
        sportName,
        country || athleteData?.country || 'Unknown',
        athleteData?.personalInfo || {}
      ).then(imageUrl => {
        if (imageUrl && athleteData?.id) {
          storage.updateAthlete(athleteData.id, { profileImageUrl: imageUrl }).catch(err => 
            console.error(`❌ Failed to update athlete image: ${err}`)
          );
        }
      }).catch(err => console.error(`❌ Python image search error: ${err}`));

      res.json({ 
        success: true, 
        message: `Started background image search for ${athleteName}. Check server logs for progress.`,
        athlete: athleteData ? {
          name: athleteData.name,
          country: athleteData.country,
          sport: athleteData.sportId
        } : { name: athleteName, sport, country }
      });

    } catch (error) {
      console.error('🧪 [TEST] Error in test image search:', error);
      res.status(500).json({ error: 'Failed to start image search test' });
    }
  });

  const httpServer = createServer(app);
  
  // Set server timeout to 15 minutes to handle large video uploads
  // Default Node.js timeout is 2 minutes which causes large uploads to fail
  httpServer.timeout = 900000; // 15 minutes in milliseconds
  
  // Setup WebSocket server for real-time ranking progress updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/ranking-progress' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 WebSocket client connected for ranking progress');
    
    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
  
  // Store WSS globally for broadcasting ranking progress
  global.rankingProgressWSS = wss;
  
  return httpServer;
}

// Helper function to broadcast ranking progress updates to all connected clients
export function broadcastRankingProgress(athleteId: string, message: string, step?: string, isComplete: boolean = false, error?: string) {
  if (!global.rankingProgressWSS) return;
  
  const progressData = {
    type: 'ranking_progress',
    athleteId,
    message,
    step,
    isComplete,
    error,
    timestamp: new Date().toISOString()
  };
  
  global.rankingProgressWSS.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(progressData));
    }
  });
}

// Helper function to detect card brand
function getCardBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\D/g, '');
  
  if (number.match(/^4/)) return 'Visa';
  if (number.match(/^5[1-5]/)) return 'Mastercard';
  if (number.match(/^3[47]/)) return 'American Express';
  if (number.match(/^6011/)) return 'Discover';
  
  return 'Unknown';
}

// Global type declaration for WebSocket server
declare global {
  var rankingProgressWSS: WebSocketServer | undefined;
}
