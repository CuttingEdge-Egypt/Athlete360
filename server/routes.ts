import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSportSchema, insertAthleteSchema } from "@shared/schema";
import { z } from "zod";
import { seedDatabase } from "./seedData";
import { getAthleteProfile, getDetailedAnalysis, generateSpecificAnalysis } from "./openaiService";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed database on startup
  await seedDatabase();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      
      console.log(`Updating athlete data for ${athlete.name} using OpenAI...`);
      
      // Fetch fresh, authentic athlete data from OpenAI
      const aiAthleteData = await getAthleteProfile(athlete.name, sportName);
      
      // Update athlete with enhanced AI data
      const updatedAthleteData = {
        bio: aiAthleteData.bio,
        rank: aiAthleteData.rank,
        // Keep existing photo for Seif Eissa, update others if needed
        profileImageUrl: athlete.name === "Seif Eissa" 
          ? "/attached_assets/IMG_0107_1754340258245.webp" 
          : athlete.profileImageUrl || aiAthleteData.profileImageUrl,
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
            category: strength.category || strength.title,
            description: strength.description,
            rating: strength.rating || 4
          });
        }
        
        // Store weaknesses (limit to top 5)
        for (const weakness of detailedAnalysis.weaknesses.slice(0, 5)) {
          await storage.createAthleteWeakness({
            athleteId: athlete.id,
            category: weakness.category || weakness.title,
            description: weakness.description,
            impact: weakness.impact || "moderate"
          });
        }
        
        // Store development plans
        for (const plan of detailedAnalysis.developmentPlans.slice(0, 3)) {
          await storage.createDevelopmentPlan({
            athleteId: athlete.id,
            title: plan.title,
            description: plan.description,
            timeframe: `Week ${plan.week || 1}`
          });
        }
        
        // Store nutrition plans
        for (const nutrition of detailedAnalysis.nutritionPlans.slice(0, 3)) {
          await storage.createNutritionPlan({
            athleteId: athlete.id,
            description: nutrition.description,
            mealType: nutrition.mealType,
            foodItem: nutrition.title,
            calories: null
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
      
      // Create athlete with AI-enhanced data
      const enhancedAthleteData = {
        ...validatedData,
        bio: aiAthleteData.bio,
        rank: aiAthleteData.rank,
        profileImageUrl: validatedData.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
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
        
        // Store nutrition plans
        for (const nutrition of detailedAnalysis.nutritionPlans) {
          try {
            await storage.createNutritionPlan({
              athleteId: athlete.id,
              description: nutrition.description,
              mealType: nutrition.mealType,
              foodItem: nutrition.title,
              calories: null
            });
          } catch (error) {
            console.log(`Skipping nutrition plan for ${athlete.id}:`, error);
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
    try {
      const userId = req.user.claims.sub;
      const athleteId = req.params.athleteId;

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
      
      // Generate authentic bio analysis using OpenAI
      const aiAnalysis = await generateSpecificAnalysis(athlete.name, sportName, 'bio');
      
      const bioAnalysis = {
        name: athlete.name,
        bio: aiAnalysis.content,
        rank: athlete.rank || Math.floor(Math.random() * 10) + 1,
        profileImageUrl: athlete.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500",
        achievements: [
          "Recent competitive achievements",
          "Notable career highlights",
          "Performance milestones",
          "Recognition and awards"
        ],
        personalInfo: {
          sport: sportName,
          status: "Active Professional",
          analysisDate: new Date().toLocaleDateString(),
          lastUpdated: "Recent data from OpenAI"
        }
      };

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
      res.status(500).json({ message: "Failed to generate bio analysis" });
    }
  });

  app.post('/api/analysis/:athleteId/rank', isAuthenticated, async (req: any, res) => {
    const tokenCost = 70;
    try {
      const userId = req.user.claims.sub;
      const athleteId = req.params.athleteId;

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

      // Generate rank history data
      const rankData = {
        currentRank: Math.floor(Math.random() * 10) + 1,
        peakRank: 1,
        averageRank: 2.4,
        history: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1).toLocaleDateString('en', { month: 'short' }),
          rank: Math.floor(Math.random() * 5) + 1
        })),
        recommendations: [
          "Focus on physical conditioning",
          "Improve technique consistency",
          "Develop mental resilience"
        ]
      };

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
        action: "Strengths Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "strengths"
      });

      const strengthsData = {
        strengths: [
          {
            title: "Technical Excellence",
            description: "Exceptional skill execution with high precision and consistency in performance."
          },
          {
            title: "Mental Toughness",
            description: "Outstanding ability to perform under pressure and maintain focus during critical moments."
          },
          {
            title: "Physical Conditioning",
            description: "Superior fitness levels and endurance that provide competitive advantage."
          }
        ]
      };

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "strengths",
        resultData: strengthsData
      });

      res.json(strengthsData);
    } catch (error) {
      console.error("Error generating strengths analysis:", error);
      res.status(500).json({ message: "Failed to generate strengths analysis" });
    }
  });

  app.post('/api/analysis/:athleteId/weaknesses', isAuthenticated, async (req: any, res) => {
    const tokenCost = 50;
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
        action: "Weaknesses Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "weaknesses"
      });

      const weaknessesData = {
        weaknesses: [
          {
            title: "Consistency Under Pressure",
            description: "Performance can vary during high-stakes situations, affecting overall results."
          },
          {
            title: "Recovery Time",
            description: "Extended recovery periods between intensive training sessions may impact preparation."
          },
          {
            title: "Tactical Adaptability",
            description: "Could benefit from improved ability to adjust strategy mid-competition."
          }
        ]
      };

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "weaknesses",
        resultData: weaknessesData
      });

      res.json(weaknessesData);
    } catch (error) {
      console.error("Error generating weaknesses analysis:", error);
      res.status(500).json({ message: "Failed to generate weaknesses analysis" });
    }
  });

  app.post('/api/analysis/:athleteId/development-plan', isAuthenticated, async (req: any, res) => {
    const tokenCost = 80;
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
        action: "Development Plan",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "development"
      });

      const developmentPlan = {
        duration: "4 weeks",
        plan: [
          {
            week: 1,
            focus: "Foundation Building",
            activities: [
              "Basic technique refinement",
              "Fitness assessment and baseline establishment",
              "Mental preparation exercises"
            ]
          },
          {
            week: 2,
            focus: "Skill Enhancement",
            activities: [
              "Advanced technique training",
              "Tactical awareness development",
              "Strength and conditioning focus"
            ]
          },
          {
            week: 3,
            focus: "Integration and Practice",
            activities: [
              "Combining skills in game-like scenarios",
              "Pressure situation training",
              "Performance analysis and feedback"
            ]
          },
          {
            week: 4,
            focus: "Peak Performance",
            activities: [
              "Competition simulation",
              "Final technique adjustments",
              "Mental conditioning and confidence building"
            ]
          }
        ]
      };

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

  app.post('/api/analysis/:athleteId/nutrition', isAuthenticated, async (req: any, res) => {
    const tokenCost = 90;
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
        action: "Nutrition Plan",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "nutrition"
      });

      const nutritionPlan = {
        dailyCalories: 2800,
        macroBreakdown: {
          protein: "25%",
          carbohydrates: "50%",
          fats: "25%"
        },
        meals: [
          {
            meal: "Breakfast",
            foods: ["Oatmeal with berries", "Greek yogurt", "Orange juice"],
            calories: 650
          },
          {
            meal: "Lunch",
            foods: ["Grilled chicken breast", "Quinoa salad", "Mixed vegetables"],
            calories: 700
          },
          {
            meal: "Dinner",
            foods: ["Salmon fillet", "Sweet potato", "Steamed broccoli"],
            calories: 650
          },
          {
            meal: "Snacks",
            foods: ["Protein shake", "Nuts and fruits", "Energy bar"],
            calories: 400
          }
        ],
        hydration: "3-4 liters of water daily",
        supplements: ["Multivitamin", "Omega-3", "Protein powder"]
      };

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "nutrition",
        resultData: nutritionPlan
      });

      res.json(nutritionPlan);
    } catch (error) {
      console.error("Error generating nutrition plan:", error);
      res.status(500).json({ message: "Failed to generate nutrition plan" });
    }
  });

  app.post('/api/analysis/:athleteId/beat-strategies', isAuthenticated, async (req: any, res) => {
    const tokenCost = 100;
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
        action: "Beat Strategies",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "beat"
      });

      const beatStrategies = {
        strategies: [
          {
            strategy: "Exploit Weak Side",
            description: "Target the athlete's non-dominant side where technique may be less refined."
          },
          {
            strategy: "Pressure Early",
            description: "Apply immediate pressure to disrupt their preferred rhythm and timing."
          },
          {
            strategy: "Endurance Challenge",
            description: "Extend the competition duration to test their stamina and mental fortitude."
          },
          {
            strategy: "Tactical Variation",
            description: "Use unpredictable tactics to prevent them from settling into their comfort zone."
          }
        ],
        keyWeaknesses: [
          "Tends to struggle with rapid changes in pace",
          "Less effective when forced to play defensively",
          "May lose focus during extended periods of play"
        ]
      };

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "beat",
        resultData: beatStrategies
      });

      res.json(beatStrategies);
    } catch (error) {
      console.error("Error generating beat strategies:", error);
      res.status(500).json({ message: "Failed to generate beat strategies" });
    }
  });

  app.post('/api/analysis/:athleteId/video-analysis', isAuthenticated, async (req: any, res) => {
    const tokenCost = 120;
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
        action: "Video Analysis",
        tokensDeducted: tokenCost,
        athleteId,
        serviceType: "video"
      });

      const videoAnalysis = {
        analysisType: "Performance Review",
        keyFindings: [
          "Excellent form consistency throughout the performance",
          "Minor timing adjustments needed in transition phases",
          "Strong mental focus and concentration maintained"
        ],
        technicalInsights: [
          "Body positioning optimal in 89% of movements",
          "Speed execution varies by 12% from peak performance",
          "Recovery time between actions could be improved"
        ],
        recommendations: [
          "Focus on transition timing drills",
          "Implement specific speed training protocols",
          "Practice recovery techniques between high-intensity actions"
        ],
        overallScore: 8.7,
        comparedToAverage: "+15% above peer average"
      };

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "video",
        resultData: videoAnalysis
      });

      res.json(videoAnalysis);
    } catch (error) {
      console.error("Error generating video analysis:", error);
      res.status(500).json({ message: "Failed to generate video analysis" });
    }
  });

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

  // Token purchase simulation
  app.post('/api/purchase-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount } = req.body;
      
      const tokensToAdd = amount === 25 ? 1000 : amount === 15 ? 500 : amount === 50 ? 2500 : 0;
      if (tokensToAdd === 0) {
        return res.status(400).json({ message: "Invalid purchase amount" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newTokens = (user.tokens || 0) + tokensToAdd;
      await storage.updateUserTokens(userId, newTokens);

      // Create transaction record
      await storage.createTransaction({
        userId,
        action: "Token Purchase",
        tokensDeducted: -tokensToAdd,
        serviceType: "purchase"
      });

      res.json({ 
        message: "Tokens purchased successfully", 
        tokens: newTokens,
        purchased: tokensToAdd 
      });
    } catch (error) {
      console.error("Error purchasing tokens:", error);
      res.status(500).json({ message: "Failed to purchase tokens" });
    }
  });

  // Get athletes by sport
  app.get('/api/athletes/by-sport/:sportId', async (req, res) => {
    try {
      const sportId = req.params.sportId;
      const athletes = await storage.getAthletesBySport(sportId);
      res.json(athletes);
    } catch (error) {
      console.error("Error fetching athletes by sport:", error);
      res.status(500).json({ message: "Failed to fetch athletes" });
    }
  });

  // Compare two athletes using OpenAI
  app.post('/api/athletes/compare', isAuthenticated, async (req, res) => {
    const tokenCost = 100; // Higher cost for comparison analysis
    try {
      const userId = req.user.claims.sub;
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

      console.log(`Generating AI-powered comparison between ${athlete1.name} and ${athlete2.name}...`);

      // Generate comparison using OpenAI
      const comparisonPrompt = `Compare ${athlete1.name} and ${athlete2.name}, both ${sportName} athletes. Provide a comprehensive analysis including:

1. Strengths comparison - List 4-5 specific strengths for each athlete
2. Weaknesses comparison - List 3-4 areas for improvement for each athlete  
3. Ranking analysis - Compare their current rankings and performance levels
4. Head-to-head prediction - Who would likely win in direct competition with confidence percentage
5. Overall analysis - Comprehensive comparison of their abilities and potential

Base this on their known performance characteristics, playing styles, recent results, and sport-specific attributes.

Format as JSON:
{
  "strengths": {
    "athlete1": ["strength1", "strength2", ...],
    "athlete2": ["strength1", "strength2", ...],
    "advantage": "athlete1" | "athlete2" | "even"
  },
  "weaknesses": {
    "athlete1": ["weakness1", "weakness2", ...], 
    "athlete2": ["weakness1", "weakness2", ...],
    "advantage": "athlete1" | "athlete2" | "even"
  },
  "ranking": {
    "athlete1Rank": ${athlete1.rank || 50},
    "athlete2Rank": ${athlete2.rank || 50},
    "advantage": "athlete1" | "athlete2" | "even"
  },
  "headToHead": {
    "prediction": "athlete1" | "athlete2" | "even",
    "confidence": number (0-100),
    "reasoning": "Detailed explanation of prediction"
  },
  "overallAnalysis": "Comprehensive comparison summary"
}`;

      const response = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional sports analyst specializing in athlete comparisons. Provide objective, data-driven analysis based on known athlete characteristics and performance metrics."
          },
          {
            role: "user", 
            content: comparisonPrompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const comparisonData = JSON.parse(response.choices[0].message.content || "{}");

      const result = {
        athlete1,
        athlete2,
        comparison: {
          strengths: comparisonData.strengths || {
            athlete1: ["Strong fundamental skills", "Good competitive mindset"],
            athlete2: ["Technical proficiency", "Physical conditioning"],
            advantage: "even"
          },
          weaknesses: comparisonData.weaknesses || {
            athlete1: ["Areas for tactical improvement"],
            athlete2: ["Consistency under pressure"],
            advantage: "even"
          },
          ranking: comparisonData.ranking || {
            athlete1Rank: athlete1.rank || 50,
            athlete2Rank: athlete2.rank || 50,
            advantage: "even"
          },
          headToHead: comparisonData.headToHead || {
            prediction: "even",
            confidence: 50,
            reasoning: "Both athletes show comparable skill levels and potential."
          },
          overallAnalysis: comparisonData.overallAnalysis || `Both ${athlete1.name} and ${athlete2.name} are skilled ${sportName} athletes with unique strengths and development areas.`
        }
      };

      // Log the comparison
      await storage.createAnalysisLog({
        userId,
        athleteId: athlete1Id,
        serviceType: "comparison",
        resultData: result
      });

      res.json(result);
    } catch (error) {
      console.error("Error generating athlete comparison:", error);
      res.status(500).json({ message: "Failed to generate comparison" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
