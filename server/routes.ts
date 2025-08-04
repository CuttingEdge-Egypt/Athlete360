import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSportSchema, insertAthleteSchema } from "@shared/schema";
import { z } from "zod";
import { seedDatabase } from "./seedData";

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

  // Athletes routes
  app.get('/api/athletes/search', async (req, res) => {
    try {
      const { name, sportId } = req.query;
      if (!name) {
        return res.status(400).json({ message: "Athlete name is required" });
      }
      
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

  app.post('/api/athletes', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAthleteSchema.parse(req.body);
      const athlete = await storage.createAthlete(validatedData);
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
      if (!user || user.tokens < tokenCost) {
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

      // Generate bio analysis (AI simulation)
      const bioAnalysis = {
        name: athlete.name,
        bio: athlete.bio || `Professional athlete with extensive career in their sport. Known for exceptional performance and dedication.`,
        rank: athlete.rank || Math.floor(Math.random() * 10) + 1,
        profileImageUrl: athlete.profileImageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500",
        achievements: [
          "Multiple championship titles",
          "Record-breaking performances",
          "International recognition",
          "Team leadership roles"
        ],
        personalInfo: {
          birthDate: "1985-02-05",
          nationality: "Professional",
          height: "6'1\"",
          weight: "185 lbs"
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
      if (!user || user.tokens < tokenCost) {
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
      if (!user || user.tokens < tokenCost) {
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
      if (!user || user.tokens < tokenCost) {
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
      if (!user || user.tokens < tokenCost) {
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

      // Try to get existing development plan from database
      let developmentPlan;
      try {
        const existingPlans = await storage.getAthleteAnalysis(athleteId, 'development');
        if (existingPlans.length > 0) {
          developmentPlan = existingPlans[0].resultData;
        }
      } catch (error) {
        console.log("No existing development plan found, creating new one");
      }

      // If no existing plan, create comprehensive professional data
      if (!developmentPlan) {
        developmentPlan = [
          {
            title: "Elite Technical Mastery Program",
            description: "Comprehensive 12-week elite-level technical development program designed for Olympic-caliber athletes. Focus on perfecting advanced techniques, tactical awareness, and competitive edge refinement through progressive skill building and performance optimization.",
            phase: "Technical Excellence",
            duration: "12 weeks",
            intensity: "High",
            priority: "Critical"
          },
          {
            title: "Advanced Physical Conditioning Protocol",
            description: "Professional athlete conditioning regimen incorporating sport-specific strength training, explosive power development, and endurance optimization. Includes periodization strategies, recovery protocols, and performance monitoring systems.",
            phase: "Physical Development", 
            duration: "16 weeks",
            intensity: "Very High",
            priority: "Essential"
          },
          {
            title: "Mental Performance Enhancement System",
            description: "Elite psychological training program featuring visualization techniques, pressure management strategies, competitive mindset development, and focus enhancement protocols specifically designed for world-class competition scenarios.",
            phase: "Psychological Training",
            duration: "8 weeks", 
            intensity: "Moderate",
            priority: "High"
          },
          {
            title: "Tactical Intelligence Development",
            description: "Strategic game analysis and tactical decision-making enhancement program. Includes opponent analysis methodologies, adaptive strategy formulation, and real-time tactical adjustment training for elite competitive scenarios.",
            phase: "Strategic Planning",
            duration: "10 weeks",
            intensity: "High", 
            priority: "Critical"
          },
          {
            title: "Competition Readiness Protocol", 
            description: "Final phase preparation system incorporating simulation training, peak performance timing, competitive environment adaptation, and championship-level mental preparation for major international competitions.",
            phase: "Peak Performance",
            duration: "6 weeks",
            intensity: "Maximum",
            priority: "Essential"
          }
        ];
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "development",
        resultData: developmentPlan
      });

      res.json({ 
        duration: "20 weeks",
        plan: developmentPlan.map((item, index) => ({
          week: index + 1,
          focus: item.phase,
          activities: [item.title, item.description]
        }))
      });
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
      if (!user || user.tokens < tokenCost) {
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
      if (!user || user.tokens < tokenCost) {
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

      // Try to get existing beat strategies from database
      let beatStrategies;
      try {
        const existingStrategies = await storage.getAthleteAnalysis(athleteId, 'beat');
        if (existingStrategies.length > 0) {
          beatStrategies = existingStrategies[0].resultData;
        }
      } catch (error) {
        console.log("No existing beat strategies found, creating new ones");
      }

      // If no existing strategies, create comprehensive professional data
      if (!beatStrategies) {
        beatStrategies = [
          {
            title: "Elite Counter-Attack Neutralization Strategy",
            description: "Advanced tactical approach designed to neutralize elite athletes' signature counter-attacking abilities through systematic pressure application, timing disruption, and strategic positioning. Requires exceptional tactical awareness and precise execution timing.",
            effectiveness: 94,
            riskLevel: "Moderate",
            executionComplexity: "High"
          },
          {
            title: "Psychological Pressure Campaign",
            description: "Professional-level mental warfare strategy incorporating crowd manipulation, rhythm disruption, and competitive intimidation techniques. Designed to break opponents' mental fortitude through sustained psychological pressure and strategic mind games.",
            effectiveness: 87,
            riskLevel: "Low", 
            executionComplexity: "Moderate"
          },
          {
            title: "Technical Exploitation Matrix",
            description: "Systematic identification and exploitation of technical weaknesses through advanced video analysis, pattern recognition, and targeted attack sequences. Focuses on exploiting minor technical flaws that become critical under elite-level pressure.",
            effectiveness: 91,
            riskLevel: "High",
            executionComplexity: "Very High"
          },
          {
            title: "Endurance Supremacy Protocol", 
            description: "Strategic approach leveraging superior physical conditioning to outlast opponents through extended high-intensity exchanges, forcing technical degradation and mental fatigue in later competition phases.",
            effectiveness: 89,
            riskLevel: "Moderate",
            executionComplexity: "Moderate"
          },
          {
            title: "Adaptive Tactical Switching System",
            description: "Dynamic strategy adjustment protocol allowing real-time tactical modifications based on opponent responses, competition phase, and scoring situations. Requires exceptional tactical intelligence and rapid adaptation capabilities.",
            effectiveness: 96,
            riskLevel: "Low",
            executionComplexity: "Expert"
          }
        ];
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "beat",
        resultData: beatStrategies
      });

      res.json({ 
        strategies: beatStrategies.map(item => ({
          strategy: item.title,
          description: item.description
        })),
        keyWeaknesses: [
          "Weakness in final sprint endurance",
          "Tactical positioning in crowded fields", 
          "Recovery time between high-intensity intervals",
          "Mental pressure handling in championship scenarios"
        ]
      });
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
      if (!user || user.tokens < tokenCost) {
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

      // Try to get existing video analysis from database
      let videoAnalysis;
      try {
        const existingAnalysis = await storage.getAthleteAnalysis(athleteId, 'video');
        if (existingAnalysis.length > 0) {
          videoAnalysis = existingAnalysis[0].resultData;
        }
      } catch (error) {
        console.log("No existing video analysis found, creating new one");
      }

      // If no existing analysis, create comprehensive professional data
      if (!videoAnalysis) {
        videoAnalysis = [
          {
            title: "Elite Technical Precision Analysis",
            description: "Comprehensive biomechanical analysis of 500+ technique executions revealing 96% technical accuracy with optimal power transfer efficiency. Advanced motion capture data indicates world-class form consistency with minor optimization opportunities in transition phases.",
            analysisType: "Technical",
            accuracy: 96,
            recommendedFocus: "Elite Competition"
          },
          {
            title: "Championship Performance Evaluation",
            description: "Professional competition footage analysis covering 18 elite matches with 94% win rate. Performance metrics indicate exceptional competitive consistency with strategic adaptation capabilities and superior mental resilience under pressure.",
            analysisType: "Performance",
            accuracy: 94,
            recommendedFocus: "Strategic Enhancement"
          },
          {
            title: "Psychological Warfare Assessment",
            description: "Advanced behavioral analysis of competitive mindset, pressure response patterns, and tactical decision-making under elite-level stress. Demonstrates exceptional mental fortitude with opportunities for championship-level psychological optimization.",
            analysisType: "Mental",
            accuracy: 91,
            recommendedFocus: "Mental Conditioning"
          },
          {
            title: "Tactical Intelligence Breakdown",
            description: "Strategic analysis of adaptive tactical capabilities, opponent exploitation patterns, and real-time strategy adjustment effectiveness. Shows superior tactical awareness with world-class adaptation speed and strategic thinking depth.",
            analysisType: "Tactical", 
            accuracy: 93,
            recommendedFocus: "Tactical Mastery"
          },
          {
            title: "Physical Dominance Profile",
            description: "Comprehensive athletic performance analysis including power output, speed metrics, endurance capabilities, and recovery patterns. Demonstrates elite-level physical conditioning with championship-caliber athletic attributes.",
            analysisType: "Physical",
            accuracy: 95,
            recommendedFocus: "Peak Conditioning"
          }
        ];
      }

      await storage.createAnalysisLog({
        userId,
        athleteId,
        serviceType: "video",
        resultData: videoAnalysis
      });

      res.json({ 
        overallScore: 8.5,
        comparedToAverage: "15% above elite athlete average",
        analysisType: "Advanced Motion Analysis",
        keyFindings: videoAnalysis.map(item => item.title),
        technicalInsights: videoAnalysis.map(item => item.description)
      });
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

      const newTokens = user.tokens + tokensToAdd;
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

  const httpServer = createServer(app);
  return httpServer;
}
