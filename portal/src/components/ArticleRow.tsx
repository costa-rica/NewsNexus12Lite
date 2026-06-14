"use client";

import { Info } from "lucide-react";

import { ArticleExpandedRow } from "@/components/ArticleExpandedRow";
import { ScoreBubble } from "@/components/ScoreBubble";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleExpanded } from "@/store/articlesSlice";
import type { Article } from "@/types";

export function ArticleRow({ article }: { article: Article }) {
  const dispatch = useAppDispatch();
  const expanded = useAppSelector((state) => state.articles.expandedIds.includes(article.id));

  return (
    <>
      <tr onClick={() => dispatch(toggleExpanded(article.id))}>
        <td>
          <span className={`chip ${article.rowStatus === "failed" ? "bad" : "pending"}`}>{article.rowStatus}</span>{" "}
          {article.title}
        </td>
        <td>{article.source}</td>
        <td>
          <button
            className="btn"
            type="button"
            aria-label="Show description"
            onClick={(event) => event.stopPropagation()}
            title={article.description}
          >
            <Info size={16} />
          </button>
        </td>
        <td>
          <ScoreBubble
            articleId={article.id}
            label="Location Score"
            stage="locationScorer"
            status={article.pipeline.locationScorer.status}
            score={article.pipeline.locationScorer.score ?? article.pipeline.locationScorer.locationScore}
          />
        </td>
        <td>{article.pipeline.stateAssigner.assignedState ?? "-"}</td>
        <td>
          <ScoreBubble
            articleId={article.id}
            label="Semantic Score"
            stage="semanticScorer"
            status={article.pipeline.semanticScorer.status}
            score={article.pipeline.semanticScorer.score ?? article.pipeline.semanticScorer.semanticScore}
          />
        </td>
        <td>{article.pipeline.aiApprover.finalStatus ?? article.pipeline.aiApprover.status}</td>
      </tr>
      {expanded ? <ArticleExpandedRow article={article} /> : null}
    </>
  );
}
