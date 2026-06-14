"use client";

import { Search, RotateCcw } from "lucide-react";

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
      className="toolbar stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim()) {
          void dispatch(submitSearch());
        }
      }}
    >
      <label>
        Google RSS Query
        <input className="input" value={query} onChange={(event) => dispatch(setQuery(event.target.value))} />
      </label>
      <div className="row">
        <button className="btn primary" type="submit" disabled={isLoading || !query.trim()}>
          <Search size={16} /> Search RSS
        </button>
        <button className="btn" type="button" onClick={() => void resetDemo()}>
          <RotateCcw size={16} /> Reset Demo
        </button>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      {truncated ? <div className="notice">Results were limited to 10 articles.</div> : null}
    </form>
  );
}
