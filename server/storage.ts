import {
  users,
  sports,
  athletes,
  athleteStrengths,
  athleteWeaknesses,
  developmentPlans,
  beatStrategies,
  dynamicAnalysis,
  rankHistory,
  transactions,
  analysisLogs,
  paymentReceipts,
  referrals,
  savedCards,
  type User,
  type UpsertUser,
  type Sport,
  type Athlete,
  type AthleteStrength,
  type AthleteWeakness,
  type DevelopmentPlan,
  type BeatStrategy,
  type DynamicAnalysis,
  type RankHistory,
  type Transaction,
  type AnalysisLog,
  type PaymentReceipt,
  type Referral,
  type SavedCard,
  type InsertSport,
  type InsertAthlete,
  type InsertTransaction,
  type InsertPaymentReceipt,
  type InsertReferral,
  type InsertSavedCard,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, sql, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserTokens(userId: string, tokens: number): Promise<User>;
  deductTokens(userId: string, amount: number): Promise<User>;
  updateUserPaymentCard(userId: string, cardData: { cardToken: string, cardLast4: string, cardBrand: string, paymobCustomerId?: string }): Promise<User>;
  generateReferralCode(userId: string): Promise<string>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;

  // User profile management
  updateUserProfile(userId: string, profileData: { firstName: string; lastName: string; email: string }): Promise<User>;
  getUserPaymentCards(userId: string): Promise<any[]>;
  addPaymentCard(userId: string, cardData: {
    cardLast4: string;
    cardBrand: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    isDefault: boolean;
  }): Promise<any>;
  removePaymentCard(userId: string, cardId: string): Promise<void>;

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

  // Payment receipts
  createPaymentReceipt(receipt: InsertPaymentReceipt): Promise<PaymentReceipt>;
  getUserPaymentReceipts(userId: string): Promise<PaymentReceipt[]>;
  getPaymentReceiptById(id: string): Promise<PaymentReceipt | undefined>;

  // Referrals
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getReferralCount(userId: string): Promise<number>;
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
    console.log(`UPDATING user ${userId} tokens to ${tokens}`);
    const [user] = await db
      .update(users)
      .set({ tokens, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    console.log(`UPDATE COMPLETE: User tokens are now ${user?.tokens}`);
    if (!user) {
      throw new Error(`Failed to update tokens for user ${userId}`);
    }
    return user;
  }

  async deductTokens(userId: string, amount: number): Promise<User> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) throw new Error("User not found");
    
    const newTokens = Math.max(0, (currentUser.tokens || 0) - amount);
    console.log(`DEDUCTING ${amount} tokens from user ${userId}: ${currentUser.tokens} → ${newTokens}`);
    
    // When deducting, only update current tokens, keep totalTokensPurchased unchanged
    const [updatedUser] = await db
      .update(users)
      .set({ 
        tokens: newTokens, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`Failed to deduct tokens for user ${userId}`);
    }
    
    console.log(`DEDUCTION RESULT: User now has ${updatedUser.tokens}/${updatedUser.totalTokensPurchased} tokens`);
    return updatedUser;
  }

  async addTokensPurchase(userId: string, tokensToAdd: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const currentTokens = user.tokens || 0;
    const newTokens = currentTokens + tokensToAdd;
    // totalTokensPurchased should be the new current balance after purchase (high-water mark)
    const newTotalPurchased = newTokens;
    
    console.log(`ADDING ${tokensToAdd} tokens to user ${userId}: ${currentTokens} → ${newTokens}, total: ${newTotalPurchased}`);
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        tokens: newTokens,
        totalTokensPurchased: newTotalPurchased,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // User profile management
  async updateUserProfile(userId: string, profileData: { firstName: string; lastName: string; email: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserPaymentCards(userId: string): Promise<any[]> {
    // For now, return the user's stored card info from the user table
    // In a real app, this would query a separate payment_cards table
    const user = await this.getUser(userId);
    if (!user || !user.cardLast4) {
      return [];
    }

    return [{
      id: 'default',
      cardLast4: user.cardLast4,
      cardBrand: user.cardBrand || 'Unknown',
      expiryMonth: user.paymentCardExpiry?.split('/')[0] || '09',
      expiryYear: user.paymentCardExpiry?.split('/')[1] || '27',
      fullCardNumber: `**** **** **** ${user.cardLast4}`, // For display purposes only
      isDefault: true,
      createdAt: user.createdAt
    }];
  }

  async addPaymentCard(userId: string, cardData: {
    cardLast4: string;
    cardBrand: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    isDefault: boolean;
  }) {
    // For simplicity, we'll update the user's primary card info
    // In a real app, this would insert into a separate payment_cards table
    const [user] = await db
      .update(users)
      .set({
        cardLast4: cardData.cardLast4,
        cardBrand: cardData.cardBrand,
        paymentCardExpiry: `${cardData.expiryMonth}/${cardData.expiryYear}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return {
      id: 'default',
      cardLast4: cardData.cardLast4,
      cardBrand: cardData.cardBrand,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      isDefault: true,
      createdAt: new Date()
    };
  }

  async removePaymentCard(userId: string, cardId: string) {
    // For simplicity, we'll clear the user's primary card info
    // In a real app, this would delete from a separate payment_cards table
    await db
      .update(users)
      .set({
        cardToken: null,
        cardLast4: null,
        cardBrand: null,
        paymentCardExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
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

  async clearUserHistory(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear transactions
      await tx.delete(transactions).where(eq(transactions.userId, userId));
      // Clear analysis logs
      await tx.delete(analysisLogs).where(eq(analysisLogs.userId, userId));
    });
  }

  // Payment card operations
  async updateUserPaymentCard(userId: string, cardData: { cardToken: string, cardLast4: string, cardBrand: string, paymobCustomerId?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        cardToken: cardData.cardToken,
        cardLast4: cardData.cardLast4,
        cardBrand: cardData.cardBrand,
        paymobCustomerId: cardData.paymobCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error(`Failed to update payment card for user ${userId}`);
    }
    return user;
  }

  // Referral operations
  async generateReferralCode(userId: string): Promise<string> {
    // Generate a unique 8-character code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let referralCode: string;
    let isUnique = false;
    
    do {
      referralCode = '';
      for (let i = 0; i < 8; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists
      const existingUser = await this.getUserByReferralCode(referralCode);
      isUnique = !existingUser;
    } while (!isUnique);

    // Update user with referral code
    await db
      .update(users)
      .set({ referralCode, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return referralCode;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user;
  }

  // Payment receipts operations
  async createPaymentReceipt(receiptData: InsertPaymentReceipt): Promise<PaymentReceipt> {
    const [receipt] = await db.insert(paymentReceipts).values(receiptData).returning();
    return receipt;
  }

  async getUserPaymentReceipts(userId: string): Promise<PaymentReceipt[]> {
    return await db
      .select()
      .from(paymentReceipts)
      .where(eq(paymentReceipts.userId, userId))
      .orderBy(desc(paymentReceipts.createdAt));
  }

  async getPaymentReceiptById(id: string): Promise<PaymentReceipt | undefined> {
    const [receipt] = await db.select().from(paymentReceipts).where(eq(paymentReceipts.id, id));
    return receipt;
  }

  // Saved cards operations
  async createSavedCard(cardData: InsertSavedCard): Promise<SavedCard> {
    const [card] = await db.insert(savedCards).values(cardData).returning();
    return card;
  }

  async getUserSavedCards(userId: string): Promise<SavedCard[]> {
    try {
      return await db
        .select()
        .from(savedCards)
        .where(eq(savedCards.userId, userId))
        .orderBy(desc(savedCards.createdAt));
    } catch (error) {
      // If saved_cards table doesn't exist or has issues, return empty array
      console.log("Saved cards table not accessible, returning empty array");
      return [];
    }
  }

  async getSavedCardById(id: string): Promise<SavedCard | undefined> {
    const [card] = await db.select().from(savedCards).where(eq(savedCards.id, id));
    return card;
  }

  async setDefaultCard(userId: string, cardId: string): Promise<void> {
    // First, remove default from all user cards
    await db
      .update(savedCards)
      .set({ isDefault: false })
      .where(eq(savedCards.userId, userId));
    
    // Set the selected card as default
    await db
      .update(savedCards)
      .set({ isDefault: true })
      .where(eq(savedCards.id, cardId));
  }

  async deleteSavedCard(cardId: string): Promise<void> {
    await db.delete(savedCards).where(eq(savedCards.id, cardId));
  }

  // Referrals operations
  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(referralData).returning();
    return referral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    
    return result[0]?.count || 0;
  }
}

export const storage = new DatabaseStorage();
