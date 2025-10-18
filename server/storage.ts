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
  paymentReceipts,
  referrals,
  savedCards,
  jobs,
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
  type PaymentReceipt,
  type Referral,
  type SavedCard,
  type Job,
  type InsertSport,
  type InsertAthlete,
  type InsertTransaction,
  type InsertPaymentReceipt,
  type InsertReferral,
  type InsertSavedCard,
  type InsertJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, sql, ilike, ne, notInArray, not } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    authProvider: string;
    emailVerified: boolean;
    referralCode?: string;
  }): Promise<string>;
  createLocalUserWithCard(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    authProvider: string;
    emailVerified: boolean;
    referralCode?: string;
    cardToken: string;
    cardLast4: string;
    cardBrand: string;
    paymobCustomerId: string;
  }): Promise<string>;
  updateUserTokens(userId: string, tokens: number): Promise<User>;
  deductTokens(userId: string, amount: number): Promise<User>;
  refundTokens(userId: string, amount: number): Promise<User>;
  addTokensToUser(userId: string, amount: number): Promise<User>;
  getUserIdFromOrder(orderId: string): Promise<string | null>;
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
  searchAthletesByName(name: string, sportId?: string, country?: string): Promise<Athlete[]>;
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
  getUserHistory(userId: string, language?: string): Promise<any[]>;
  getUserTransactions(userId: string): Promise<Transaction[]>;

  // Analysis logs
  createAnalysisLog(log: Partial<AnalysisLog>): Promise<AnalysisLog>;
  getUserAnalysisLogs(userId: string): Promise<AnalysisLog[]>;
  getAnalysisLogById(id: string): Promise<AnalysisLog | undefined>;
  getLatestAnalysisByType(serviceTypes: string[], language?: string): Promise<AnalysisLog[]>;

  // Payment receipts
  createPaymentReceipt(receipt: InsertPaymentReceipt): Promise<PaymentReceipt>;
  getUserPaymentReceipts(userId: string): Promise<PaymentReceipt[]>;
  getPaymentReceiptById(id: string): Promise<PaymentReceipt | undefined>;

  // Referrals
  createReferral(referral: InsertReferral): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getReferralCount(userId: string): Promise<number>;

  // Jobs
  createJob(job: InsertJob): Promise<Job>;
  getJobById(id: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job>;
  getUserJobs(userId: string): Promise<Job[]>;
  getQueuedJobs(): Promise<Job[]>;
  cancelJob(id: string): Promise<Job>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createLocalUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    authProvider: string;
    emailVerified: boolean;
    referralCode?: string;
  }): Promise<string> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
        authProvider: userData.authProvider,
        emailVerified: userData.emailVerified,
        referredBy: userData.referralCode,
        tokens: 1000, // Start with 1000 free tokens
        totalTokensPurchased: 1000,
      })
      .returning();
    
    // Generate a unique referral code for the new user
    await this.generateReferralCode(user.id);
    
    return user.id;
  }

  async createLocalUserWithCard(userData: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    authProvider: string;
    emailVerified: boolean;
    referralCode?: string;
    cardToken: string;
    cardLast4: string;
    cardBrand: string;
    paymobCustomerId: string;
  }): Promise<string> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: userData.passwordHash,
        authProvider: userData.authProvider,
        emailVerified: userData.emailVerified,
        referredBy: userData.referralCode,
        cardToken: userData.cardToken,
        cardLast4: userData.cardLast4,
        cardBrand: userData.cardBrand,
        paymobCustomerId: userData.paymobCustomerId,
        tokens: 1000, // Start with 1000 free tokens
        totalTokensPurchased: 1000,
      })
      .returning();
    
    return user.id;
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
    // When adding tokens, set total purchased to match new current tokens
    const newTotalPurchased = newTokens;
    
    console.log(`ADDING ${tokensToAdd} tokens to user ${userId}: ${currentTokens} → ${newTokens}, total purchased: ${user.totalTokensPurchased} → ${newTotalPurchased}`);
    
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

  async refundTokens(userId: string, tokensToRefund: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const currentTokens = user.tokens || 0;
    const newTokens = currentTokens + tokensToRefund;
    
    console.log(`REFUNDING ${tokensToRefund} tokens to user ${userId}: ${currentTokens} → ${newTokens}`);
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        tokens: newTokens,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async addTokensToUser(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newTokenBalance = (user.tokens || 0) + amount;
    const newTotalTokensPurchased = (user.totalTokensPurchased || 0) + amount;

    const [updatedUser] = await db
      .update(users)
      .set({
        tokens: newTokenBalance,
        totalTokensPurchased: newTotalTokensPurchased,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to add tokens");
    }

    return updatedUser;
  }

  async getUserIdFromOrder(orderId: string): Promise<string | null> {
    try {
      // Try to extract from merchant order format first
      if (orderId && orderId.includes('_')) {
        const parts = orderId.split('_');
        if (parts.length >= 3 && parts[0] === 'tokens') {
          const userId = parts.slice(1, -1).join('_'); // Handle UUIDs with underscores
          console.log(`📦 Extracted user ID from order format: ${userId}`);
          return userId;
        }
      }
      
      // Fallback to database lookup
      const receipts = await db
        .select()
        .from(paymentReceipts)
        .where(eq(paymentReceipts.id, orderId))
        .limit(1);
      
      const receipt = receipts[0];
      
      if (receipt) {
        return receipt.userId;
      }
      
      // If no receipt found, try to extract from merchant order format
      if (orderId.startsWith('tokens_')) {
        const parts = orderId.split('_');
        if (parts.length >= 3) {
          const userId = parts.slice(1, -1).join('_'); // Handle UUIDs with underscores
          return userId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user ID from order:', error);
      return null;
    }
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
    const nameConditions = [
      eq(athletes.name, name),
      eq(athletes.nameArabic, name)
    ];
    
    if (sportId) {
      return await db.select().from(athletes).where(and(
        sql`(${athletes.name} = ${name} OR ${athletes.nameArabic} = ${name})`,
        eq(athletes.sportId, sportId)
      ));
    } else {
      return await db.select().from(athletes).where(
        sql`(${athletes.name} = ${name} OR ${athletes.nameArabic} = ${name})`
      );
    }
  }

  async searchAthletesByName(name: string, sportId?: string, country?: string): Promise<Athlete[]> {
    const nameCondition = sql`(${athletes.name} ILIKE ${`%${name}%`} OR ${athletes.nameArabic} ILIKE ${`%${name}%`})`;
    const conditions = [nameCondition];
    
    if (sportId) {
      conditions.push(eq(athletes.sportId, sportId));
    }
    if (country) {
      conditions.push(eq(athletes.country, country));
    }
    
    return await db.select().from(athletes)
      .where(and(...conditions))
      .orderBy(asc(athletes.name))
      .limit(10);
  }

  async getAthleteById(id: string): Promise<any> {
    const results = await db.query.athletes.findFirst({
      where: eq(athletes.id, id),
      with: {
        sport: true,
      },
    });
    return results;
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
    // Comprehensive list of all world countries
    const allCountries = [
      "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
      "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
      "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Côte d'Ivoire",
      "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
      "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
      "Fiji", "Finland", "France",
      "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
      "Haiti", "Holy See", "Honduras", "Hungary",
      "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
      "Jamaica", "Japan", "Jordan",
      "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
      "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
      "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
      "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
      "Oman",
      "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
      "Qatar",
      "Romania", "Russia", "Rwanda",
      "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
      "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
      "UAE", "Uganda", "Ukraine", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
      "Vanuatu", "Venezuela", "Vietnam",
      "Yemen",
      "Zambia", "Zimbabwe"
    ];

    // Get countries that have athletes in the database
    const athleteCountries = await db.select({ country: athletes.country })
      .from(athletes)
      .where(and(
        sql`${athletes.country} IS NOT NULL`,
        sql`${athletes.country} != ''`
      ))
      .groupBy(athletes.country);
    
    const existingCountries = athleteCountries.map((row) => row.country!).filter(Boolean);
    
    // Combine all countries with existing athlete countries, remove duplicates, and sort
    const combinedSet = new Set([...allCountries, ...existingCountries]);
    const combinedCountries = Array.from(combinedSet);
    return combinedCountries.sort();
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

  async getLatestAnalysisByType(serviceTypes: string[], language?: string): Promise<AnalysisLog[]> {
    const results = [];
    
    // Helper function to create language filter that handles both 'en' and 'en-US', 'ar' etc.
    const getLanguageFilter = (lang?: string) => {
      if (!lang) return sql`TRUE`;
      // For 'en', match both 'en' and 'en-US'
      if (lang === 'en') {
        return sql`(${analysisLogs.language} = 'en' OR ${analysisLogs.language} = 'en-US')`;
      }
      // For other languages, exact match
      return eq(analysisLogs.language, lang);
    };
    
    for (const serviceType of serviceTypes) {
      if (serviceType === 'video') {
        // For video analysis preview, prefer videos with player-specific advice, fall back to match data
        // Step 1: Try to get a video with advice_analysis (player-specific tactical/technical/mental advice)
        const logsWithAdvice = await db
          .select()
          .from(analysisLogs)
          .where(
            and(
              eq(analysisLogs.serviceType, serviceType),
              // Include videos that either:
              // 1. Don't have an "errors" field at all, OR
              // 2. Have an "errors" field where all values are null (valid tracking object)
              // This excludes only videos with actual error messages
              sql`(
                ${analysisLogs.resultData}::text NOT LIKE '%"errors"%' OR
                (${analysisLogs.resultData}::text LIKE '%"errors"%' AND 
                 ${analysisLogs.resultData}::jsonb->'errors' IS NOT NULL AND
                 (SELECT bool_and(value = 'null'::jsonb) FROM jsonb_each(${analysisLogs.resultData}::jsonb->'errors')))
              )`,
              getLanguageFilter(language),
              sql`${analysisLogs.resultData}::text LIKE '%advice_analysis%'`
            )
          )
          .orderBy(desc(analysisLogs.createdAt))
          .limit(1);
        
        if (logsWithAdvice[0]) {
          results.push(logsWithAdvice[0]);
        } else {
          // Step 2: Fallback - get a video with match data (events, scores, analysis)
          const logsWithMatchData = await db
            .select()
            .from(analysisLogs)
            .where(
              and(
                eq(analysisLogs.serviceType, serviceType),
                // Same error filtering logic
                sql`(
                  ${analysisLogs.resultData}::text NOT LIKE '%"errors"%' OR
                  (${analysisLogs.resultData}::text LIKE '%"errors"%' AND 
                   ${analysisLogs.resultData}::jsonb->'errors' IS NOT NULL AND
                   (SELECT bool_and(value = 'null'::jsonb) FROM jsonb_each(${analysisLogs.resultData}::jsonb->'errors')))
                )`,
                getLanguageFilter(language),
                sql`(
                  ${analysisLogs.resultData}::text LIKE '%match_analysis%' OR
                  ${analysisLogs.resultData}::text LIKE '%events%' OR
                  ${analysisLogs.resultData}::text LIKE '%scoreEvents%'
                )`
              )
            )
            .orderBy(desc(analysisLogs.createdAt))
            .limit(1);
          
          if (logsWithMatchData[0]) {
            results.push(logsWithMatchData[0]);
          }
        }
      } else if (serviceType === 'weaknesses') {
        // For weaknesses preview, get the most recent with substantial content (length > 600)
        const [latestLog] = await db
          .select()
          .from(analysisLogs)
          .where(
            and(
              eq(analysisLogs.serviceType, serviceType),
              sql`LENGTH(${analysisLogs.resultData}::text) > 600`,
              getLanguageFilter(language)
            )
          )
          .orderBy(desc(analysisLogs.createdAt))
          .limit(1);
        
        if (latestLog) {
          results.push(latestLog);
        }
      } else if (serviceType === 'bio') {
        // For bio, get a result with substantial content (length > 2000)
        const [latestLog] = await db
          .select()
          .from(analysisLogs)
          .where(
            and(
              eq(analysisLogs.serviceType, serviceType),
              sql`LENGTH(${analysisLogs.resultData}::text) > 2000`,
              getLanguageFilter(language)
            )
          )
          .orderBy(desc(analysisLogs.createdAt))
          .limit(1);
        
        if (latestLog) {
          results.push(latestLog);
        }
      } else if (serviceType === 'development-plan' || serviceType === 'development') {
        // For development plans, get the most recent one, with fallback to English
        const [latestLog] = await db
          .select()
          .from(analysisLogs)
          .where(
            and(
              eq(analysisLogs.serviceType, serviceType),
              getLanguageFilter(language)
            )
          )
          .orderBy(desc(analysisLogs.createdAt))
          .limit(1);
        
        // If no result in requested language, fall back to English
        if (!latestLog && language && language !== 'en') {
          const [fallbackLog] = await db
            .select()
            .from(analysisLogs)
            .where(
              and(
                eq(analysisLogs.serviceType, serviceType),
                eq(analysisLogs.language, 'en')
              )
            )
            .orderBy(desc(analysisLogs.createdAt))
            .limit(1);
          
          if (fallbackLog) {
            results.push(fallbackLog);
          }
        } else if (latestLog) {
          results.push(latestLog);
        }
      } else if (serviceType === 'nutrition-plan' || serviceType === 'nutrition') {
        // For nutrition plans, get the most recent one
        const [latestLog] = await db
          .select()
          .from(analysisLogs)
          .where(
            and(
              eq(analysisLogs.serviceType, serviceType),
              getLanguageFilter(language)
            )
          )
          .orderBy(desc(analysisLogs.createdAt))
          .limit(1);
        
        if (latestLog) {
          results.push(latestLog);
        }
      } else {
        // For other types (rank, strengths, beat, comparison, etc.), get the latest with language filtering
        const [latestLog] = await db
          .select()
          .from(analysisLogs)
          .where(
            and(
              eq(analysisLogs.serviceType, serviceType),
              getLanguageFilter(language)
            )
          )
          .orderBy(desc(analysisLogs.createdAt))
          .limit(1);
        
        if (latestLog) {
          results.push(latestLog);
        }
      }
    }
    
    return results;
  }

  async getUserHistory(userId: string, language?: string): Promise<any[]> {
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
        .where(
          and(
            eq(transactions.userId, userId),
            // Exclude transactions that have analysis logs with result data
            notInArray(transactions.serviceType, ['comparison', 'bio', 'rank', 'strengths', 'weaknesses', 'development', 'development-plan', 'nutrition-plan', 'beat-strategies', 'video'])
          )
        )
        .orderBy(desc(transactions.createdAt))
        .limit(50),
        
      // Get analysis logs with athlete info
      db
        .select({
          id: analysisLogs.id,
          action: sql`'analysis'`.as("action"),
          serviceType: analysisLogs.serviceType,
          tokensDeducted: sql`
            CASE 
              WHEN ${analysisLogs.serviceType} = 'video' THEN 200
              WHEN ${analysisLogs.serviceType} = 'comparison' THEN 100
              WHEN ${analysisLogs.serviceType} = 'development-plan' THEN 50
              WHEN ${analysisLogs.serviceType} = 'nutrition-plan' THEN 75
              WHEN ${analysisLogs.serviceType} = 'rank' THEN 70
              ELSE 50
            END
          `.as("tokensDeducted"),
          athleteId: analysisLogs.athleteId,
          athleteName: athletes.name,
          athleteSport: sports.name,
          createdAt: analysisLogs.createdAt,
          resultData: analysisLogs.resultData
        })
        .from(analysisLogs)
        .leftJoin(athletes, eq(analysisLogs.athleteId, athletes.id))
        .leftJoin(sports, eq(athletes.sportId, sports.id))
        .where(
          language 
            ? and(
                eq(analysisLogs.userId, userId),
                eq(analysisLogs.language, language)
              )
            : eq(analysisLogs.userId, userId)
        )
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
    // Clear transactions and analysis logs (no transaction support in neon-http driver)
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(analysisLogs).where(eq(analysisLogs.userId, userId));
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

  // Jobs operations
  async createJob(jobData: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(jobData).returning();
    return job;
  }

  async getJobById(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async getUserJobs(userId: string): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt));
  }

  async getQueuedJobs(): Promise<Job[]> {
    return await db
      .select()
      .from(jobs)
      .where(eq(jobs.status, "queued"))
      .orderBy(asc(jobs.createdAt));
  }

  async cancelJob(id: string): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set({ 
        status: "cancelled",
        updatedAt: new Date(),
        completedAt: new Date()
      })
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }
}

// In-memory storage for jobs (preferred for job queue processing)
export class MemJobStorage {
  private jobs = new Map<string, Job>();
  private nextId = 1;

  async createJob(jobData: InsertJob): Promise<Job> {
    const id = `job_${this.nextId++}`;
    const now = new Date();
    const job: Job = {
      id,
      userId: jobData.userId,
      type: jobData.type,
      status: "queued",
      progress: 0,
      parameters: jobData.parameters,
      result: null,
      partialResult: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJobById(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    
    // Prevent invalid state transitions
    if (updates.status && job.status === "completed") {
      throw new Error("Cannot update completed job");
    }
    if (updates.status && job.status === "cancelled") {
      throw new Error("Cannot update cancelled job");
    }
    
    const updatedJob: Job = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };
    
    // Set timestamps based on status changes
    if (updates.status === "running" && !job.startedAt) {
      updatedJob.startedAt = new Date();
    }
    if (updates.status === "completed" || updates.status === "failed" || updates.status === "cancelled") {
      updatedJob.completedAt = new Date();
    }
    
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async getUserJobs(userId: string): Promise<Job[]> {
    const userJobs = Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => (b.createdAt || new Date()).getTime() - (a.createdAt || new Date()).getTime());
    return userJobs;
  }

  async getQueuedJobs(): Promise<Job[]> {
    const queuedJobs = Array.from(this.jobs.values())
      .filter(job => job.status === "queued")
      .sort((a, b) => (a.createdAt || new Date()).getTime() - (b.createdAt || new Date()).getTime());
    return queuedJobs;
  }

  async cancelJob(id: string): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    
    if (job.status === "completed" || job.status === "failed") {
      throw new Error("Cannot cancel completed or failed job");
    }
    
    return this.updateJob(id, { status: "cancelled" });
  }
}

// Hybrid storage: Database for everything else, MemStorage for jobs
export class HybridStorage extends DatabaseStorage {
  private jobStorage = new MemJobStorage();

  // Override job methods to use MemStorage
  async createJob(jobData: InsertJob): Promise<Job> {
    return this.jobStorage.createJob(jobData);
  }

  async getJobById(id: string): Promise<Job | undefined> {
    return this.jobStorage.getJobById(id);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    return this.jobStorage.updateJob(id, updates);
  }

  async getUserJobs(userId: string): Promise<Job[]> {
    return this.jobStorage.getUserJobs(userId);
  }

  async getQueuedJobs(): Promise<Job[]> {
    return this.jobStorage.getQueuedJobs();
  }

  async cancelJob(id: string): Promise<Job> {
    return this.jobStorage.cancelJob(id);
  }
}

export const storage = new HybridStorage();
