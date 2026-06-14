import axios from "axios";

import type { Article, PipelineStageResult } from "../../types";
import { waitForMockDelay } from "../mockFixtures";

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function runScraping(
  article: Article,
  _prompts: null,
  mode: "mock" | "live",
  articleIndex = 0
): Promise<PipelineStageResult> {
  void articleIndex;
  if (mode === "mock") {
    await waitForMockDelay();
    return {
      status: "complete",
      scrapingSource: "fixture",
      body: article.description ?? "",
      scrapedAt: new Date().toISOString(),
      reasoning: "Mock scraping used the fixture article description."
    };
  }

  try {
    const response = await axios.get(article.url ?? "", { timeout: 10000 });
    const body = stripHtml(String(response.data ?? ""));
    if (!body) {
      return { status: "failed", error: "Scraping failed: empty body" };
    }

    return {
      status: "complete",
      scrapingSource: article.url,
      body,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return { status: "failed", error: `Scraping failed: ${message}` };
  }
}
