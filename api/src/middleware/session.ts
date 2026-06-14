import type { NextFunction, Request, Response } from "express";

import { createSession, getSession } from "../services/sessionStore";

const SESSION_COOKIE = "sessionId";

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const cookieSessionId = typeof req.cookies?.[SESSION_COOKIE] === "string" ? req.cookies[SESSION_COOKIE] : null;
  const session = cookieSessionId ? getSession(cookieSessionId) : undefined;
  const activeSession = session ?? createSession();

  activeSession.lastAccessedAt = new Date().toISOString();
  res.cookie(SESSION_COOKIE, activeSession.sessionId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
  res.locals.session = activeSession;
  next();
}
