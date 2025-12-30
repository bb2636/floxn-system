import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// 환경 확인
const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

// DATABASE_URL 사용 (개발/프로덕션 모두 동일)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Please configure DATABASE_URL in secrets.",
  );
}

// DB 호스트 추출하여 로그에 표시
const hostMatch = databaseUrl.match(/@([^/]+)\//);
const dbHost = hostMatch ? hostMatch[1] : 'unknown';

console.log(`[DB] Connected to ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} database (${dbHost})`);

export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 10,
});
export const db = drizzle({ client: pool, schema });
