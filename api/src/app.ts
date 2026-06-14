import cookieParser from "cookie-parser";
import express, { type Express } from "express";

import { errorHandler } from "./middleware/errorHandler";
import { hourlyLimiter, dailyLimiter } from "./middleware/rateLimiter";
import { sessionMiddleware } from "./middleware/session";
import articlesRouter from "./routes/articles";
import demoRouter from "./routes/demo";
import orchestrationRouter from "./routes/orchestration";
import promptsRouter from "./routes/prompts";
import rssRouter from "./routes/rss";

export function createApp(): Express {
  const app = express();

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Retry-After");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(hourlyLimiter, dailyLimiter);
  app.use(sessionMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({
      result: true,
      data: {
        ok: true,
        service: "@newsnexus12lite/api"
      }
    });
  });

  app.use("/api/demo", demoRouter);
  app.use("/api/rss", rssRouter);
  app.use("/api/orchestration", orchestrationRouter);
  app.use("/api/articles", articlesRouter);
  app.use("/api/prompts", promptsRouter);
  app.use(errorHandler);

  return app;
}

export default createApp;
