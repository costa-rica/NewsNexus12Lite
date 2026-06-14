import { Router } from "express";

import { getDefaultPrompts, promptGroupIsDefault } from "../services/defaultPrompts";
import type { ApproverPrompts, StateAssignerPrompts } from "../types";

export const promptsRouter = Router();

function isApproverPrompts(value: unknown): value is ApproverPrompts {
  const prompts = value as ApproverPrompts;
  return (
    typeof prompts?.gatewayPrompt === "string" &&
    typeof prompts.hazardPrompts?.chemical === "string" &&
    typeof prompts.hazardPrompts?.wildfire === "string" &&
    typeof prompts.hazardPrompts?.severeWeather === "string"
  );
}

function isStateAssignerPrompts(value: unknown): value is StateAssignerPrompts {
  return typeof (value as StateAssignerPrompts)?.assignmentPrompt === "string";
}

promptsRouter.get("/", (_req, res) => {
  const defaults = getDefaultPrompts();
  res.json({
    result: true,
    data: {
      defaults,
      prompts: res.locals.session.promptState,
      isDefault: {
        approver: promptGroupIsDefault(res.locals.session.promptState, defaults, "approver"),
        stateAssigner: promptGroupIsDefault(res.locals.session.promptState, defaults, "stateAssigner")
      }
    }
  });
});

promptsRouter.put("/", (req, res) => {
  const scope = req.body?.scope;
  if (scope === "approver") {
    if (!isApproverPrompts(req.body.prompts)) {
      res.status(400).json({ result: false, error: "Invalid approver prompt shape." });
      return;
    }
    res.locals.session.promptState.approver = req.body.prompts;
  } else if (scope === "stateAssigner") {
    if (!isStateAssignerPrompts(req.body.prompts)) {
      res.status(400).json({ result: false, error: "Invalid state assigner prompt shape." });
      return;
    }
    res.locals.session.promptState.stateAssigner = {
      ...res.locals.session.promptState.stateAssigner,
      assignmentPrompt: req.body.prompts.assignmentPrompt
    };
  } else {
    res.status(400).json({ result: false, error: "Invalid prompt scope." });
    return;
  }

  res.json({ result: true, data: { scope, updatedAt: new Date().toISOString() } });
});

export default promptsRouter;
