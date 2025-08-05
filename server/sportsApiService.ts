import { storage } from "./storage";

// Popular Sports APIs for real-time data integration
interface SportsApiConfig {
  name: string;
  baseUrl: string;
  keyRequired: boolean;
  sports: string[];
  endpoints: {
    athletes: string;
    stats: string;
    rankings: string;
    matches: string;
  };
}

// Configuration for multiple sports APIs
const API_CONFIGS: SportsApiConfig[] = [
  {
    name: "ESPN API",
    baseUrl: "https://site.api.espn.com/apis/site/v2/sports",
    keyRequired: false, // ESPN has some public endpoints
    sports: ["football", "basketball", "soccer", "tennis", "mma", "boxing"],
    endpoints: {
      athletes: "/athletes",
      stats: "/statistics", 
      rankings: "/rankings",
      matches: "/scoreboard"
    }
  },
  {
    name: "SportRadar API",
    baseUrl: "https://api.sportradar.us",
    keyRequired: true,
    sports: ["soccer", "basketball", "football", "tennis", "mma"],
    endpoints: {
      athletes: "/players",
      stats: "/statistics",
      rankings: "/standings", 
      matches: "/games"
    }
  },
  {
    name: "The Sports DB",
    baseUrl: "https://www.thesportsdb.com/api/v1/json",
    keyRequired: false, // Free tier available
    sports: ["soccer", "basketball", "football", "tennis", "mma", "boxing"],
    endpoints: {
      athletes: "/searchplayers.php",
      stats: "/lookupplayer.php",
      rankings: "/lookupteam.php",
      matches: "/eventsday.php"
    }
  },
  {
    name: "API-Football",
    baseUrl: "https://v3.football.api-sports.io",
    keyRequired: true,
    sports: ["soccer"],
    endpoints: {
      athletes: "/players",
      stats: "/players/statistics",
      rankings: "/standings",
      matches: "/fixtures"
    }
  }
];

// Interface for standardized athlete data from any API
interface RealTimeAthleteData {
  name: string;
  sport: string;
  nationality?: string;
  age?: number;
  height?: string;
  weight?: string;
  position?: string;
  team?: string;
  stats?: {
    wins?: number;
    losses?: number;
    ranking?: number;
    points?: number;
    goals?: number;
    assists?: number;
  };
  recentMatches?: {
    date: string;
    opponent: string;
    result: string;
    score?: string;
  }[];
  profileImage?: string;
  bio?: string;
  lastUpdated: Date;
}

class SportsApiService {
  private apiKeys: Map<string, string> = new Map();

  constructor() {
    // Initialize with environment variables if they exist
    if (process.env.SPORTRADAR_API_KEY) {
      this.apiKeys.set("SportRadar API", process.env.SPORTRADAR_API_KEY);
    }
    if (process.env.API_FOOTBALL_KEY) {
      this.apiKeys.set("API-Football", process.env.API_FOOTBALL_KEY);
    }
    if (process.env.THESPORTSDB_API_KEY) {
      this.apiKeys.set("The Sports DB", process.env.THESPORTSDB_API_KEY);
    }
  }

  // Set API key for a specific service
  setApiKey(serviceName: string, apiKey: string) {
    this.apiKeys.set(serviceName, apiKey);
  }

  // Get available APIs for a specific sport
  getAvailableApis(sport: string): SportsApiConfig[] {
    return API_CONFIGS.filter(config => 
      config.sports.includes(sport.toLowerCase()) &&
      (!config.keyRequired || this.apiKeys.has(config.name))
    );
  }

  // Fetch athlete data from The Sports DB (free API)
  async fetchAthleteFromSportsDB(athleteName: string, sport: string): Promise<RealTimeAthleteData | null> {
    try {
      const searchUrl = `https://www.thesportsdb.com/api/v1/json/1/searchplayers.php?p=${encodeURIComponent(athleteName)}`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`SportsDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.player || data.player.length === 0) {
        return null;
      }

      const player = data.player[0];
      
      return {
        name: player.strPlayer || athleteName,
        sport: player.strSport || sport,
        nationality: player.strNationality,
        age: this.calculateAge(player.dateBorn),
        height: player.strHeight,
        weight: player.strWeight,
        position: player.strPosition,
        team: player.strTeam,
        stats: {
          ranking: parseInt(player.strNumber) || undefined,
        },
        profileImage: player.strThumb || player.strCutout,
        bio: player.strDescriptionEN,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error("Error fetching from SportsDB:", error);
      return null;
    }
  }

  // Fetch athlete data from ESPN API (public endpoints)
  async fetchAthleteFromESPN(athleteName: string, sport: string): Promise<RealTimeAthleteData | null> {
    try {
      // Map our sport names to ESPN sport codes
      const sportMapping: Record<string, string> = {
        'soccer': 'soccer',
        'football': 'nfl', 
        'basketball': 'nba',
        'tennis': 'tennis',
        'mma': 'mma',
        'boxing': 'boxing'
      };

      const espnSport = sportMapping[sport.toLowerCase()];
      if (!espnSport) {
        return null;
      }

      // ESPN athlete search is more complex, requires specific league/team context
      // For now, we'll implement a basic structure that can be expanded
      const searchUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/athletes`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status}`);
      }

      const data = await response.json();
      
      // ESPN API structure varies by sport, this is a basic implementation
      if (data.athletes && data.athletes.length > 0) {
        const athlete = data.athletes.find((a: any) => 
          a.displayName?.toLowerCase().includes(athleteName.toLowerCase()) ||
          a.fullName?.toLowerCase().includes(athleteName.toLowerCase())
        );

        if (athlete) {
          return {
            name: athlete.displayName || athlete.fullName || athleteName,
            sport: sport,
            nationality: athlete.birthPlace?.country,
            age: athlete.age,
            height: athlete.displayHeight,
            weight: athlete.displayWeight,
            position: athlete.position?.displayName,
            team: athlete.team?.displayName,
            stats: {
              ranking: athlete.jersey ? parseInt(athlete.jersey) : undefined,
            },
            profileImage: athlete.headshot?.href,
            bio: athlete.description,
            lastUpdated: new Date()
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error fetching from ESPN:", error);
      return null;
    }
  }

  // Main method to fetch real-time athlete data
  async fetchRealTimeAthleteData(athleteName: string, sport: string): Promise<RealTimeAthleteData | null> {
    const availableApis = this.getAvailableApis(sport);
    
    console.log(`Fetching real-time data for ${athleteName} (${sport}) from ${availableApis.length} available APIs`);

    // Try APIs in order of preference (free APIs first)
    for (const apiConfig of availableApis) {
      try {
        let athleteData: RealTimeAthleteData | null = null;

        switch (apiConfig.name) {
          case "The Sports DB":
            athleteData = await this.fetchAthleteFromSportsDB(athleteName, sport);
            break;
          case "ESPN API":
            athleteData = await this.fetchAthleteFromESPN(athleteName, sport);
            break;
          // Add more API implementations here
        }

        if (athleteData) {
          console.log(`✅ Found real-time data for ${athleteName} via ${apiConfig.name}`);
          return athleteData;
        }
      } catch (error) {
        console.error(`Failed to fetch from ${apiConfig.name}:`, error);
        continue;
      }
    }

    console.log(`❌ No real-time data found for ${athleteName} across ${availableApis.length} APIs`);
    return null;
  }

  // Update existing athlete with real-time data
  async updateAthleteWithRealTimeData(athleteId: string): Promise<boolean> {
    try {
      const athlete = await storage.getAthleteById(athleteId);
      if (!athlete) {
        return false;
      }

      const sport = await storage.getSportById(athlete.sportId);
      const sportName = sport?.name || "Unknown";

      const realTimeData = await this.fetchRealTimeAthleteData(athlete.name, sportName);
      
      if (realTimeData) {
        // Update athlete with real-time data
        const updatedAthlete = {
          ...athlete,
          nationality: realTimeData.nationality || athlete.nationality,
          age: realTimeData.age || athlete.age,
          height: realTimeData.height || athlete.height,
          weight: realTimeData.weight || athlete.weight,
          position: realTimeData.position || athlete.position,
          team: realTimeData.team || athlete.team,
          rank: realTimeData.stats?.ranking || athlete.rank,
          profileImageUrl: realTimeData.profileImage || athlete.profileImageUrl,
          bio: realTimeData.bio || athlete.bio,
          updatedAt: new Date()
        };

        await storage.updateAthlete(athleteId, updatedAthlete);
        
        console.log(`✅ Updated ${athlete.name} with real-time data`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error updating athlete with real-time data:", error);
      return false;
    }
  }

  // Batch update multiple athletes
  async batchUpdateAthletesWithRealTimeData(athleteIds: string[]): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const athleteId of athleteIds) {
      const success = await this.updateAthleteWithRealTimeData(athleteId);
      if (success) {
        updated++;
      } else {
        failed++;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { updated, failed };
  }

  // Get API status and available sports
  getApiStatus() {
    return API_CONFIGS.map(config => ({
      name: config.name,
      available: !config.keyRequired || this.apiKeys.has(config.name),
      keyRequired: config.keyRequired,
      hasKey: this.apiKeys.has(config.name),
      sports: config.sports
    }));
  }

  private calculateAge(birthDate: string): number | undefined {
    if (!birthDate) return undefined;
    
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    
    return age;
  }
}

export const sportsApiService = new SportsApiService();
export type { RealTimeAthleteData };