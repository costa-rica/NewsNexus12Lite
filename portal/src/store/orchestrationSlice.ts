import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { apiClient, RateLimitError } from "@/lib/apiClient";
import { SNAPSHOT_INTERVAL_MS, STAGES } from "@/lib/constants";
import { updateArticleFromSnapshot } from "@/store/articlesSlice";
import type { RootState } from "@/store";
import { addToast } from "@/store/uiSlice";
import type { RunSnapshot, RunStatus, StageName, StageStatus } from "@/types";

const emptyStageStatuses = Object.fromEntries(STAGES.map((stage) => [stage.key, "pending"])) as Record<StageName, StageStatus>;

export interface OrchestrationState {
  runId: string | null;
  status: RunStatus | null;
  currentStage: StageName | null;
  stageStatuses: Record<StageName, StageStatus>;
  overallProgress: number;
  isPolling: boolean;
  pollError: string | null;
  pollFailureCount: number;
  cancellationPending: boolean;
  lastUpdatedAt: string | null;
}

const initialState: OrchestrationState = {
  runId: null,
  status: null,
  currentStage: null,
  stageStatuses: emptyStageStatuses,
  overallProgress: 0,
  isPolling: false,
  pollError: null,
  pollFailureCount: 0,
  cancellationPending: false,
  lastUpdatedAt: null
};

export const startSnapshotPolling = createAsyncThunk<void, string, { state: RootState }>(
  "orchestration/startPolling",
  async (runId, { dispatch, getState }) => {
    if (getState().orchestration.isPolling) {
      return;
    }
    dispatch(setPolling(true));
    let delay = SNAPSHOT_INTERVAL_MS;
    let active = true;
    while (active) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const current = getState().orchestration;
      if (!current.isPolling || current.runId !== runId) {
        return;
      }
      try {
        const snapshot = await apiClient.getRunSnapshot(runId);
        const latest = getState().orchestration;
        if (snapshot.run.runId !== latest.runId) {
          continue;
        }
        dispatch(updateFromSnapshot(snapshot.run));
        for (const article of snapshot.articles) {
          dispatch(updateArticleFromSnapshot(article));
        }
        dispatch(resetPollFailure());
        delay = SNAPSHOT_INTERVAL_MS;
        if (["complete", "failed", "cancelled"].includes(snapshot.run.status)) {
          dispatch(setPolling(false));
          active = false;
        }
      } catch (error) {
        dispatch(incrementPollFailure());
        const message =
          error instanceof RateLimitError
            ? `Too many requests - please wait before trying again.${error.retryAfter ? ` Retry after ${error.retryAfter}s.` : ""}`
            : error instanceof Error
              ? error.message
              : "Snapshot polling failed.";
        dispatch(setPollError(message));
        const failures = getState().orchestration.pollFailureCount;
        if (failures >= 3 || error instanceof RateLimitError) {
          dispatch(addToast({ tone: error instanceof RateLimitError ? "rate-limit" : "error", message }));
          delay = Math.min(delay * 2, 30000);
        }
      }
    }
  }
);

export const startRun = createAsyncThunk<void, void, { state: RootState }>(
  "orchestration/startRun",
  async (_arg, { dispatch, getState }) => {
    const articleIds = getState().articles.items.map((article) => article.id);
    const response = await apiClient.postOrchestrationRun({ articleIds });
    dispatch(setRun({ runId: response.runId, status: response.status }));
    dispatch(startSnapshotPolling(response.runId));
  }
);

export const cancelRun = createAsyncThunk<void, void, { state: RootState }>(
  "orchestration/cancelRun",
  async (_arg, { dispatch, getState }) => {
    const runId = getState().orchestration.runId;
    if (!runId) {
      return;
    }
    const response = await apiClient.postCancelRun(runId);
    dispatch(setCancellationPending(response.cancellationPending));
    if (response.status !== "running") {
      dispatch(setPolling(false));
    }
  }
);

export const orchestrationSlice = createSlice({
  name: "orchestration",
  initialState,
  reducers: {
    setRun: (state, action: PayloadAction<{ runId: string; status: RunStatus }>) => {
      state.runId = action.payload.runId;
      state.status = action.payload.status;
      state.currentStage = null;
      state.stageStatuses = { ...emptyStageStatuses };
      state.overallProgress = 0;
      state.cancellationPending = false;
    },
    updateFromSnapshot: (state, action: PayloadAction<RunSnapshot["run"]>) => {
      state.runId = action.payload.runId;
      state.status = action.payload.status;
      state.currentStage = action.payload.currentStage;
      state.stageStatuses = action.payload.stageStatuses;
      state.overallProgress = action.payload.overallProgress;
      state.cancellationPending = action.payload.cancellationPending;
      state.lastUpdatedAt = new Date().toISOString();
    },
    setPolling: (state, action: PayloadAction<boolean>) => {
      state.isPolling = action.payload;
    },
    setPollError: (state, action: PayloadAction<string | null>) => {
      state.pollError = action.payload;
    },
    incrementPollFailure: (state) => {
      state.pollFailureCount += 1;
    },
    resetPollFailure: (state) => {
      state.pollFailureCount = 0;
      state.pollError = null;
    },
    setCancellationPending: (state, action: PayloadAction<boolean>) => {
      state.cancellationPending = action.payload;
    },
    clearOrchestration: () => initialState
  }
});

export const {
  clearOrchestration,
  incrementPollFailure,
  resetPollFailure,
  setCancellationPending,
  setPollError,
  setPolling,
  setRun,
  updateFromSnapshot
} = orchestrationSlice.actions;
export default orchestrationSlice.reducer;
