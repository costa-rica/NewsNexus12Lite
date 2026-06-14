import { Router } from "express";

import { promptGroupIsDefault, getDefaultPrompts } from "../services/defaultPrompts";
import { resetSession } from "../services/sessionStore";
import type { ResetScope } from "../types";

const RESET_SCOPES: ResetScope[] = ["all", "articles", "prompts", "approverPrompts", "stateAssignerPrompts"];

export const demoRouter = Router();

demoRouter.get("/session", (_req, res) => {
  const session = res.locals.session;
  const defaults = getDefaultPrompts();
  res.json({
    result: true,
    data: {
      session,
      articles: session.articles,
      activeRunId: session.activeRunId,
      promptState: session.promptState,
      promptIsDefault: {
        approver: promptGroupIsDefault(session.promptState, defaults, "approver"),
        stateAssigner: promptGroupIsDefault(session.promptState, defaults, "stateAssigner")
      }
    }
  });
});

demoRouter.post("/first-launch", (req, res) => {
  if (typeof req.body?.isFirstTime !== "boolean") {
    res.status(400).json({ result: false, error: "isFirstTime must be a boolean." });
    return;
  }
  if (req.body.isFirstTime) {
    resetSession(res.locals.session, "all");
  }
  res.locals.session.firstLaunchAnswered = true;
  res.json({ result: true, data: { firstLaunchAnswered: true } });
});

demoRouter.post("/reset", (req, res) => {
  const scope = req.body?.scope as ResetScope;
  if (!RESET_SCOPES.includes(scope)) {
    res.status(400).json({ result: false, error: "Invalid reset scope." });
    return;
  }
  resetSession(res.locals.session, scope);
  res.json({ result: true, data: { scope, resetAt: new Date().toISOString() } });
});

export default demoRouter;
