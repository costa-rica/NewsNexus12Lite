"use client";

import { Search, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/form/Input";
import { Label } from "@/components/ui/form/Label";
import { apiClient } from "@/lib/apiClient";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { clearArticles } from "@/store/articlesSlice";
import { cancelRun, clearOrchestration, setPolling } from "@/store/orchestrationSlice";
import { resetAllToDefaults } from "@/store/promptsSlice";
import { setQuery, submitSearch } from "@/store/rssSearchSlice";

export function RssSearchForm() {
  const dispatch = useAppDispatch();
  const { query, isLoading, error, truncated } = useAppSelector((state) => state.rssSearch);
  const runActive = useAppSelector((state) => state.orchestration.status === "running");

  async function resetDemo() {
    if (runActive) {
      await dispatch(cancelRun());
    }
    dispatch(setPolling(false));
    await apiClient.postReset("all");
    dispatch(clearArticles());
    dispatch(clearOrchestration());
    dispatch(resetAllToDefaults());
  }

  return (
    <form
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim()) {
          void dispatch(submitSearch());
        }
      }}
    >
      <div className="grid gap-4">
        <div>
          <Label htmlFor="rss-query">Google RSS Query</Label>
          <Input id="rss-query" value={query} onChange={(event) => dispatch(setQuery(event.target.value))} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isLoading || !query.trim()} startIcon={<Search className="h-4 w-4" />}>
            Search RSS
          </Button>
          <Button variant="outline" type="button" onClick={() => void resetDemo()} startIcon={<RotateCcw className="h-4 w-4" />}>
            Reset Demo
          </Button>
        </div>
        {error ? (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        ) : null}
        {truncated ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-theme-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            Results were limited to 10 articles.
          </div>
        ) : null}
      </div>
    </form>
  );
}
