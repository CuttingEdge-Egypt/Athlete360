import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use neon client for HTTP connections (avoids WebSocket issues)
const client = neon(process.env.DATABASE_URL);

// Use neon-http adapter instead of neon-serverless to avoid WebSocket issues
export const db = drizzle(client, { schema });

// Export client for direct use if needed
export { client };