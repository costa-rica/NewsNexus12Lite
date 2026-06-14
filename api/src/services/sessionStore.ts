import { randomUUID } from "node:crypto";

import type { ResetScope, SessionObject } from "../types";
import { clonePromptConfiguration, getDefaultPrompts } from "./defaultPrompts";

export const sessionStore = new Map<string, SessionObject>();

export function getSession(sessionId: string): SessionObject | undefined {
  return sessionStore.get(sessionId);
}

export function createSession(): SessionObject {
  const now = new Date().toISOString();
  const session: SessionObject = {
    sessionId: randomUUID(),
    firstLaunchAnswered: false,
    articles: [],
    promptState: clonePromptConfiguration(getDefaultPrompts()),
    activeRunId: null,
    createdAt: now,
    lastAccessedAt: now
  };

  sessionStore.set(session.sessionId, session);
  return session;
}

export function resetSession(session: SessionObject, scope: ResetScope): void {
  const defaults = clonePromptConfiguration(getDefaultPrompts());

  if (scope === "all" || scope === "articles") {
    session.articles = [];
    session.activeRunId = null;
  }

  if (scope === "all" || scope === "prompts") {
    session.promptState = defaults;
  }

  if (scope === "approverPrompts") {
    session.promptState.approver = defaults.approver;
  }

  if (scope === "stateAssignerPrompts") {
    session.promptState.stateAssigner = defaults.stateAssigner;
  }

  session.lastAccessedAt = new Date().toISOString();
}
