import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// 환경에 따라 적절한 DB URL 선택
const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

// 환경별 DB URL 선택 (DEV_DATABASE_URL / PROD_DATABASE_URL 우선)
const databaseUrl = isProduction 
  ? (process.env.PROD_DATABASE_URL || process.env.DATABASE_URL)
  : (process.env.DEV_DATABASE_URL || process.env.DATABASE_URL);

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Please configure DEV_DATABASE_URL for development or PROD_DATABASE_URL for production.",
  );
}

// DB 호스트 추출하여 로그에 표시
const hostMatch = databaseUrl.match(/@([^/]+)\//);
const dbHost = hostMatch ? hostMatch[1] : 'unknown';

console.log(`[DB] Connected to ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database (${dbHost})`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
