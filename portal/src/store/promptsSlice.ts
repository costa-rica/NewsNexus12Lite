import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { apiClient } from "@/lib/apiClient";
import type { PromptConfiguration, PromptScope } from "@/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isModified(
  defaults: PromptConfiguration | null,
  session: PromptConfiguration | null,
  scope: PromptScope
): boolean {
  if (!defaults || !session) {
    return false;
  }
  return JSON.stringify(defaults[scope]) !== JSON.stringify(session[scope]);
}

interface PromptsState {
  defaults: PromptConfiguration | null;
  session: PromptConfiguration | null;
  drafts: PromptConfiguration | null;
  hasUnsavedChanges: Record<PromptScope, boolean>;
  isSessionModified: Record<PromptScope, boolean>;
  validationErrors: Record<string, string>;
}

const initialState: PromptsState = {
  defaults: null,
  session: null,
  drafts: null,
  hasUnsavedChanges: { approver: false, stateAssigner: false },
  isSessionModified: { approver: false, stateAssigner: false },
  validationErrors: {}
};

export const loadPrompts = createAsyncThunk("prompts/load", async () => apiClient.getPrompts());
export const applyPrompts = createAsyncThunk(
  "prompts/apply",
  async (scope: PromptScope, { getState }) => {
    const state = getState() as { prompts: PromptsState };
    const prompts = state.prompts.drafts?.[scope];
    await apiClient.putPrompts(scope, prompts);
    return scope;
  }
);

export const promptsSlice = createSlice({
  name: "prompts",
  initialState,
  reducers: {
    setDefaults: (state, action: PayloadAction<PromptConfiguration>) => {
      state.defaults = action.payload;
    },
    setSessionPrompts: (state, action: PayloadAction<PromptConfiguration>) => {
      state.session = action.payload;
      state.drafts = clone(action.payload);
    },
    setDraftPrompts: (state, action: PayloadAction<PromptConfiguration>) => {
      state.drafts = action.payload;
    },
    updateApproverDraft: (state, action: PayloadAction<PromptConfiguration["approver"]>) => {
      if (state.drafts) {
        state.drafts.approver = action.payload;
        state.hasUnsavedChanges.approver = true;
      }
    },
    updateStateAssignerDraft: (state, action: PayloadAction<string>) => {
      if (state.drafts) {
        state.drafts.stateAssigner.assignmentPrompt = action.payload;
        state.hasUnsavedChanges.stateAssigner = true;
      }
    },
    markUnsavedChanges: (state, action: PayloadAction<PromptScope>) => {
      state.hasUnsavedChanges[action.payload] = true;
    },
    markApplied: (state, action: PayloadAction<PromptScope>) => {
      if (state.session && state.drafts) {
        state.session[action.payload] = clone(state.drafts[action.payload]) as never;
        state.hasUnsavedChanges[action.payload] = false;
        state.isSessionModified[action.payload] = isModified(state.defaults, state.session, action.payload);
      }
    },
    resetPromptGroup: (state, action: PayloadAction<PromptScope>) => {
      if (state.defaults && state.session && state.drafts) {
        state.session[action.payload] = clone(state.defaults[action.payload]) as never;
        state.drafts[action.payload] = clone(state.defaults[action.payload]) as never;
        state.hasUnsavedChanges[action.payload] = false;
        state.isSessionModified[action.payload] = false;
      }
    },
    resetAllToDefaults: (state) => {
      if (state.defaults) {
        state.session = clone(state.defaults);
        state.drafts = clone(state.defaults);
      }
      state.hasUnsavedChanges = { approver: false, stateAssigner: false };
      state.isSessionModified = { approver: false, stateAssigner: false };
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadPrompts.fulfilled, (state, action) => {
      state.defaults = action.payload.defaults;
      state.session = action.payload.prompts;
      state.drafts = clone(action.payload.prompts);
      state.isSessionModified = {
        approver: !action.payload.isDefault.approver,
        stateAssigner: !action.payload.isDefault.stateAssigner
      };
    });
    builder.addCase(applyPrompts.fulfilled, (state, action) => {
      promptsSlice.caseReducers.markApplied(state, { type: "prompts/markApplied", payload: action.payload });
    });
  }
});

export const {
  markApplied,
  markUnsavedChanges,
  resetAllToDefaults,
  resetPromptGroup,
  setDefaults,
  setDraftPrompts,
  setSessionPrompts,
  updateApproverDraft,
  updateStateAssignerDraft
} = promptsSlice.actions;
export default promptsSlice.reducer;
