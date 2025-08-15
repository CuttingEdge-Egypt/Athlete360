import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  tokens: integer("tokens").default(1000), // 1000 free tokens upon signup
  totalTokensPurchased: integer("total_tokens_purchased").default(1000), // Track total tokens ever purchased
  subscriptionStatus: varchar("subscription_status").default("active"), // Active with free tokens
  paymobCustomerId: varchar("paymob_customer_id"), // Paymob customer ID
  cardToken: varchar("card_token"), // Card token from payment processor
  cardLast4: varchar("card_last_4"), // Last 4 digits of payment card
  cardBrand: varchar("card_brand"), // Card brand (Visa, Mastercard, etc.)
  paymentCardExpiry: varchar("payment_card_expiry"), // Card expiry in MM/YY format
  referralCode: varchar("referral_code").unique(), // User's unique referral code
  referredBy: varchar("referred_by"), // Who referred this user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sports table
export const sports = pgTable("sports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Athletes table
export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sportId: varchar("sport_id").notNull().references(() => sports.id),
  name: varchar("name").notNull(),
  age: integer("age"),
  gender: varchar("gender"), // Male, Female, Other
  country: varchar("country"), // This is nationality 
  bio: text("bio"),
  rank: integer("rank"),
  profileImageUrl: varchar("profile_image_url"),
  achievements: jsonb("achievements").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Athlete strengths
export const athleteStrengths = pgTable("athlete_strengths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  title: varchar("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Athlete weaknesses
export const athleteWeaknesses = pgTable("athlete_weaknesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  title: varchar("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Development plans
export const developmentPlans = pgTable("development_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  title: varchar("title").notNull(),
  description: text("description"),
  week: integer("week").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nutrition plans
export const nutritionPlans = pgTable("nutrition_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  plan: text("plan").notNull(), // Generated nutrition plan content
  createdAt: timestamp("created_at").defaultNow(),
});



// How to beat strategies
export const beatStrategies = pgTable("beat_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  strategy: varchar("strategy").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dynamic analysis
export const dynamicAnalysis = pgTable("dynamic_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  videoUrl: varchar("video_url"),
  analysisType: varchar("analysis_type").notNull(),
  findings: text("findings"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rank history
export const rankHistory = pgTable("rank_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  rank: integer("rank").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  tokensDeducted: integer("tokens_deducted").notNull(),
  athleteId: varchar("athlete_id").references(() => athletes.id),
  serviceType: varchar("service_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment receipts table
export const paymentReceipts = pgTable("payment_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  paymobTransactionId: varchar("paymob_transaction_id").unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("EGP").notNull(),
  tokensAmount: integer("tokens_amount").notNull(),
  paymentMethod: varchar("payment_method").notNull(), // "card", "wallet", etc.
  cardLast4: varchar("card_last_4"),
  cardBrand: varchar("card_brand"),
  status: varchar("status").default("completed").notNull(), // "pending", "completed", "failed"
  receiptNumber: varchar("receipt_number").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referrals table
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id),
  bonusTokens: integer("bonus_tokens").default(100).notNull(),
  status: varchar("status").default("completed").notNull(), // "pending", "completed"
  createdAt: timestamp("created_at").defaultNow(),
});

// Analysis logs
export const analysisLogs = pgTable("analysis_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  athleteId: varchar("athlete_id").references(() => athletes.id), // Made nullable for general video analysis
  serviceType: varchar("service_type").notNull(),
  resultData: jsonb("result_data"),
  shared: boolean("shared").default(false),
  shareUrl: varchar("share_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const sportsRelations = relations(sports, ({ many }) => ({
  athletes: many(athletes),
}));

export const athletesRelations = relations(athletes, ({ one, many }) => ({
  sport: one(sports, {
    fields: [athletes.sportId],
    references: [sports.id],
  }),
  strengths: many(athleteStrengths),
  weaknesses: many(athleteWeaknesses),
  developmentPlans: many(developmentPlans),
  nutritionPlans: many(nutritionPlans),
  beatStrategies: many(beatStrategies),
  dynamicAnalysis: many(dynamicAnalysis),
  rankHistory: many(rankHistory),
  transactions: many(transactions),
  analysisLogs: many(analysisLogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  analysisLogs: many(analysisLogs),
  paymentReceipts: many(paymentReceipts),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
}));

export const paymentReceiptsRelations = relations(paymentReceipts, ({ one }) => ({
  user: one(users, {
    fields: [paymentReceipts.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: "referred",
  }),
}));

// Insert schemas
export const insertSportSchema = createInsertSchema(sports).pick({
  name: true,
});

export const insertAthleteSchema = createInsertSchema(athletes).pick({
  sportId: true,
  name: true,
  age: true,
  gender: true,
  country: true,
  bio: true,
  rank: true,
  profileImageUrl: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  action: true,
  tokensDeducted: true,
  athleteId: true,
  serviceType: true,
});

export const insertPaymentReceiptSchema = createInsertSchema(paymentReceipts).pick({
  userId: true,
  paymobTransactionId: true,
  amount: true,
  currency: true,
  tokensAmount: true,
  paymentMethod: true,
  cardLast4: true,
  cardBrand: true,
  status: true,
  receiptNumber: true,
});

export const insertReferralSchema = createInsertSchema(referrals).pick({
  referrerId: true,
  referredUserId: true,
  bonusTokens: true,
  status: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
// Saved payment cards table
export const savedCards = pgTable("saved_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  cardToken: varchar("card_token").notNull(), // Stored card token from Paymob
  cardLast4: varchar("card_last_4").notNull(), // Last 4 digits for display
  cardBrand: varchar("card_brand").notNull(), // Card brand (Visa, Mastercard, etc.)
  isDefault: boolean("is_default").default(false), // Default payment method
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type SavedCard = typeof savedCards.$inferSelect;
export type InsertSavedCard = typeof savedCards.$inferInsert;
export type Sport = typeof sports.$inferSelect;
export type Athlete = typeof athletes.$inferSelect;
export type AthleteStrength = typeof athleteStrengths.$inferSelect;
export type AthleteWeakness = typeof athleteWeaknesses.$inferSelect;
export type DevelopmentPlan = typeof developmentPlans.$inferSelect;
export type NutritionPlan = typeof nutritionPlans.$inferSelect;

export type BeatStrategy = typeof beatStrategies.$inferSelect;
export type DynamicAnalysis = typeof dynamicAnalysis.$inferSelect;
export type RankHistory = typeof rankHistory.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type AnalysisLog = typeof analysisLogs.$inferSelect;
export type PaymentReceipt = typeof paymentReceipts.$inferSelect;
export type Referral = typeof referrals.$inferSelect;

export type InsertSport = z.infer<typeof insertSportSchema>;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertPaymentReceipt = z.infer<typeof insertPaymentReceiptSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
