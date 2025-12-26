import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// 환경에 따라 적절한 DB URL 선택
const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

// Replit PostgreSQL 환경변수로 URL 구성 (우선 사용)
const buildPgUrl = () => {
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`;
  }
  return null;
};

// 환경별 DB URL 선택 (Replit PostgreSQL 우선, 그 다음 기존 환경변수)
const databaseUrl = isProduction 
  ? (process.env.PROD_DATABASE_URL || process.env.DATABASE_URL)
  : (buildPgUrl() || process.env.DEV_DATABASE_URL || process.env.DATABASE_URL);

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Please configure the database connection.",
  );
}

console.log(`[DB] Connected to ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database`);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
