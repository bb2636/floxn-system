import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage, warmUpUsersCache } from "./storage";
import { initializeEmailTransporter } from "./hiworks-email";

const MemoryStore = createMemoryStore(session);

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole: string;
    isSuperAdmin: boolean;
    rememberMe: boolean;
  }
}

// Determine production mode - check both NODE_ENV and REPLIT_DEPLOYMENT
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';

console.log("[SESSION CONFIG]", {
  nodeEnv: process.env.NODE_ENV,
  replitDeployment: process.env.REPLIT_DEPLOYMENT,
  isProduction,
  cookieSecure: isProduction,
});

// Trust proxy for production (Replit uses reverse proxy)
if (isProduction) {
  app.set('trust proxy', 1);
  console.log("[SESSION] Trust proxy enabled for production");
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'insurance-system-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  store: new MemoryStore({
    checkPeriod: 86400000,
  }),
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax',
  },
}));

app.get("/_health", (_req, res) => {
  res.status(200).send("OK");
});

app.use(express.json({
  limit: '500mb', // 대용량 파일 처리를 위해 크기 제한 대폭 증가
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("[ERROR]", err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (isProduction) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.timeout = 300000;
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 310000;
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port} (timeout: ${server.timeout}ms)`);

    warmUpUsersCache();

    (async () => {
      try {
        const migratedCount = await storage.migrateExistingCaseDates();
        if (migratedCount > 0) {
          log(`Date migration completed: ${migratedCount} cases updated`);
        }
      } catch (error) {
        console.error("Date migration failed:", error);
      }

      initializeEmailTransporter();
    })();
  });
})();
