import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { apiClient } from "@/lib/apiClient";

export interface SessionState {
  sessionId: string | null;
  firstLaunchAnswered: boolean;
  lastResetAt: string | null;
}

const initialState: SessionState = {
  sessionId: null,
  firstLaunchAnswered: false,
  lastResetAt: null
};

export const initSession = createAsyncThunk("session/init", async () => apiClient.getSession());

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload;
    },
    setFirstLaunchAnswered: (state, action: PayloadAction<boolean>) => {
      state.firstLaunchAnswered = action.payload;
    },
    setLastResetAt: (state, action: PayloadAction<string | null>) => {
      state.lastResetAt = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(initSession.fulfilled, (state, action) => {
      state.sessionId = action.payload.session.sessionId;
      state.firstLaunchAnswered = action.payload.session.firstLaunchAnswered;
    });
  }
});

export const { setSessionId, setFirstLaunchAnswered, setLastResetAt } = sessionSlice.actions;
export default sessionSlice.reducer;
