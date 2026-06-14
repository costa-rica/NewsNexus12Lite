import type {
  ApproverPrompts,
  Article,
  FinalApprovalStatus,
  GatewayResult,
  HazardResult,
  HazardType,
  PipelineStageResult
} from "../../types";
import { getMockFixture, waitForMockDelay } from "../mockFixtures";

const HAZARD_TYPES: HazardType[] = ["chemical", "wildfire", "severeWeather"];

function normalizeFinal(gateway: GatewayResult, hazards: HazardResult[]): FinalApprovalStatus {
  if (gateway.status === "failed") {
    return "failed";
  }
  if (gateway.isRelevant === false) {
    return "rejected";
  }
  if (hazards.some((hazard) => hazard.status === "complete" && (hazard.score ?? 0) >= 0.8)) {
    return "approved";
  }
  if (hazards.some((hazard) => hazard.status === "failed")) {
    return "needs_review";
  }
  if (hazards.some((hazard) => hazard.status === "complete" && (hazard.score ?? 0) >= 0.5)) {
    return "needs_review";
  }
  return "rejected";
}

async function runHazard(
  hazardType: HazardType,
  promptInput: string,
  score: number
): Promise<HazardResult> {
  await waitForMockDelay();
  return {
    hazardType,
    status: "complete",
    score,
    confidence: Math.min(0.96, score + 0.05),
    reasoning: `${hazardType} hazard scored by the Lite mock approver.`,
    promptInput,
    promptOutput: { score }
  };
}

export async function runAiApprover(
  article: Article,
  prompts: ApproverPrompts,
  mode: "mock" | "live",
  articleIndex = 0
): Promise<PipelineStageResult> {
  if (mode === "live" && !process.env.AI_API_KEY) {
    return {
      status: "failed",
      finalStatus: "failed",
      error: "AI_API_KEY is required for live AI approval"
    };
  }

  await waitForMockDelay();
  const fixture = getMockFixture(articleIndex);
  const gateway: GatewayResult = {
    status: "complete",
    isRelevant: fixture.gatewayRelevant,
    confidence: fixture.gatewayRelevant ? 0.9 : 0.84,
    reasoning: fixture.gatewayRelevant
      ? `Gateway found "${article.title}" relevant to the Lite hazard demo.`
      : `Gateway rejected "${article.title}" as not relevant to the Lite hazard demo.`,
    promptInput: prompts.gatewayPrompt,
    promptOutput: { isRelevant: fixture.gatewayRelevant }
  };

  if (!fixture.gatewayRelevant) {
    return {
      status: "complete",
      gateway,
      hazards: [],
      finalStatus: "rejected",
      finalReasoning: "Gateway rejected the article, so hazard prompts were skipped."
    };
  }

  const baseScores: Record<HazardType, number> = {
    chemical: fixture.finalApproval === "approved" ? 0.86 : fixture.finalApproval === "needs_review" ? 0.62 : 0.28,
    wildfire: fixture.finalApproval === "approved" ? 0.81 : 0.34,
    severeWeather: fixture.finalApproval === "needs_review" ? 0.58 : 0.31
  };

  const settled = await Promise.allSettled(
    HAZARD_TYPES.map((hazardType) =>
      runHazard(hazardType, prompts.hazardPrompts[hazardType], baseScores[hazardType])
    )
  );
  const hazards = settled.map((result, index): HazardResult => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const hazardType = HAZARD_TYPES[index];
    return {
      hazardType,
      status: "failed",
      error: result.reason instanceof Error ? result.reason.message : "Hazard prompt failed",
      promptInput: prompts.hazardPrompts[hazardType]
    };
  });
  const finalStatus = normalizeFinal(gateway, hazards);

  return {
    status: "complete",
    gateway,
    hazards,
    finalStatus,
    score: finalStatus === "approved" ? 1 : finalStatus === "needs_review" ? 0.6 : 0.1,
    finalReasoning: `Lite approver normalized hazard outputs to ${finalStatus}.`
  };
}
