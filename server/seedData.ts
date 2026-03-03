import { storage } from "./storage";
import { getDetailedAnalysis } from "./openaiService";

async function seedSeifEissaData(athleteId: string) {
  // Strengths
  const strengths = [
    {
      athleteId,
      title: "Lightning-Fast Combinations",
      description: "Exceptional ability to execute rapid-fire kick combinations with perfect timing and precision. His signature 3-kick combo (roundhouse-side-hook) has a 92% success rate in competition."
    },
    {
      athleteId,
      title: "Mental Fortitude",
      description: "Demonstrates extraordinary psychological resilience under pressure. Never lost a match when trailing by 5+ points, with 15 comeback victories in the last 2 years."
    },
    {
      athleteId,
      title: "Counter-Attack Mastery",
      description: "World-class defensive awareness and counter-attacking skills. Leads international rankings with 78% counter-attack success rate, specializing in cut-kicks and back-kicks."
    },
    {
      athleteId,
      title: "Tactical Intelligence",
      description: "Superior game reading ability and tactical adaptation mid-match. Known for analyzing opponent patterns within the first round and adjusting strategy accordingly."
    },
    {
      athleteId,
      title: "Flexibility & Mobility",
      description: "Exceptional range of motion enabling high kicks up to head level with minimal telegraphing. Maintains 95% kick accuracy even in the final round of competition."
    }
  ];

  // Weaknesses
  const weaknesses = [
    {
      athleteId,
      title: "Stamina in Extended Matches",
      description: "Performance tends to decline slightly in overtime rounds. Kick output drops by 15% after the 2nd round in matches lasting over 6 minutes."
    },
    {
      athleteId,
      title: "Aggressive Close-Range Pressure",
      description: "Can struggle against opponents who constantly pressure forward and clinch. Success rate drops to 68% when facing clinch-heavy fighting styles."
    },
    {
      athleteId,
      title: "Left-Side Blind Spot",
      description: "Slightly slower reaction time to attacks from the left side (0.2 seconds slower). This creates vulnerability to left-footed fighters' roundhouse kicks."
    }
  ];

  // Development Plans (12-week program)
  const developmentPlans = [
    {
      athleteId,
      title: "Cardiovascular Enhancement Protocol",
      description: "High-intensity interval training combining taekwondo-specific movements. 45-minute sessions, 5 days/week focusing on maintaining peak performance through extended competition rounds.",
      week: 1
    },
    {
      athleteId,
      title: "Close-Range Combat Mastery",
      description: "Specialized clinch work and short-range techniques. Partner drills focusing on elbow strikes, knee techniques, and escaping from clinch positions.",
      week: 2
    },
    {
      athleteId,
      title: "Left-Side Reaction Training",
      description: "Mirror work and reaction drills specifically targeting left-side attacks. Use of reaction lights and partner-assisted surprise attack simulations.",
      week: 3
    },
    {
      athleteId,
      title: "Olympic Sparring Simulations",
      description: "Full-contact sparring sessions replicating Olympic tournament conditions. 3-round matches with 30-second recovery, multiple opponents daily.",
      week: 4
    },
    {
      athleteId,
      title: "Power Development Phase",
      description: "Plyometric training and resistance work to increase kick power by 10%. Focus on explosive hip rotation and core strengthening exercises.",
      week: 5
    },
    {
      athleteId,
      title: "Competition Strategy Refinement",
      description: "Video analysis sessions studying upcoming opponents. Development of specific game plans for different fighting styles and weight categories.",
      week: 6
    }
  ];

  // Beat Strategies (how to defeat common opponent types)
  const beatStrategies = [
    {
      athleteId,
      strategy: "Counter the Power Kicker",
      description: "Against heavy kickers: Use distance management and timing. Stay just outside their optimal range, bait power kicks, then counter with quick combinations to the body. Focus on scoring points early to force them into aggressive (and vulnerable) attacks."
    },
    {
      athleteId,
      strategy: "Neutralize the Pressure Fighter",
      description: "Against constant forward pressure: Utilize circular footwork and pivot escapes. Use push kicks to create distance, target their advancing legs with cut kicks. Force them to reset by clinching then immediately escaping."
    },
    {
      athleteId,
      strategy: "Outpoint the Technical Fighter",
      description: "Against technical opponents: Increase pace and variety. Use feints and rhythm changes to disrupt their timing. Score with unconventional techniques like spinning back kicks and jumping attacks they don't expect."
    },
    {
      athleteId,
      strategy: "Defeat the Defensive Counter-Puncher",
      description: "Against defensive fighters: Use combination attacks and continuous pressure. Fake attacks to draw out their counters, then counter their counters. Force them into exchanges where your superior speed and conditioning give you the advantage."
    }
  ];

  // Dynamic Analysis
  const dynamicAnalysis = [
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-training-analysis",
      analysisType: "Technique Breakdown",
      findings: "Analysis of 500+ kicks shows 94% technical accuracy with optimal hip rotation and chamber positioning. Exceptional ability to maintain form under fatigue.",
      recommendations: "Continue current technique maintenance. Add more variation in kick timing to increase unpredictability against elite opponents."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-competition-highlights",
      analysisType: "Competition Performance",
      findings: "Won 18 of last 20 matches with average winning margin of 8.2 points. Shows consistent performance across different venues and opponent styles.",
      recommendations: "Focus on first-round dominance to avoid close decisions. Current strategy of building leads in rounds 2-3 is effective but risky against world-class opponents."
    },
    {
      athleteId,
      videoUrl: "https://example.com/seif-eissa-psychological-profile",
      analysisType: "Mental Performance",
      findings: "Heart rate remains stable under pressure (average 165 BPM during high-pressure moments vs 170 BPM training average). Excellent emotional control and focus.",
      recommendations: "Implement pre-competition visualization routines for Olympic-level pressure scenarios. Consider working with sports psychologist for peak performance mindset."
    }
  ];

  // Rank History (showing progression over 24 months)
  const rankHistory = [
    { athleteId, rank: 15, date: new Date('2023-01-01') },
    { athleteId, rank: 12, date: new Date('2023-03-01') },
    { athleteId, rank: 8, date: new Date('2023-05-01') },
    { athleteId, rank: 6, date: new Date('2023-07-01') },  
    { athleteId, rank: 4, date: new Date('2023-09-01') },
    { athleteId, rank: 3, date: new Date('2023-11-01') },
    { athleteId, rank: 2, date: new Date('2024-01-01') },
    { athleteId, rank: 2, date: new Date('2024-03-01') },
    { athleteId, rank: 1, date: new Date('2024-05-01') },
    { athleteId, rank: 2, date: new Date('2024-07-01') },
    { athleteId, rank: 2, date: new Date('2024-09-01') },
    { athleteId, rank: 2, date: new Date('2024-12-01') }
  ];

  // Insert all the data
  try {
    // Insert strengths
    for (const strength of strengths) {
      try {
        await storage.createAthleteStrength(strength);
      } catch (error) {
        console.log(`Skipping strength for ${athleteId}:`, error);
      }
    }

    // Insert weaknesses  
    for (const weakness of weaknesses) {
      try {
        await storage.createAthleteWeakness(weakness);
      } catch (error) {
        console.log(`Skipping weakness for ${athleteId}:`, error);
      }
    }

    // Insert development plans
    for (const plan of developmentPlans) {
      try {
        await storage.createDevelopmentPlan(plan);
      } catch (error) {
        console.log(`Skipping development plan for ${athleteId}:`, error);
      }
    }



    // Insert beat strategies
    for (const strategy of beatStrategies) {
      try {
        await storage.createBeatStrategy(strategy);
      } catch (error) {
        console.log(`Skipping beat strategy for ${athleteId}:`, error);
      }
    }

    // Insert dynamic analysis
    for (const analysis of dynamicAnalysis) {
      try {
        await storage.createDynamicAnalysis(analysis);
      } catch (error) {
        console.log(`Skipping dynamic analysis for ${athleteId}:`, error);
      }
    }

    // Insert rank history
    for (const rank of rankHistory) {
      try {
        await storage.createRankHistory(rank);
      } catch (error) {
        console.log(`Skipping rank history for ${athleteId}:`, error);
      }
    }

    console.log(`Comprehensive data seeded for Seif Eissa (${athleteId})`);
  } catch (error) {
    console.error(`Error seeding Seif Eissa data:`, error);
  }
}

export async function seedDatabase() {
  try {
    // Seed sports - includes all sports with video analysis configurations
    const sports = [
      { name: "Football" },
      { name: "Soccer" },
      { name: "Basketball" },
      { name: "Tennis" },
      { name: "Table Tennis" },
      { name: "Taekwondo" },
      { name: "Baseball" },
      { name: "Swimming" },
      { name: "Golf" },
      { name: "Boxing" },
      { name: "Athletics" },
      { name: "Martial Arts" },
      { name: "MMA" },
      { name: "Kickboxing" },
      { name: "Fencing" },
      { name: "Volleyball" },
      { name: "Hockey" },
      { name: "Rugby" },
      { name: "Cricket" },
      { name: "Badminton" },
      { name: "Squash" },
      { name: "Wrestling" },
      { name: "Judo" },
      { name: "Karate" },
      { name: "Air Pistol" }
    ];

    const createdSports = [];
    for (const sport of sports) {
      try {
        const existingSports = await storage.getAllSports();
        const exists = existingSports.find(s => s.name === sport.name);
        if (!exists) {
          const createdSport = await storage.createSport(sport);
          createdSports.push(createdSport);
        }
      } catch (error) {
        // Sport might already exist, continue
      }
    }

    // Get all sports for athlete creation
    const allSports = await storage.getAllSports();
    const footballSport = allSports.find(s => s.name === "Football");
    const soccerSport = allSports.find(s => s.name === "Soccer");
    const tennisSport = allSports.find(s => s.name === "Tennis");
    const basketballSport = allSports.find(s => s.name === "Basketball");
    const taekwondoSport = allSports.find(s => s.name === "Taekwondo");

    // Seed famous athletes
    const athletes = [
      {
        name: "Cristiano Ronaldo",
        sportId: soccerSport?.id || allSports[0]?.id || "default",
        age: 39,
        gender: "Male",
        country: "Portugal",
        bio: "Portuguese professional footballer widely regarded as one of the greatest players of all time. Known for his incredible goal-scoring ability, athleticism, and dedication to fitness.",
        rank: 3,
        profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Lionel Messi",
        sportId: soccerSport?.id || allSports[0]?.id || "default",
        age: 37,
        gender: "Male",
        country: "Argentina",
        bio: "Argentine professional footballer considered one of the greatest players in football history. Winner of multiple Ballon d'Or awards and known for his incredible dribbling and playmaking abilities.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Serena Williams",
        sportId: tennisSport?.id || allSports[0]?.id || "default",
        age: 43,
        gender: "Female",
        country: "United States",
        bio: "American former professional tennis player widely regarded as one of the greatest tennis players of all time. Winner of 23 Grand Slam singles titles.",
        rank: 2,
        profileImageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "LeBron James",
        sportId: basketballSport?.id || allSports[0]?.id || "default",
        age: 39,
        gender: "Male",
        country: "United States",
        bio: "American professional basketball player widely considered one of the greatest players in NBA history. Four-time NBA champion and four-time NBA Finals MVP.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Tom Brady",
        sportId: footballSport?.id || allSports[0]?.id || "default",
        age: 46,
        gender: "Male",
        country: "United States",
        bio: "American former professional football quarterback who played 23 seasons in the NFL. Seven-time Super Bowl champion and widely considered the greatest quarterback of all time.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Seif Eissa",
        sportId: taekwondoSport?.id || allSports[0]?.id || "default",
        age: 26,
        gender: "Male",
        country: "Egypt",
        bio: "Elite Egyptian Taekwondo athlete and Olympic medalist. Olympic bronze medalist at Tokyo 2020, known for lightning-fast combinations, tactical brilliance, and exceptional mental fortitude. Current top-3 world ranking with multiple international gold medals and dominance in the -80kg weight category.",
        rank: 3,
        profileImageUrl: "/attached_assets/IMG_0107_1754340258245.webp"
      },
      {
        name: "Rafael Nadal",
        sportId: tennisSport?.id || allSports[0]?.id || "default",
        age: 38,
        gender: "Male",
        country: "Spain",
        bio: "Spanish professional tennis player known as the 'King of Clay'. Winner of 22 Grand Slam singles titles, including 14 French Open titles.",
        rank: 4,
        profileImageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Stephen Curry",
        sportId: basketballSport?.id || allSports[0]?.id || "default",
        age: 36,
        gender: "Male", 
        country: "United States",
        bio: "American professional basketball player widely regarded as one of the greatest shooters in NBA history. Four-time NBA champion and two-time MVP.",
        rank: 3,
        profileImageUrl: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      }
    ];

    for (const athlete of athletes) {
      try {
        const existingAthletes = await storage.getAthletesBySearch(athlete.name);
        if (existingAthletes.length === 0) {
          const createdAthlete = await storage.createAthlete(athlete);
          
          // Add comprehensive data for Seif Eissa
          if (athlete.name === "Seif Eissa") {
            await seedSeifEissaData(createdAthlete.id);
          }
        }
      } catch (error) {
        // Athlete might already exist or there's a validation error, continue
        console.log(`Skipping athlete ${athlete.name}: ${error}`);
      }
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
