import {
  users,
  sports,
  athletes,
  athleteStrengths,
  athleteWeaknesses,
  developmentPlans,
  nutritionPlans,
  beatStrategies,
  dynamicAnalysis,
  rankHistory,
  transactions,
  analysisLogs,
  type User,
  type UpsertUser,
  type Sport,
  type Athlete,
  type AthleteStrength,
  type AthleteWeakness,
  type DevelopmentPlan,
  type NutritionPlan,
  type BeatStrategy,
  type DynamicAnalysis,
  type RankHistory,
  type Transaction,
  type AnalysisLog,
  type InsertSport,
  type InsertAthlete,
  type InsertTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, sql, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserTokens(userId: string, tokens: number): Promise<User>;
  deductTokens(userId: string, amount: number): Promise<User>;

  // Sports operations
  getAllSports(): Promise<Sport[]>;
  getSportById(id: string): Promise<Sport | undefined>;
  createSport(sport: InsertSport): Promise<Sport>;
  updateSport(id: string, sport: Partial<Sport>): Promise<Sport>;
  deleteSport(id: string): Promise<void>;

  // Athletes operations
  getAthletesBySearch(name: string, sportId?: string): Promise<Athlete[]>;
  searchAthletesByName(name: string, sportId?: string): Promise<Athlete[]>;
  getAthleteById(id: string): Promise<Athlete | undefined>;
  getAthletesBySport(sportId: string, country?: string): Promise<Athlete[]>;
  getAllCountries(): Promise<string[]>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;
  updateAthlete(id: string, athlete: Partial<Athlete>): Promise<Athlete>;
  deleteAthlete(id: string): Promise<void>;

  // Analysis operations
  getAthleteStrengths(athleteId: string): Promise<AthleteStrength[]>;
  createAthleteStrength(strength: Partial<AthleteStrength>): Promise<AthleteStrength>;
  getAthleteWeaknesses(athleteId: string): Promise<AthleteWeakness[]>;
  createAthleteWeakness(weakness: Partial<AthleteWeakness>): Promise<AthleteWeakness>;
  getDevelopmentPlans(athleteId: string): Promise<DevelopmentPlan[]>;
  createDevelopmentPlan(plan: Partial<DevelopmentPlan>): Promise<DevelopmentPlan>;
  getNutritionPlans(athleteId: string): Promise<NutritionPlan[]>;
  createNutritionPlan(plan: Partial<NutritionPlan>): Promise<NutritionPlan>;
  getBeatStrategies(athleteId: string): Promise<BeatStrategy[]>;
  createBeatStrategy(strategy: Partial<BeatStrategy>): Promise<BeatStrategy>;
  getDynamicAnalysis(athleteId: string): Promise<DynamicAnalysis[]>;
  createDynamicAnalysis(analysis: Partial<DynamicAnalysis>): Promise<DynamicAnalysis>;
  getRankHistory(athleteId: string): Promise<RankHistory[]>;
  createRankHistory(rank: Partial<RankHistory>): Promise<RankHistory>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // History operations
  getUserHistory(userId: string): Promise<any[]>;
  getUserTransactions(userId: string): Promise<Transaction[]>;

  // Analysis logs
  createAnalysisLog(log: Partial<AnalysisLog>): Promise<AnalysisLog>;
  getUserAnalysisLogs(userId: string): Promise<AnalysisLog[]>;
  getAnalysisLogById(id: string): Promise<AnalysisLog | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserTokens(userId: string, tokens: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ tokens, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deductTokens(userId: string, amount: number): Promise<User> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) throw new Error("User not found");
    
    const newTokens = Math.max(0, (currentUser.tokens || 0) - amount);
    return this.updateUserTokens(userId, newTokens);
  }

  // Sports operations
  async getAllSports(): Promise<Sport[]> {
    return db.select().from(sports);
  }
  
  async getSportById(id: string): Promise<Sport | undefined> {
    const [sport] = await db.select().from(sports).where(eq(sports.id, id));
    return sport;
  }

  async createSport(sport: InsertSport): Promise<Sport> {
    const [newSport] = await db.insert(sports).values(sport).returning();
    return newSport;
  }

  async updateSport(id: string, sport: Partial<Sport>): Promise<Sport> {
    const [updatedSport] = await db
      .update(sports)
      .set(sport)
      .where(eq(sports.id, id))
      .returning();
    return updatedSport;
  }

  async deleteSport(id: string): Promise<void> {
    await db.delete(sports).where(eq(sports.id, id));
  }

  // Athletes operations
  async getAthletesBySearch(name: string, sportId?: string): Promise<Athlete[]> {
    if (sportId) {
      return await db.select().from(athletes).where(and(
        eq(athletes.name, name),
        eq(athletes.sportId, sportId)
      ));
    } else {
      return await db.select().from(athletes).where(eq(athletes.name, name));
    }
  }

  async searchAthletesByName(name: string, sportId?: string): Promise<Athlete[]> {
    const conditions = [ilike(athletes.name, `%${name}%`)];
    if (sportId) {
      conditions.push(eq(athletes.sportId, sportId));
    }
    
    return await db.select().from(athletes)
      .where(and(...conditions))
      .orderBy(asc(athletes.name))
      .limit(10);
  }

  async getAthleteById(id: string): Promise<Athlete | undefined> {
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, id));
    return athlete;
  }

  async getAthletesBySport(sportId: string, country?: string): Promise<Athlete[]> {
    const conditions = [eq(athletes.sportId, sportId)];
    if (country) {
      conditions.push(eq(athletes.country, country));
    }
    
    return await db.select().from(athletes)
      .where(and(...conditions))
      .orderBy(asc(athletes.name), desc(athletes.updatedAt));
  }

  async getAllCountries(): Promise<string[]> {
    const result = await db.select({ country: athletes.country })
      .from(athletes)
      .where(and(
        // Only get non-null countries
        sql`${athletes.country} IS NOT NULL`,
        sql`${athletes.country} != ''`
      ))
      .groupBy(athletes.country)
      .orderBy(asc(athletes.country));
    
    return result.map((row) => row.country!).filter(Boolean);
  }

  async createAthlete(athlete: InsertAthlete): Promise<Athlete> {
    const [newAthlete] = await db.insert(athletes).values(athlete).returning();
    return newAthlete;
  }

  async updateAthlete(id: string, athlete: Partial<Athlete>): Promise<Athlete> {
    const [updatedAthlete] = await db
      .update(athletes)
      .set({ ...athlete, updatedAt: new Date() })
      .where(eq(athletes.id, id))
      .returning();
    return updatedAthlete;
  }

  async deleteAthlete(id: string): Promise<void> {
    await db.delete(athletes).where(eq(athletes.id, id));
  }

  // Analysis operations
  async getAthleteStrengths(athleteId: string): Promise<AthleteStrength[]> {
    return db.select().from(athleteStrengths).where(eq(athleteStrengths.athleteId, athleteId));
  }

  async createAthleteStrength(strength: Partial<AthleteStrength>): Promise<AthleteStrength> {
    const [newStrength] = await db.insert(athleteStrengths).values(strength as any).returning();
    return newStrength;
  }

  async getAthleteWeaknesses(athleteId: string): Promise<AthleteWeakness[]> {
    return db.select().from(athleteWeaknesses).where(eq(athleteWeaknesses.athleteId, athleteId));
  }

  async createAthleteWeakness(weakness: Partial<AthleteWeakness>): Promise<AthleteWeakness> {
    const [newWeakness] = await db.insert(athleteWeaknesses).values(weakness as any).returning();
    return newWeakness;
  }

  async getDevelopmentPlans(athleteId: string): Promise<DevelopmentPlan[]> {
    return db.select().from(developmentPlans).where(eq(developmentPlans.athleteId, athleteId));
  }

  async createDevelopmentPlan(plan: Partial<DevelopmentPlan>): Promise<DevelopmentPlan> {
    const [newPlan] = await db.insert(developmentPlans).values(plan as any).returning();
    return newPlan;
  }

  async getNutritionPlans(athleteId: string): Promise<NutritionPlan[]> {
    return db.select().from(nutritionPlans).where(eq(nutritionPlans.athleteId, athleteId));
  }

  async createNutritionPlan(plan: Partial<NutritionPlan>): Promise<NutritionPlan> {
    const [newPlan] = await db.insert(nutritionPlans).values(plan as any).returning();
    return newPlan;
  }

  async getBeatStrategies(athleteId: string): Promise<BeatStrategy[]> {
    return db.select().from(beatStrategies).where(eq(beatStrategies.athleteId, athleteId));
  }

  async createBeatStrategy(strategy: Partial<BeatStrategy>): Promise<BeatStrategy> {
    const [newStrategy] = await db.insert(beatStrategies).values(strategy as any).returning();
    return newStrategy;
  }

  async getDynamicAnalysis(athleteId: string): Promise<DynamicAnalysis[]> {
    return db.select().from(dynamicAnalysis).where(eq(dynamicAnalysis.athleteId, athleteId));
  }

  async createDynamicAnalysis(analysis: Partial<DynamicAnalysis>): Promise<DynamicAnalysis> {
    const [newAnalysis] = await db.insert(dynamicAnalysis).values(analysis as any).returning();
    return newAnalysis;
  }

  async getRankHistory(athleteId: string): Promise<RankHistory[]> {
    return db.select().from(rankHistory)
      .where(eq(rankHistory.athleteId, athleteId))
      .orderBy(desc(rankHistory.date));
  }

  async createRankHistory(rank: Partial<RankHistory>): Promise<RankHistory> {
    const [newRank] = await db.insert(rankHistory).values(rank as any).returning();
    return newRank;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Analysis logs
  async createAnalysisLog(log: Partial<AnalysisLog>): Promise<AnalysisLog> {
    const [newLog] = await db.insert(analysisLogs).values(log as any).returning();
    return newLog;
  }

  async getUserAnalysisLogs(userId: string): Promise<AnalysisLog[]> {
    return db.select().from(analysisLogs)
      .where(eq(analysisLogs.userId, userId))
      .orderBy(desc(analysisLogs.createdAt));
  }

  async getAnalysisLogById(id: string): Promise<AnalysisLog | undefined> {
    const [log] = await db.select().from(analysisLogs).where(eq(analysisLogs.id, id));
    return log;
  }

  async getUserHistory(userId: string): Promise<any[]> {
    const [transactionResults, logResults] = await Promise.all([
      // Get transactions with athlete info
      db
        .select({
          id: transactions.id,
          action: transactions.action,
          serviceType: transactions.serviceType,
          tokensDeducted: transactions.tokensDeducted,
          athleteId: transactions.athleteId,
          athleteName: athletes.name,
          athleteSport: sports.name,
          createdAt: transactions.createdAt,
          resultData: sql`NULL`.as("resultData")
        })
        .from(transactions)
        .leftJoin(athletes, eq(transactions.athleteId, athletes.id))
        .leftJoin(sports, eq(athletes.sportId, sports.id))
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
        .limit(50),
        
      // Get analysis logs with athlete info
      db
        .select({
          id: analysisLogs.id,
          action: sql`'analysis'`.as("action"),
          serviceType: analysisLogs.serviceType,
          tokensDeducted: sql`50`.as("tokensDeducted"), // Default token cost
          athleteId: analysisLogs.athleteId,
          athleteName: athletes.name,
          athleteSport: sports.name,
          createdAt: analysisLogs.createdAt,
          resultData: analysisLogs.resultData
        })
        .from(analysisLogs)
        .leftJoin(athletes, eq(analysisLogs.athleteId, athletes.id))
        .leftJoin(sports, eq(athletes.sportId, sports.id))
        .where(eq(analysisLogs.userId, userId))
        .orderBy(desc(analysisLogs.createdAt))
        .limit(50)
    ]);

    // Combine and sort by date
    const combined = [...transactionResults, ...logResults];
    return combined.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 50);
  }
}

export const storage = new DatabaseStorage();
