import type { Article, PipelineStageResult } from "../../types";
import { getMockFixture, waitForMockDelay } from "../mockFixtures";

export async function runSemanticScorer(
  article: Article,
  _prompts: null,
  mode: "mock" | "live",
  articleIndex = 0
): Promise<PipelineStageResult> {
  if (mode === "live" && !process.env.AI_API_KEY) {
    return { status: "failed", error: "AI_API_KEY is required for live semantic scoring" };
  }

  await waitForMockDelay();
  const fixture = getMockFixture(articleIndex);
  return {
    status: "complete",
    semanticScore: fixture.semanticScore,
    score: fixture.semanticScore,
    confidence: Math.min(0.97, fixture.semanticScore + 0.04),
    reasoning: `Semantic hazard relevance for "${article.title}" scored from the Lite mock fixture.`,
    promptInput: "Internal Lite semantic scorer prompt.",
    promptOutput: { score: fixture.semanticScore }
  };
}
