import { randomUUID } from "node:crypto";
import axios from "axios";
import { Router } from "express";
import { parseStringPromise } from "xml2js";

import { ArticleFixture } from "../models";
import { normalizeArticle } from "../services/constants";
import type { Article } from "../types";

export const rssRouter = Router();

const DEFAULT_ARTICLE_LIMIT_GOOGLE_RSS_SEARCH = 10;
const MIN_ARTICLE_LIMIT_GOOGLE_RSS_SEARCH = 1;
const MAX_ARTICLE_LIMIT_GOOGLE_RSS_SEARCH = 10;

const FALLBACK_FIXTURES = [
  ["Chemical plume prompts shelter in place", "Demo Wire", "Officials issued a shelter-in-place order after a chemical release near a Texas plant."],
  ["Wildfire evacuation expands", "Demo Local", "Crews expanded evacuation zones as a wildfire moved toward homes in California."],
  ["Severe storms damage homes", "Demo Weather", "Severe storms produced damaging winds and flash flooding across Florida."],
  ["Warehouse spill contained", "Demo Safety", "A warehouse chemical spill was contained after first responders closed nearby roads."],
  ["School science fair opens", "Demo Community", "Students presented projects at a local science fair with no reported safety incident."]
] as const;

function mode(): "mock" | "live" {
  return process.env.PIPELINE_MODE === "live" ? "live" : "mock";
}

function googleRssSearchArticleLimit(): number {
  const parsed = Number.parseInt(process.env.ARTICLE_LIMIT_GOOGLE_RSS_SEARCH ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ARTICLE_LIMIT_GOOGLE_RSS_SEARCH;
  }
  return Math.min(
    MAX_ARTICLE_LIMIT_GOOGLE_RSS_SEARCH,
    Math.max(MIN_ARTICLE_LIMIT_GOOGLE_RSS_SEARCH, parsed)
  );
}

async function mockArticles(limit: number): Promise<{ articles: Article[]; truncated: boolean }> {
  try {
    const fixtures = await ArticleFixture.findAndCountAll({ limit, order: [["createdAt", "ASC"]] });
    if (fixtures.rows.length > 0) {
      return {
        articles: fixtures.rows.map((fixture) =>
          normalizeArticle({
            id: fixture.id,
            title: fixture.title,
            source: fixture.source,
            description: fixture.description,
            url: fixture.url,
            publishedAt: fixture.publishedAt
          })
        ),
        truncated: fixtures.count > limit
      };
    }
  } catch {
    // Fall through to hard-coded fixtures when a local DB is not available.
  }

  return {
    articles: FALLBACK_FIXTURES.slice(0, limit).map(([title, source, description]) =>
      normalizeArticle({
        id: randomUUID(),
        title,
        source,
        description,
        url: "https://example.com/newsnexus12lite-fixture",
        publishedAt: new Date().toISOString()
      })
    ),
    truncated: FALLBACK_FIXTURES.length > limit
  };
}

async function liveArticles(query: string, limit: number, language = "en-US", region = "US"): Promise<{ articles: Article[]; truncated: boolean }> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${language}&gl=${region}&ceid=${region}:${language.split("-")[0]}`;
  const response = await axios.get(url, { timeout: 10000, validateStatus: (status) => status === 200 });
  const parsed = await parseStringPromise(response.data);
  const items = (parsed?.rss?.channel?.[0]?.item ?? []) as Array<Record<string, unknown[]>>;
  const rawArticles = items.map((item) =>
    normalizeArticle({
      id: randomUUID(),
      title: String(item.title?.[0] ?? "Untitled article"),
      source: String((item.source?.[0] as { _?: string } | undefined)?._ ?? "Google News"),
      description: String(item.description?.[0] ?? ""),
      url: String(item.link?.[0] ?? ""),
      publishedAt: item.pubDate?.[0] ? new Date(String(item.pubDate[0])).toISOString() : undefined
    })
  );
  return { articles: rawArticles.slice(0, limit), truncated: rawArticles.length > limit };
}

rssRouter.post("/search", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    res.status(400).json({ result: false, error: "query is required." });
    return;
  }

  try {
    const articleLimit = googleRssSearchArticleLimit();
    const result =
      mode() === "mock"
        ? await mockArticles(articleLimit)
        : await liveArticles(query, articleLimit, req.body.language, req.body.region);
    res.locals.session.articles = result.articles;
    res.locals.session.activeRunId = null;
    res.json({ result: true, data: { articles: result.articles, truncated: result.truncated, query } });
  } catch {
    res.status(502).json({ result: false, error: "RSS feed unavailable" });
  }
});

export default rssRouter;
