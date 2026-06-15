"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LoadingDots } from "@/components/ui/LoadingDots";
import { Modal } from "@/components/ui/modal/Modal";
import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { closeDescriptionModal } from "@/store/uiSlice";
import type { Article } from "@/types";

type ScrapedArticle = Article & {
  pipeline: Article["pipeline"] & {
    scraping?: {
      status?: string;
      body?: string;
      scrapingSource?: string;
      scrapedAt?: string;
    };
  };
};

export function DescriptionModal() {
  const dispatch = useAppDispatch();
  const articleId = useAppSelector((state) => state.ui.descriptionModalArticleId);
  const articles = useAppSelector((state) => state.articles.items);
  const fallbackArticle = useMemo(() => articles.find((article) => article.id === articleId), [articleId, articles]);
  const scrapingStatus = fallbackArticle?.pipeline.scraping.status;
  const [fetchedArticle, setFetchedArticle] = useState<ScrapedArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchArticle(openArticleId: string) {
      setIsLoading(true);
      try {
        const response = await apiClient.getArticle(openArticleId);
        if (!cancelled) {
          const article = (response as { article?: unknown }).article;
          setFetchedArticle(article && typeof article === "object" ? (article as ScrapedArticle) : null);
        }
      } catch {
        if (!cancelled) {
          setFetchedArticle(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (articleId) {
      void fetchArticle(articleId);
    }

    return () => {
      cancelled = true;
    };
  }, [articleId, scrapingStatus]);

  const currentFetchedArticle = fetchedArticle?.id === articleId ? fetchedArticle : null;
  const scraped = currentFetchedArticle?.pipeline.scraping;
  const body = scraped?.body || fallbackArticle?.description || "No description available.";
  const sourceUrl = scraped?.scrapingSource || fallbackArticle?.url;
  const source = currentFetchedArticle?.source || fallbackArticle?.source;
  const title = currentFetchedArticle?.title || fallbackArticle?.title || "Article Description";

  return (
    <Modal isOpen={Boolean(articleId)} onClose={() => dispatch(closeDescriptionModal())} titleId="description-modal-title">
      <div className="grid max-h-[calc(100vh-2rem)] gap-5 overflow-y-auto p-6 pr-14">
        <div>
          <h2 id="description-modal-title" className="text-title-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          {source ? <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{source}</p> : null}
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-theme-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <LoadingDots /> Fetching full article...
          </div>
        ) : null}
        <article className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-theme-sm leading-6 text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
          {body}
        </article>
        <div className="flex flex-wrap items-center gap-3 text-theme-sm">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              Open article <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
          {scraped?.scrapedAt ? <span className="text-gray-500 dark:text-gray-400">Scraped at {scraped.scrapedAt}</span> : null}
        </div>
      </div>
    </Modal>
  );
}
