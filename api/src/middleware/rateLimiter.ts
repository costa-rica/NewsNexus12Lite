import { rateLimit } from "express-rate-limit";

function parseLimit(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function retryAfterSeconds(windowMs: number): number {
  return Math.ceil(windowMs / 1000);
}

function createLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      const retryAfter = retryAfterSeconds(windowMs);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        result: false,
        error: `Rate limit exceeded. Retry after ${retryAfter} seconds.`
      });
    }
  });
}

export const hourlyLimiter = createLimiter(
  60 * 60 * 1000,
  parseLimit("HOURLY_RATE_LIMIT", 200)
);

export const dailyLimiter = createLimiter(
  24 * 60 * 60 * 1000,
  parseLimit("DAILY_RATE_LIMIT", 1000)
);
