import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use direct neon client instead of Pool to avoid WebSocket issues  
const client = neon(process.env.DATABASE_URL);

// Correct drizzle configuration for neon-serverless - client as first parameter
export const db = drizzle(process.env.DATABASE_URL, { schema });

// Export client for direct use if needed
export { client };