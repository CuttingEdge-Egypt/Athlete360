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
  tokens: integer("tokens").default(0),
  subscriptionStatus: varchar("subscription_status").default("inactive"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
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
  country: varchar("country"),
  bio: text("bio"),
  rank: integer("rank"),
  profileImageUrl: varchar("profile_image_url"),
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
  mealType: varchar("meal_type").notNull(),
  foodItem: varchar("food_item").notNull(),
  calories: integer("calories"),
  description: text("description"),
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

// Analysis logs
export const analysisLogs = pgTable("analysis_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
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
}));

// Insert schemas
export const insertSportSchema = createInsertSchema(sports).pick({
  name: true,
});

export const insertAthleteSchema = createInsertSchema(athletes).pick({
  sportId: true,
  name: true,
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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

export type InsertSport = z.infer<typeof insertSportSchema>;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
