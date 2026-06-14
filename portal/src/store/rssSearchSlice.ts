import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { apiClient, RateLimitError } from "@/lib/apiClient";
import { clearOrchestration } from "@/store/orchestrationSlice";
import { setArticles } from "@/store/articlesSlice";
import { addToast } from "@/store/uiSlice";

interface RssSearchState {
  query: string;
  isLoading: boolean;
  error: string | null;
  lastQuery: string | null;
  truncated: boolean;
}

const initialState: RssSearchState = {
  query: "",
  isLoading: false,
  error: null,
  lastQuery: null,
  truncated: false
};

export const submitSearch = createAsyncThunk(
  "rssSearch/submit",
  async (_arg: void, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as { rssSearch: RssSearchState };
    try {
      const response = await apiClient.postRssSearch({ query: state.rssSearch.query });
      dispatch(setArticles(response.articles));
      dispatch(clearOrchestration());
      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        dispatch(addToast({ tone: "rate-limit", message: `Too many requests - please wait before trying again.${error.retryAfter ? ` Retry after ${error.retryAfter}s.` : ""}` }));
      }
      return rejectWithValue(error instanceof Error ? error.message : "Search failed.");
    }
  }
);

export const rssSearchSlice = createSlice({
  name: "rssSearch",
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(submitSearch.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(submitSearch.fulfilled, (state, action) => {
      state.isLoading = false;
      state.lastQuery = action.payload.query;
      state.truncated = action.payload.truncated;
    });
    builder.addCase(submitSearch.rejected, (state, action) => {
      state.isLoading = false;
      state.error = String(action.payload ?? action.error.message ?? "Search failed.");
    });
  }
});

export const { clearError, setQuery } = rssSearchSlice.actions;
export default rssSearchSlice.reducer;
