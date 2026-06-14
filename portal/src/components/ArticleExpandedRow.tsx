"use client";

import { STAGES } from "@/lib/constants";
import { useAppSelector } from "@/hooks/store";
import { ScoreBubble } from "@/components/ScoreBubble";
import type { Article } from "@/types";

export function ArticleExpandedRow({ article }: { article: Article }) {
  const selected = useAppSelector((state) => state.ui.selectedExplanation);

  return (
    <tr>
      <td colSpan={7}>
        <div className="stack">
          <section>
            <h3>Metadata</h3>
            <p>{article.description}</p>
            <p>
              <strong>Source:</strong> {article.source} <strong>Status:</strong> {article.rowStatus}
            </p>
            {article.url ? (
              <a href={article.url} target="_blank" rel="noreferrer">
                Open article
              </a>
            ) : null}
          </section>
          <section className="row">
            {STAGES.map((stage, index) => (
              <span key={stage.key} className={`chip ${article.pipeline[stage.key].status === "running" ? "pulse" : ""}`}>
                {index + 1}. {stage.label}: {article.pipeline[stage.key].status}
              </span>
            ))}
          </section>
          <section className="row">
            <ScoreBubble
              articleId={article.id}
              label="Location Score"
              stage="locationScorer"
              status={article.pipeline.locationScorer.status}
              score={article.pipeline.locationScorer.score ?? article.pipeline.locationScorer.locationScore}
            />
            <span className="chip">{article.pipeline.stateAssigner.assignedState ?? "State pending"}</span>
            <ScoreBubble
              articleId={article.id}
              label="Semantic Score"
              stage="semanticScorer"
              status={article.pipeline.semanticScorer.status}
              score={article.pipeline.semanticScorer.score ?? article.pipeline.semanticScorer.semanticScore}
            />
            <ScoreBubble
              articleId={article.id}
              label="AI Approval"
              stage="aiApprover"
              status={article.pipeline.aiApprover.status}
              score={article.pipeline.aiApprover.score}
            />
          </section>
          {selected?.articleId === article.id ? (
            <section className="notice">
              <h3>{selected.stage}</h3>
              <p>{selected.reasoning ?? selected.finalStatus ?? "No reasoning returned."}</p>
              {selected.confidence !== undefined ? <p>Confidence: {selected.confidence}</p> : null}
              {selected.promptInput ? <pre>{selected.promptInput}</pre> : null}
            </section>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
