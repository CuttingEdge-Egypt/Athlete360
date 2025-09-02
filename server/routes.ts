import type { Express } from "express";
import { createServer, type Server } from "http";
import bodyParser from "body-parser";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth, isAuthenticatedUniversal } from "./localAuth";
import { insertSportSchema, insertAthleteSchema } from "@shared/schema";
import { z } from "zod";
import { seedDatabase } from "./seedData";
import { getAthleteProfile, generateSpecificAnalysis, searchAthleteImage, getDetailedAnalysis, generateThreadedBiography, generateAthleteBiography, refreshAthleteBiographyWithSearch, searchTaekwondoDataProfilePicture, getEnhancedTaekwondoData, generateDevelopmentPlan, compareAthletes, generateRankHistory } from "./openaiService";
import { generateNutritionPlan, generateRankHistoryWithGemini } from "./geminiService";
import { analyzeVideoFile } from "./videoAnalysisService";
import { paymobService } from "./paymobService";

import { TestingService } from "./testingService";
import OpenAI from "openai";
import multer from "multer";

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

// Configure multer for video file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
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
  'development-plan': 80,
  'nutrition-plan': 75,
  'beat-strategies': 100,
  'video': 200,
  'comparison': 120
};

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
      const { name, sportId } = req.query;
      if (!name) {
        return res.status(400).json({ message: "Athlete name is required" });
      }
      
      console.log(`Searching for athletes with name: "${name}" and sportId: "${sportId}"`);
      
      // Search for existing athletes in database by name
      const athletes = await storage.searchAthletesByName(name as string, sportId as string);
      console.log(`Found ${athletes.length} athletes matching search criteria`);
      res.json(athletes);
    } catch (error) {
      console.error("Error searching athletes by name:", error);
      res.status(500).json({ message: "Failed to search athletes" });
    }
  });

  // Create athlete with AI
  app.post('/api/athletes/create-with-ai', isAuthenticated, async (req: any, res) => {
    try {
      const { name, sportId } = req.body;
      if (!name || !sportId) {
        return res.status(400).json({ message: "Athlete name and sport are required" });
      }

      // Get sport information
      const sport = await storage.getSportById(sportId);
      if (!sport) {
        return res.status(404).json({ message: "Sport not found" });
      }

      // Use OpenAI GPT-5 to get athlete profile
      console.log(`Creating athlete ${name} for sport ${sport.name} using OpenAI GPT-5...`);
      const aiProfile = await generateAthleteBiography(name, sport.name, req.body.nationality);

      // Extract nationality from bio data first
      const extractNationality = (bio: string): string | undefined => {
        const text = bio.toLowerCase();
        
        // Country mapping for common nationalities found in bios
        const nationalityMap: { [key: string]: string } = {
          'american': 'United States',
          'spanish': 'Spain',
          'egyptian': 'Egypt',
          'korean': 'South Korea',
          'south korean': 'South Korea',
          'uzbek': 'Uzbekistan',
          'brazilian': 'Brazil',
          'argentinian': 'Argentina',
          'portuguese': 'Portugal',
          'palestinian': 'Palestine',
          'british': 'United Kingdom',
          'english': 'United Kingdom',
          'canadian': 'Canada',
          'french': 'France',
          'german': 'Germany',
          'italian': 'Italy',
          'japanese': 'Japan',
          'chinese': 'China',
          'australian': 'Australia',
          'mexican': 'Mexico',
          'turkish': 'Turkey',
          'serbian': 'Serbia',
          'croatian': 'Croatia',
          'polish': 'Poland',
          'russian': 'Russia',
          'ukrainian': 'Ukraine',
          'thai': 'Thailand',
          'iranian': 'Iran',
          'iraqi': 'Iraq',
        };
        
        // Check for nationality keywords
        for (const [adjective, country] of Object.entries(nationalityMap)) {
          if (text.includes(adjective)) {
            return country;
          }
        }
        
        return undefined;
      };

      const extractedCountry = extractNationality(aiProfile.bio);

      // Search for athlete profile image using enhanced AI-powered search
      console.log(`🔍 Searching for profile image for ${name} in ${sport.name}...`);
      let profileImageUrl = await searchAthleteImage(name, sport.name, req.body.nationality || extractedCountry);

      // Create athlete in database
      // Handle rank - convert to number if possible, otherwise store as undefined
      let rankValue = undefined;
      if (typeof aiProfile.rank === 'number') {
        rankValue = aiProfile.rank;
      } else if (typeof aiProfile.rank === 'string' && !isNaN(Number(aiProfile.rank)) && aiProfile.rank !== 'N/A') {
        rankValue = Number(aiProfile.rank);
      }

      const athleteData = {
        name: name.trim(),
        sportId,
        bio: aiProfile.bio || `Professional ${sport.name} athlete`,
        rank: rankValue,
        country: extractedCountry,
        profileImageUrl: profileImageUrl || undefined,
        achievements: aiProfile.achievements || []
      };

      const newAthlete = await storage.createAthlete(athleteData);
      
      console.log(`Successfully created athlete: ${newAthlete.name}`);
      res.json(newAthlete);
    } catch (error) {
      console.error("Error creating athlete with AI:", error);
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
      
      console.log(`Updating athlete data for ${athlete.name} using OpenAI GPT-5...`);
      
      // Fetch fresh, authentic athlete data from OpenAI GPT-5
      const aiAthleteData = await refreshAthleteBiographyWithSearch(athlete.name, sportName);
      
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

  // Refresh bio endpoint with 20 token cost
  app.post('/api/athletes/:athleteId/refresh-bio', isAuthenticated, async (req: any, res) => {
    const tokenCost = 20;
    try {
      const userId = req.user.claims.sub;
      const athleteId = req.params.athleteId;

      // Check if user has enough tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      const userTokens = user.tokens || 0;
      // Deduct tokens
      console.log(`DEDUCTING ${tokenCost} tokens from user ${userId}: ${userTokens} → ${userTokens - tokenCost}`);
      console.log(`UPDATING user ${userId} tokens to ${userTokens - tokenCost}`);
      await storage.deductTokens(userId, tokenCost);
      console.log(`UPDATE COMPLETE: User tokens are now ${userTokens - tokenCost}`);
      console.log(`DEDUCTION RESULT: User now has ${userTokens - tokenCost} tokens`);

      // Create transaction
      await storage.createTransaction({
        userId,
        action: "Refresh Biography",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "refresh-bio"
      });

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      // Get sport info for context
      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Force refresh bio using OpenAI GPT-5 with web search capabilities
      console.log(`Refreshing bio for ${athlete.name} using OpenAI GPT-5`);
      
      try {
        const refreshedBioData = await refreshAthleteBiographyWithSearch(athlete.name, sportName, athlete.country || "Unknown");
        
        // Handle rank - convert to number if possible, otherwise keep existing
        let rankValue = athlete.rank;
        if (typeof refreshedBioData.rank === 'number') {
          rankValue = refreshedBioData.rank;
        } else if (typeof refreshedBioData.rank === 'string' && !isNaN(Number(refreshedBioData.rank)) && refreshedBioData.rank !== 'N/A') {
          rankValue = Number(refreshedBioData.rank);
        }
        
        // Update athlete bio in database with fresh AI content
        await storage.updateAthlete(athleteId, { 
          bio: refreshedBioData.bio,
          rank: rankValue,
          updatedAt: new Date()
        });
        
        const refreshedAnalysis = {
          name: refreshedBioData.name,
          bio: refreshedBioData.bio,
          rank: refreshedBioData.rank,
          worldRank: refreshedBioData.worldRank,
          currentRecord: refreshedBioData.currentRecord,
          profileImageUrl: athlete.profileImageUrl,
          achievements: refreshedBioData.achievements || [],
          personalInfo: {
            sport: sportName,
            status: "Active Professional", 
            analysisDate: new Date().toLocaleDateString(),
            lastUpdated: "Refreshed with OpenAI GPT-5 web search analysis",
            recentNews: refreshedBioData.recentNews
          },
          referenceLinks: []
        };

        await storage.createAnalysisLog({
          userId,
          athleteId,
          serviceType: "refresh-bio",
          resultData: refreshedAnalysis
        });

        res.json({
          success: true,
          message: "Biography refreshed successfully",
          data: refreshedAnalysis
        });
        
      } catch (aiError) {
        console.error(`Error refreshing bio for ${athlete.name}:`, aiError);
        res.status(500).json({ message: "Failed to refresh biography using AI" });
      }
      
    } catch (error) {
      console.error("Error refreshing athlete bio:", error);
      res.status(500).json({ message: "Failed to refresh athlete biography" });
    }
  });

  // Analysis service routes
  app.post('/api/analysis/:athleteId/bio', isAuthenticated, async (req: any, res) => {
    const tokenCost = 50;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    try {
      const forceUpdate = req.query.forceUpdate === 'true'; // Check for force update parameter

      // Check if user has enough tokens
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      // Deduct tokens
      await storage.deductTokens(userId, tokenCost);

      // Create transaction
      await storage.createTransaction({
        userId,
        action: "Bio Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "bio"
      });

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
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
        // Generate fresh bio analysis using OpenAI GPT-5 with web search (either no data exists or force update requested)
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} GPT-5 bio analysis for ${athlete.name}`);
        
        try {
          const gptBioAnalysis = forceUpdate 
            ? await refreshAthleteBiographyWithSearch(athlete.name, sportName)
            : await generateAthleteBiography(athlete.name, sportName);
          
          // Update athlete bio in database with GPT-5 AI content
          await storage.updateAthlete(athleteId, { 
            bio: gptBioAnalysis.bio,
            rank: typeof gptBioAnalysis.rank === 'number' ? gptBioAnalysis.rank : 
                  (typeof gptBioAnalysis.rank === 'string' && !isNaN(Number(gptBioAnalysis.rank)) && gptBioAnalysis.rank !== 'N/A') ? 
                  Number(gptBioAnalysis.rank) : undefined,
            achievements: gptBioAnalysis.achievements || []
          });
          
          bioAnalysis = {
            name: gptBioAnalysis.name,
            bio: gptBioAnalysis.bio,
            rank: gptBioAnalysis.rank,
            profileImageUrl: athlete.profileImageUrl,
            achievements: gptBioAnalysis.achievements && Array.isArray(gptBioAnalysis.achievements) && gptBioAnalysis.achievements.length > 0 ? gptBioAnalysis.achievements.slice(0, 4) : [
              "Career achievements from GPT-5 analysis with web search",
              "Competition history verified through real-time data",
              "Technical analysis from OpenAI's latest model"
            ],
            personalInfo: {
              sport: sportName,
              status: "Active Professional", 
              analysisDate: new Date().toLocaleDateString(),
              lastUpdated: forceUpdate ? "Force updated with GPT-5 web search analysis" : "Fresh GPT-5 analysis with web search",
              recentNews: gptBioAnalysis.recentNews || []
            }
          };
        } catch (gptError) {
          console.error(`GPT-5 biography failed for ${athlete.name}:`, gptError);
          
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
          message: "Unable to generate authentic bio analysis at this time. Please try again later. Your tokens have been refunded.",
          error: "AI analysis failed"
        });
      }

      // Save analysis log
      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "bio",
        resultData: bioAnalysis
      });

      res.json(bioAnalysis);
    } catch (error) {
      console.error("Error generating bio analysis:", error);
      // Refund tokens for unexpected errors
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "bio", "Bio Analysis");
      res.status(500).json({ message: "Failed to generate bio analysis. Your tokens have been refunded." });
    }
  });

  app.post('/api/analysis/:athleteId/rank', isAuthenticated, async (req: any, res) => {
    const tokenCost = 70;
    try {
      const userId = req.user.claims.sub;
      const athleteId = req.params.athleteId;
      const forceUpdate = req.query.forceUpdate === 'true'; // Check for force update parameter

      // Check tokens and deduct
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: "Rank Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "rank"
      });

      // Get athlete and check existing rank history in database
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Check for existing rank history in database (skip if force update)
      const existingRankHistory = await storage.getRankHistory(athleteId);
      
      let rankData;
      if (!forceUpdate && existingRankHistory.length > 0) {
        // Use database rank history
        rankData = {
          currentRank: athlete.rank || existingRankHistory[0]?.rank || 1,
          peakRank: Math.min(...existingRankHistory.map(r => r.rank)),
          averageRank: existingRankHistory.reduce((sum, r) => sum + r.rank, 0) / existingRankHistory.length,
          history: existingRankHistory.slice(0, 12).map(r => ({
            month: new Date(r.date).toLocaleDateString('en', { month: 'short' }),
            rank: r.rank
          })),
          recommendations: [
            "Based on database history analysis",
            "Focus on consistent performance patterns",
            "Maintain current ranking trajectory"
          ]
        };
      } else {
        // Generate fresh rank analysis using OpenAI GPT-5 with enhanced rank history format
        console.log(`${forceUpdate ? 'Force updating' : 'Generating new'} rank analysis for ${athlete.name}`);
        
        try {
          // Use Gemini 2.5 Pro with URL context for enhanced ranking analysis
          rankData = await generateRankHistoryWithGemini(athlete.name, sportName, athlete.country || undefined);
          
          // Ensure we have valid data structure
          if (!rankData || !rankData.athlete) {
            throw new Error("Failed to generate valid rank history data");
          }
        } catch (rankError) {
          console.error(`Rank analysis failed for ${athlete.name}:`, rankError);
          
          // Always refund tokens for failed rank analysis
          await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, "rank", "Rank Analysis");
          
          // Check if this is a search grounding error
          if (rankError instanceof Error && (
            rankError.message.includes('Search Grounding is not supported') || 
            rankError.message.includes('googleSearchRetrieval') ||
            rankError.message.includes('AI_WEB_SEARCH_FAILED')
          )) {
            return res.status(503).json({ 
              message: "Ranking analysis is temporarily unavailable due to API limitations. Your tokens have been refunded. Please try again later.",
              error: "api_limitation",
              shouldRetry: true
            });
          }
          
          return res.status(500).json({ 
            message: "Failed to generate ranking analysis. Your tokens have been refunded.",
            error: rankError instanceof Error ? rankError.message : String(rankError),
            shouldRetry: true
          });
        }
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "rank",
        resultData: rankData
      });

      res.json(rankData);
    } catch (error) {
      console.error("Error generating rank analysis:", error);
      res.status(500).json({ message: "Failed to generate rank analysis" });
    }
  });

  app.post('/api/analysis/:athleteId/strengths', isAuthenticated, async (req: any, res) => {
    const tokenCost = 50;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
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
        // Generate fresh athlete-specific strengths using GPT-5 (either no data exists or force update requested)
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
          competitionRecord: enhancedData?.currentRecord || "N/A"
        };
        
        try {
          // Generate athlete-specific strengths analysis
          const strengthsAnalysis = await generateSpecificAnalysis(athlete.name, sportName, 'strengths', athleteDataForAnalysis);
        
        const aiStrengths = strengthsAnalysis.strengths?.length > 0 
          ? strengthsAnalysis.strengths.map((strength: any, index: number) => ({
              title: strength.title,
              description: strength.description,
              rating: strength.rating || Math.max(85, 97 - index * 3), // Add ratings from AI or generate reasonable ones
              category: strength.category || "Technical",
              evidence: strength.evidence || "Based on AI performance analysis"
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
          lastUpdated: forceUpdate ? "Force updated with GPT-5" : "Fresh GPT-5 analysis"
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
        // Generate fresh weaknesses using OpenAI GPT-5 (either no data exists or force update requested)
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
          competitionRecord: enhancedData?.currentRecord || "N/A"
        };
        
        try {
          // Generate personalized weaknesses analysis
          const weaknessesAnalysis = await generateSpecificAnalysis(athlete.name, sportName, 'weaknesses', athleteDataForAnalysis);
        
        const aiWeaknesses = weaknessesAnalysis.weaknesses?.length > 0 
          ? weaknessesAnalysis.weaknesses.map((weakness: any, index: number) => ({
              title: weakness.title,
              description: weakness.description,
              impact: weakness.impact || (index === 0 ? 'High' : (index % 2 === 0 ? 'Medium' : 'High')),
              improvement: weakness.improvement || `Develop targeted training to address ${weakness.title.toLowerCase()}`,
              improvement_timeline: weakness.improvement_timeline || 'medium-term'
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
          lastUpdated: forceUpdate ? "Force updated with GPT-5" : "Fresh GPT-5 analysis"
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

  app.post('/api/analysis/:athleteId/development-plan', isAuthenticated, async (req: any, res) => {
    const tokenCost = 80;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
    try {
      
      // Extract user preferences from request body
      const { duration = "4 weeks", goal = "Improve overall performance" } = req.body;

      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      await storage.deductTokens(userId, tokenCost);
      await storage.createTransaction({
        userId,
        action: `Development Plan - ${goal}`,
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "development"
      });

      // Get athlete data
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return res.status(404).json({ message: "Athlete not found" });
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown Sport";
      
      // Always generate fresh personalized development plan based on user inputs
      console.log(`Generating personalized development plan for ${athlete.name} - Duration: ${duration}, Goal: ${goal}`);
      
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
        competitionRecord: enhancedData?.currentRecord || "N/A"
      };
      
      // Generate personalized development plan
      const developmentPlan = await generateDevelopmentPlan(athlete.name, sportName, duration, goal, athleteDataForAnalysis);
      
      // Store development plans in database for future use
      if (developmentPlan.plan && developmentPlan.plan.length > 0) {
        for (const weekPlan of developmentPlan.plan) {
          if (weekPlan.activities && weekPlan.activities.length > 0) {
            for (const activity of weekPlan.activities) {
              try {
                await storage.createDevelopmentPlan({
                  athleteId,
                  title: weekPlan.focus || 'Weekly Focus',
                  description: activity,
                  week: weekPlan.week
                });
              } catch (error) {
                console.log(`Could not store development plan: ${error}`);
              }
            }
          }
        }
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "development",
        resultData: developmentPlan
      });

      res.json(developmentPlan);
    } catch (error) {
      console.error("Error generating development plan:", error);
      res.status(500).json({ message: "Failed to generate development plan" });
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
        resultData: nutritionPlanData
      });

      res.json(nutritionPlanData);
    } catch (error) {
      console.error("Error generating nutrition plan:", error);
      res.status(500).json({ message: "Failed to generate nutrition plan" });
    }
  });

  app.post('/api/analysis/:athleteId/beat-strategies', isAuthenticated, async (req: any, res) => {
    const tokenCost = 100;
    const userId = req.user.claims.sub;
    const athleteId = req.params.athleteId;
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
        competitionRecord: enhancedData?.currentRecord || "N/A"
      };
      
      // Generate athlete-specific beat strategies
      const strategiesAnalysis = await generateSpecificAnalysis(athlete.name, sportName, 'beat-strategies', athleteDataForAnalysis);
      
      let beatStrategies;
      if (strategiesAnalysis.strategies?.length > 0) {
        // Use authentic AI-generated strategies
        const aiBeatStrategies = strategiesAnalysis.strategies.map((strategy: any) => ({
          strategy: strategy.title,
          description: strategy.description,
          execution: strategy.execution || "Apply systematically during competition",
          success_probability: strategy.success_probability || "medium",
          risk_level: strategy.risk_level || "medium"
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

  // Token purchase endpoint (for testing)
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

  // Compare two athletes using OpenAI
  app.post('/api/athletes/compare', isAuthenticated, async (req, res) => {
    const tokenCost = 100; // Higher cost for comparison analysis
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { athlete1Id, athlete2Id } = req.body;

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
      const [athlete1, athlete2] = await Promise.all([
        storage.getAthleteById(athlete1Id),
        storage.getAthleteById(athlete2Id)
      ]);

      if (!athlete1 || !athlete2) {
        return res.status(404).json({ message: "One or both athletes not found" });
      }

      // Deduct tokens
      await storage.deductTokens(userId, tokenCost);

      // Create transaction
      await storage.createTransaction({
        userId,
        action: "Athlete Comparison",
        tokensDeducted: tokenCost,
        serviceType: "comparison"
      });

      // Get sport context
      const sport = await storage.getSportById(athlete1.sportId);
      const sportName = sport?.name || "Unknown Sport";

      console.log(`Generating GPT-5 powered comparison between ${athlete1.name} and ${athlete2.name}...`);

      // Create minimal athlete data for GPT-5 web search (name, country, sport only)
      const athlete1ForComparison = {
        name: athlete1.name,
        country: athlete1.country || "Unknown",
        profileImageUrl: athlete1.profileImageUrl || ""
      };
      
      const athlete2ForComparison = {
        name: athlete2.name, 
        country: athlete2.country || "Unknown",
        profileImageUrl: athlete2.profileImageUrl || ""
      };
      
      // Try GPT-5 comparison first, fall back to Gemini if it fails
      console.log(`Generating GPT-5 basic comparison...`);
      let basicComparisonResult;
      let gptFailed = false;
      
      try {
        basicComparisonResult = await compareAthletes(athlete1ForComparison, athlete2ForComparison, sportName);
      } catch (gptError: any) {
        console.error(`GPT-5 comparison failed: ${gptError.message}`);
        gptFailed = true;
        
        // Create fallback structure when GPT-5 completely fails
        basicComparisonResult = {
          athlete1: {
            name: athlete1.name,
            country: athlete1.country || 'Unknown',
            rank: 'N/A',
            profileImageUrl: athlete1.profileImageUrl || ''
          },
          athlete2: {
            name: athlete2.name,
            country: athlete2.country || 'Unknown',
            rank: 'N/A',
            profileImageUrl: athlete2.profileImageUrl || ''
          },
          strengths: { athlete1: [], athlete2: [], advantage: "even" },
          weaknesses: { athlete1: [], athlete2: [], advantage: "even" },
          ranking: {
            comparison: "GPT-5 analysis temporarily unavailable",
            athlete1Trajectory: "Analysis unavailable", 
            athlete2Trajectory: "Analysis unavailable",
            competitiveEdge: "even"
          },
          headToHead: {
            prediction: "even",
            confidence: 50,
            reasoning: "Analysis temporarily unavailable",
            keyFactors: ["Analysis unavailable"],
            scenario: "GPT-5 analysis temporarily unavailable"
          },
          overallAnalysis: {
            summary: "Analysis temporarily unavailable",
            betterAthlete: "even",
            reasonsWhy: ["Analysis unavailable"],
            closeness: "even", 
            recommendation: "Analysis could not be generated"
          }
        };
      }
      
      // Generate detailed analysis and head-to-head using Gemini-2.5-pro
      console.log(`Generating Gemini-2.5-pro detailed analysis and head-to-head...`);
      const { generateDetailedComparison } = await import('./geminiService.js');
      const detailedAnalysisResult = await generateDetailedComparison(athlete1ForComparison, athlete2ForComparison, sportName);
      
      // Check if GPT-5 overall analysis failed and use Gemini as fallback
      let finalOverallAnalysis = basicComparisonResult.overallAnalysis;
      let overallAnalysisModel = gptFailed ? "Gemini-2.5-pro (fallback)" : "GPT-5";
      
      if (gptFailed || 
          basicComparisonResult.overallAnalysis?.summary?.includes('temporarily unavailable') || 
          basicComparisonResult.overallAnalysis?.summary?.includes('Analysis unavailable')) {
        console.log(`GPT-5 overall analysis failed, using Gemini-2.5-pro fallback...`);
        
        // Use Gemini's head-to-head analysis as overall analysis fallback
        if (detailedAnalysisResult && detailedAnalysisResult.headToHead && 
            detailedAnalysisResult.headToHead.reasoning && 
            !detailedAnalysisResult.headToHead.reasoning.includes('temporarily unavailable')) {
          
          console.log(`Using Gemini head-to-head analysis for overall analysis fallback...`);
          finalOverallAnalysis = {
            summary: detailedAnalysisResult.headToHead.reasoning,
            betterAthlete: detailedAnalysisResult.headToHead.prediction || "even",
            reasonsWhy: detailedAnalysisResult.headToHead.keyFactors || ["Analysis generated by Gemini-2.5-pro"],
            closeness: detailedAnalysisResult.headToHead.confidence > 70 ? "clear" : "close",
            recommendation: `Based on Gemini-2.5-pro analysis: ${detailedAnalysisResult.headToHead.scenario || 'Detailed analysis available'}`
          };
          overallAnalysisModel = "Gemini-2.5-pro (fallback)";
        } else if (detailedAnalysisResult && detailedAnalysisResult.detailedAnalysis) {
          // Fallback to detailed analysis if available
          let analysisText = '';
          if (typeof detailedAnalysisResult.detailedAnalysis === 'string') {
            analysisText = detailedAnalysisResult.detailedAnalysis;
          } else if (typeof detailedAnalysisResult.detailedAnalysis === 'object' && 
                     detailedAnalysisResult.detailedAnalysis.summary) {
            analysisText = detailedAnalysisResult.detailedAnalysis.summary;
          }
          
          if (analysisText && !analysisText.includes('temporarily unavailable')) {
            finalOverallAnalysis = {
              summary: analysisText.substring(0, 500) + (analysisText.length > 500 ? '...' : ''),
              betterAthlete: "even",
              reasonsWhy: ["Analysis generated using Gemini-2.5-pro detailed analysis"],
              closeness: "detailed-analysis",
              recommendation: "Analysis generated using Gemini-2.5-pro advanced capabilities"
            };
            overallAnalysisModel = "Gemini-2.5-pro (fallback)";
          }
        }
      }
      
      // Merge the results from both AI models
      const comparisonResult = {
        ...basicComparisonResult,
        overallAnalysis: finalOverallAnalysis,
        detailedAnalysis: detailedAnalysisResult.detailedAnalysis,
        headToHead: detailedAnalysisResult.headToHead,
        aiModels: {
          basicComparison: "GPT-5",
          detailedAnalysis: "Gemini-2.5-pro",
          headToHead: "Gemini-2.5-pro",
          overallAnalysis: overallAnalysisModel
        }
      };

      // Log the comparison
      await storage.createAnalysisLog({
        userId,
        athleteId: athlete1Id,
        serviceType: "comparison",
        resultData: comparisonResult
      });

      res.json(comparisonResult);
    } catch (error) {
      console.error("Error generating athlete comparison:", error);
      res.status(500).json({ 
        message: "Unable to generate authentic athlete comparison at this time. Please try again later.",
        error: error instanceof Error ? error.message : String(error)
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

  // ==== TOKEN REFUND ROUTE FOR CANCELLED ANALYSIS ====
  app.post('/api/refund-cancelled-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { athleteId, serviceType, reason } = req.body;
      
      // Get service cost mapping
      const serviceCosts: { [key: string]: number } = {
        'bio': 20,
        'rank': 70,
        'strengths': 50,
        'weaknesses': 50,
        'development-plan': 80,
        'nutrition-plan': 75,
        'beat-strategies': 100,
        'video': 200
      };
      
      const tokenCost = serviceCosts[serviceType] || 50;
      
      // Refund the tokens using existing helper function
      await refundTokensForFailedAnalysis(userId, athleteId, tokenCost, serviceType, `${serviceType} Analysis - CANCELLED`);
      
      console.log(`💫 CANCELLED ANALYSIS REFUND: ${tokenCost} tokens refunded to user ${userId} for cancelled ${serviceType} analysis`);
      
      res.json({ 
        success: true, 
        message: "Tokens refunded for cancelled analysis",
        tokensRefunded: tokenCost 
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

  // Video Analysis endpoint
  app.post('/api/analysis/video', isAuthenticated, upload.single('video'), async (req: any, res) => {
    const tokenCost = 200; // Video analysis costs more tokens
    const requestId = `req_${Date.now()}`;
    
    console.log(`[VIDEO ROUTE ${requestId}] ===== VIDEO ANALYSIS REQUEST STARTED =====`);
    console.log(`[VIDEO ROUTE ${requestId}] Request received at ${new Date().toISOString()}`);
    console.log(`[VIDEO ROUTE ${requestId}] Headers:`, req.headers);
    console.log(`[VIDEO ROUTE ${requestId}] Body keys:`, Object.keys(req.body || {}));
    console.log(`[VIDEO ROUTE ${requestId}] File info:`, req.file ? { 
      originalname: req.file.originalname, 
      mimetype: req.file.mimetype, 
      size: req.file.size 
    } : 'No file');

    try {
      console.log(`[VIDEO ROUTE ${requestId}] Starting video analysis request`);
      const userId = req.user.claims.sub;
      const { roundToAnalyze } = req.body;
      
      console.log(`[ROUTE ${requestId}] User: ${userId}, File: ${req.file?.originalname}, Round: ${roundToAnalyze}`);
      
      // Validate required fields - set default round if not provided
      const round = roundToAnalyze ? parseInt(roundToAnalyze) : 1;
      
      if (!req.file) {
        console.log(`[ROUTE ${requestId}] Validation failed: No video file uploaded`);
        return res.status(400).json({ message: "No video file uploaded" });
      }

      console.log(`[ROUTE ${requestId}] File validation passed: ${req.file.originalname} (${req.file.size} bytes)`);

      // Check if user has enough tokens
      console.log(`[ROUTE ${requestId}] Checking user tokens...`);
      const user = await storage.getUser(userId);
      if (!user || (user.tokens || 0) < tokenCost) {
        console.log(`[ROUTE ${requestId}] Insufficient tokens: User has ${user?.tokens || 0}, needs ${tokenCost}`);
        return res.status(402).json({ message: "Insufficient tokens" });
      }

      console.log(`[ROUTE ${requestId}] Token check passed: User has ${user.tokens} tokens`);

      // Deduct tokens
      console.log(`[ROUTE ${requestId}] Deducting ${tokenCost} tokens...`);
      await storage.deductTokens(userId, tokenCost);
      console.log(`[ROUTE ${requestId}] Tokens deducted successfully`);

      // Create transaction
      console.log(`[ROUTE ${requestId}] Creating transaction record...`);
      await storage.createTransaction({
        userId,
        action: "Video Analysis",
        tokensDeducted: tokenCost,
        athleteId: null, // No specific athlete for video analysis
        serviceType: "video"
      });
      console.log(`[ROUTE ${requestId}] Transaction record created`);

      console.log(`[ROUTE ${requestId}] Starting video analysis processing...`);
      const analysisStartTime = Date.now();
      
      // Process video with Gemini
      const analysisResults = await analyzeVideoFile(
        req.file.buffer,
        req.file.originalname,
        round
      );

      const analysisTime = Date.now() - analysisStartTime;
      console.log(`[ROUTE ${requestId}] Video analysis completed in ${analysisTime}ms`);

      // Save analysis log
      console.log(`[ROUTE ${requestId}] Saving analysis log to database...`);
      await storage.createAnalysisLog({
        userId,
        athleteId: null,
        serviceType: "video",
        resultData: analysisResults
      });
      console.log(`[ROUTE ${requestId}] Analysis log saved to database`);

      console.log(`[ROUTE ${requestId}] Sending successful response`);
      res.json({
        success: true,
        message: "Video analysis completed successfully",
        data: analysisResults
      });

    } catch (error) {
      console.error(`[ROUTE ${requestId}] Error processing video analysis:`, error);
      res.status(500).json({ 
        message: "Failed to analyze video",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/test/scenarios', (req, res) => {
    res.json(TestingService.getTestScenarios());
  });

  const httpServer = createServer(app);
  return httpServer;
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
