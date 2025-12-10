import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// 환경에 따라 적절한 DB URL 선택
const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

// 환경별 DB URL 선택 (환경변수가 없으면 공통 DATABASE_URL 사용)
const databaseUrl = isProduction 
  ? (process.env.PROD_DATABASE_URL || process.env.DATABASE_URL)
  : (process.env.DEV_DATABASE_URL || process.env.DATABASE_URL);

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Please configure the database connection.",
  );
}

console.log(`[DB] Connected to ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
