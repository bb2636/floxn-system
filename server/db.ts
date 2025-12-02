import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// 환경에 따라 적절한 DB URL 선택
const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
const databaseUrl = isProduction 
  ? process.env.PROD_DATABASE_URL 
  : process.env.DEV_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    isProduction 
      ? "PROD_DATABASE_URL must be set for production environment."
      : "DEV_DATABASE_URL must be set for development environment.",
  );
}

console.log(`[DB] Connected to ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
