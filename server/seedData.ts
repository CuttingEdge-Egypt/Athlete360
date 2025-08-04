import { storage } from "./storage";

export async function seedDatabase() {
  try {
    // Seed sports
    const sports = [
      { name: "Football" },
      { name: "Soccer" },
      { name: "Basketball" },
      { name: "Tennis" },
      { name: "Taekwondo" },
      { name: "Baseball" },
      { name: "Swimming" },
      { name: "Golf" },
      { name: "Boxing" },
      { name: "Athletics" }
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
        bio: "Portuguese professional footballer widely regarded as one of the greatest players of all time. Known for his incredible goal-scoring ability, athleticism, and dedication to fitness.",
        rank: 3,
        profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Lionel Messi",
        sportId: soccerSport?.id || allSports[0]?.id || "default",
        bio: "Argentine professional footballer considered one of the greatest players in football history. Winner of multiple Ballon d'Or awards and known for his incredible dribbling and playmaking abilities.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Serena Williams",
        sportId: tennisSport?.id || allSports[0]?.id || "default",
        bio: "American former professional tennis player widely regarded as one of the greatest tennis players of all time. Winner of 23 Grand Slam singles titles.",
        rank: 2,
        profileImageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "LeBron James",
        sportId: basketballSport?.id || allSports[0]?.id || "default",
        bio: "American professional basketball player widely considered one of the greatest players in NBA history. Four-time NBA champion and four-time NBA Finals MVP.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Tom Brady",
        sportId: footballSport?.id || allSports[0]?.id || "default",
        bio: "American former professional football quarterback who played 23 seasons in the NFL. Seven-time Super Bowl champion and widely considered the greatest quarterback of all time.",
        rank: 1,
        profileImageUrl: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Malek Mohamed Abdelrazik",
        sportId: taekwondoSport?.id || allSports[0]?.id || "default",
        bio: "Professional Taekwondo athlete known for exceptional technique and competitive spirit in international competitions.",
        rank: 5,
        profileImageUrl: "https://images.unsplash.com/photo-1555597673-b21d5c935865?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Rafael Nadal",
        sportId: tennisSport?.id || allSports[0]?.id || "default",
        bio: "Spanish professional tennis player known as the 'King of Clay'. Winner of 22 Grand Slam singles titles, including 14 French Open titles.",
        rank: 4,
        profileImageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      },
      {
        name: "Stephen Curry",
        sportId: basketballSport?.id || allSports[0]?.id || "default",
        bio: "American professional basketball player widely regarded as one of the greatest shooters in NBA history. Four-time NBA champion and two-time MVP.",
        rank: 3,
        profileImageUrl: "https://images.unsplash.com/photo-1546525848-3ce03ca516f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500"
      }
    ];

    for (const athlete of athletes) {
      try {
        const existingAthletes = await storage.getAthletesBySearch(athlete.name);
        if (existingAthletes.length === 0) {
          await storage.createAthlete(athlete);
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
