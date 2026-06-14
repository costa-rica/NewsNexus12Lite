import type { Article, PipelineStageResult } from "../../types";
import { getMockFixture, waitForMockDelay } from "../mockFixtures";

export async function runLocationScorer(
  article: Article,
  _prompts: null,
  mode: "mock" | "live",
  articleIndex = 0
): Promise<PipelineStageResult> {
  if (mode === "live" && !process.env.AI_API_KEY) {
    return { status: "failed", error: "AI_API_KEY is required for live location scoring" };
  }

  await waitForMockDelay();
  const fixture = getMockFixture(articleIndex);
  return {
    status: "complete",
    locationScore: fixture.locationScore,
    score: fixture.locationScore,
    confidence: Math.min(0.98, fixture.locationScore + 0.05),
    reasoning: `Location relevance for "${article.title}" scored from the Lite mock fixture.`,
    promptInput: "Internal Lite location scorer prompt.",
    promptOutput: { score: fixture.locationScore }
  };
}
