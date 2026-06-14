import type { NextFunction, Request, Response } from "express";

import { logger } from "../services/logger";

export type HttpError = Error & { status?: number; statusCode?: number };

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  void next;
  const status = err.status ?? err.statusCode ?? 500;
  logger.error("Unhandled request error", {
    status,
    message: err.message,
    stack: err.stack
  });

  res.status(status).json({
    result: false,
    error: err.message || "Internal server error"
  });
}
