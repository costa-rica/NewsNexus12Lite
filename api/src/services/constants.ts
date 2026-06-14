import type { Article, PipelineStageResult, StageName, StageStatus } from "../types";

export const STAGE_NAMES: StageName[] = [
  "scraping",
  "locationScorer",
  "stateAssigner",
  "semanticScorer",
  "aiApprover"
];

export const EMPTY_STAGE_STATUSES: Record<StageName, StageStatus> = {
  scraping: "pending",
  locationScorer: "pending",
  stateAssigner: "pending",
  semanticScorer: "pending",
  aiApprover: "pending"
};

export function createEmptyPipeline(): Record<StageName, PipelineStageResult> {
  return {
    scraping: { status: "pending" },
    locationScorer: { status: "pending" },
    stateAssigner: { status: "pending" },
    semanticScorer: { status: "pending" },
    aiApprover: { status: "pending" }
  };
}

export function cloneStageStatuses(): Record<StageName, StageStatus> {
  return { ...EMPTY_STAGE_STATUSES };
}

export function normalizeArticle(input: {
  id: string;
  title: string;
  source: string;
  description?: string;
  url?: string;
  publishedAt?: string | Date | null;
}): Article {
  return {
    id: input.id,
    title: input.title,
    source: input.source,
    description: input.description ?? "",
    url: input.url ?? "",
    publishedAt:
      input.publishedAt instanceof Date
        ? input.publishedAt.toISOString()
        : (input.publishedAt ?? undefined),
    rowStatus: "pending",
    pipeline: createEmptyPipeline()
  };
}
