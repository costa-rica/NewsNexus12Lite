import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Article, ArticleSnapshot } from "@/types";

interface ArticlesState {
  items: Article[];
  expandedIds: string[];
  rowStatuses: Record<string, Article["rowStatus"]>;
  lastSearchHadResults: boolean | null;
}

const initialState: ArticlesState = {
  items: [],
  expandedIds: [],
  rowStatuses: {},
  lastSearchHadResults: null
};

export const articlesSlice = createSlice({
  name: "articles",
  initialState,
  reducers: {
    setArticles: (state, action: PayloadAction<Article[]>) => {
      state.items = action.payload;
      state.expandedIds = [];
      state.rowStatuses = Object.fromEntries(action.payload.map((article) => [article.id, article.rowStatus]));
      state.lastSearchHadResults = action.payload.length > 0;
    },
    updateArticleFromSnapshot: (state, action: PayloadAction<ArticleSnapshot>) => {
      const index = state.items.findIndex((article) => article.id === action.payload.id);
      if (index >= 0) {
        state.items[index] = { ...state.items[index], ...action.payload };
        state.rowStatuses[action.payload.id] = action.payload.rowStatus;
      }
    },
    toggleExpanded: (state, action: PayloadAction<string>) => {
      state.expandedIds = state.expandedIds.includes(action.payload)
        ? state.expandedIds.filter((id) => id !== action.payload)
        : [...state.expandedIds, action.payload];
    },
    collapseRow: (state, action: PayloadAction<string>) => {
      state.expandedIds = state.expandedIds.filter((id) => id !== action.payload);
    },
    clearArticles: (state) => {
      state.items = [];
      state.expandedIds = [];
      state.rowStatuses = {};
      state.lastSearchHadResults = null;
    }
  }
});

export const { clearArticles, collapseRow, setArticles, toggleExpanded, updateArticleFromSnapshot } =
  articlesSlice.actions;
export default articlesSlice.reducer;
