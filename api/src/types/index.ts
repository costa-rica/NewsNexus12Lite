export type StageName =
  | "scraping"
  | "locationScorer"
  | "stateAssigner"
  | "semanticScorer"
  | "aiApprover";

export type StageStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped";

export type RunStatus = "running" | "complete" | "failed" | "cancelled";

export type ResetScope =
  | "all"
  | "articles"
  | "prompts"
  | "approverPrompts"
  | "stateAssignerPrompts";

export type ArticleRowStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "cancelled"
  | "skipped";

export type HazardType = "chemical" | "wildfire" | "severeWeather";

export interface PipelineStageResult {
  status: StageStatus;
  scrapingSource?: string;
  body?: string;
  scrapedAt?: string;
  locationScore?: number;
  semanticScore?: number;
  score?: number;
  assignedState?: string;
  confidence?: number;
  reasoning?: string;
  explanation?: string;
  promptInput?: string;
  promptOutput?: unknown;
  gateway?: GatewayResult;
  hazards?: HazardResult[];
  finalStatus?: FinalApprovalStatus;
  finalReasoning?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Article {
  id: string;
  title: string;
  source: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  rowStatus: ArticleRowStatus;
  pipeline: Record<StageName, PipelineStageResult>;
}

export interface ArticleSnapshot {
  id: string;
  title: string;
  source: string;
  rowStatus: ArticleRowStatus;
  pipeline: Record<StageName, PipelineStageResult>;
}

export type FinalApprovalStatus =
  | "approved"
  | "rejected"
  | "needs_review"
  | "failed";

export interface GatewayResult {
  status: "complete" | "failed";
  isRelevant?: boolean;
  confidence?: number;
  reasoning?: string;
  promptInput?: string;
  promptOutput?: unknown;
  error?: string;
}

export interface HazardResult {
  hazardType: HazardType;
  status: "complete" | "failed";
  score?: number;
  confidence?: number;
  reasoning?: string;
  promptInput?: string;
  promptOutput?: unknown;
  error?: string;
}

export interface ApproverPrompts {
  gatewayPrompt: string;
  hazardPrompts: Record<HazardType, string>;
}

export interface StateAssignerPrompts {
  assignmentPrompt: string;
}

export interface PromptConfiguration {
  approver: ApproverPrompts;
  stateAssigner: {
    assignmentPrompt: string;
    supportingDetails?: unknown;
  };
  updatedAt?: string;
}

export interface SessionObject {
  sessionId: string;
  firstLaunchAnswered: boolean;
  articles: Article[];
  promptState: PromptConfiguration;
  activeRunId: string | null;
  createdAt: string;
  lastAccessedAt: string;
}

export interface PipelineRun {
  runId: string;
  sessionId: string;
  articleIds: string[];
  status: RunStatus;
  cancellationRequested: boolean;
  currentStage: StageName | null;
  stageStatuses: Record<StageName, StageStatus>;
  articleProgress: Record<
    string,
    {
      completedStages: number;
      totalStages: number;
      status: StageStatus;
    }
  >;
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
}
