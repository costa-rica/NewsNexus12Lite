import type { Article, PipelineStageResult, StateAssignerPrompts } from "../../types";
import { getMockFixture, waitForMockDelay } from "../mockFixtures";

export async function runStateAssigner(
  article: Article,
  prompts: StateAssignerPrompts,
  mode: "mock" | "live",
  articleIndex = 0
): Promise<PipelineStageResult> {
  if (mode === "live" && !process.env.AI_API_KEY) {
    return { status: "failed", error: "AI_API_KEY is required for live state assignment" };
  }

  await waitForMockDelay();
  const fixture = getMockFixture(articleIndex);
  return {
    status: "complete",
    assignedState: fixture.assignedState ?? undefined,
    confidence: fixture.assignedState ? 0.86 : 0.41,
    reasoning: fixture.assignedState
      ? `Assigned ${fixture.assignedState} from Lite fixture geography cues for "${article.title}".`
      : "No confident US state assignment was found in the Lite fixture.",
    promptInput: prompts.assignmentPrompt,
    promptOutput: { assignedState: fixture.assignedState }
  };
}
