import { API_BASE_URL } from "@/lib/constants";
import type { Article, PromptConfiguration, PromptScope, ResetScope, RunSnapshot, StageName } from "@/types";

type ApiResponse<T> = { result: true; data: T } | { result: false; error: string };

export class RateLimitError extends Error {
  retryAfter: string | null;

  constructor(message: string, retryAfter: string | null) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const retryAfter = response.headers.get("Retry-After");
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (response.status === 429) {
    throw new RateLimitError("Too many requests - please wait before trying again.", retryAfter);
  }
  if (!response.ok || !body?.result) {
    throw new Error(body && "error" in body ? body.error : `Request failed with ${response.status}`);
  }
  return body.data;
}

export const apiClient = {
  getSession: () =>
    request<{
      session: { sessionId: string; firstLaunchAnswered: boolean };
      articles: unknown[];
      activeRunId: string | null;
      promptState: PromptConfiguration;
      promptIsDefault: { approver: boolean; stateAssigner: boolean };
    }>("/api/demo/session"),
  postFirstLaunch: (isFirstTime: boolean) =>
    request<{ firstLaunchAnswered: boolean }>("/api/demo/first-launch", {
      method: "POST",
      body: JSON.stringify({ isFirstTime })
    }),
  postReset: (scope: ResetScope) =>
    request<{ scope: ResetScope; resetAt: string }>("/api/demo/reset", {
      method: "POST",
      body: JSON.stringify({ scope })
    }),
  postRssSearch: (params: { query: string; language?: string; region?: string }) =>
    request<{ articles: Article[]; truncated: boolean; query: string }>("/api/rss/search", {
      method: "POST",
      body: JSON.stringify(params)
    }),
  postOrchestrationRun: (params: { articleIds: string[]; mode?: "mock" | "live" }) =>
    request<{ runId: string; status: "running" }>("/api/orchestration/runs", {
      method: "POST",
      body: JSON.stringify(params)
    }),
  getRunStatus: (runId: string) => request<{ run: unknown }>(`/api/orchestration/runs/${runId}`),
  getRunSnapshot: (runId: string) =>
    request<RunSnapshot>(`/api/orchestration/runs/${runId}/snapshot`),
  postCancelRun: (runId: string) =>
    request<{ runId: string; status: string; cancellationPending: boolean }>(
      `/api/orchestration/runs/${runId}/cancel`,
      { method: "POST" }
    ),
  getArticle: (articleId: string) => request<{ article: unknown }>(`/api/articles/${articleId}`),
  getExplanation: (articleId: string, stage: StageName) =>
    request<Record<string, unknown>>(`/api/articles/${articleId}/explanations/${stage}`),
  getPrompts: () =>
    request<{
      defaults: PromptConfiguration;
      prompts: PromptConfiguration;
      isDefault: { approver: boolean; stateAssigner: boolean };
    }>("/api/prompts"),
  putPrompts: (scope: PromptScope, prompts: unknown) =>
    request<{ scope: PromptScope; updatedAt: string }>("/api/prompts", {
      method: "PUT",
      body: JSON.stringify({ scope, prompts })
    })
};
