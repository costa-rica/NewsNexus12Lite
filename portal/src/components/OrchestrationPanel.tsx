"use client";

import { Play, Square } from "lucide-react";

import { STAGES } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { cancelRun, startRun } from "@/store/orchestrationSlice";

export function OrchestrationPanel() {
  const dispatch = useAppDispatch();
  const articles = useAppSelector((state) => state.articles.items);
  const orchestration = useAppSelector((state) => state.orchestration);
  const active = orchestration.status === "running";

  return (
    <aside className="panel stack">
      <h2>Orchestration</h2>
      <div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span>Overall progress</span>
          <strong>{orchestration.overallProgress}%</strong>
        </div>
        <progress value={orchestration.overallProgress} max={100} style={{ width: "100%" }} />
      </div>
      <p>Current: {orchestration.currentStage ?? "Not running"}</p>
      <div className="stack">
        {STAGES.map((stage, index) => (
          <div key={stage.key} className={`row chip ${orchestration.stageStatuses[stage.key] === "running" ? "pulse" : ""}`}>
            {index + 1}. {stage.label}: {orchestration.stageStatuses[stage.key]}
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" type="button" disabled={articles.length === 0 || active} onClick={() => void dispatch(startRun())}>
          <Play size={16} /> Start Run
        </button>
        {orchestration.runId && active ? (
          <button
            className="btn danger"
            type="button"
            disabled={orchestration.cancellationPending}
            onClick={() => void dispatch(cancelRun())}
          >
            <Square size={16} /> {orchestration.cancellationPending ? "Cancelling..." : "Stop Run"}
          </button>
        ) : null}
      </div>
      {orchestration.pollError ? <div className="notice error">{orchestration.pollError}</div> : null}
      {orchestration.status === "cancelled" ? <div className="notice">Cancelled</div> : null}
    </aside>
  );
}
