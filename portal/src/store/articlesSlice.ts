import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Article, ArticleSnapshot } from "@/types";

interface ArticlesState {
  items: Article[];
  rowStatuses: Record<string, Article["rowStatus"]>;
  lastSearchHadResults: boolean | null;
}

const initialState: ArticlesState = {
  items: [],
  rowStatuses: {},
  lastSearchHadResults: null
};

export const articlesSlice = createSlice({
  name: "articles",
  initialState,
  reducers: {
    setArticles: (state, action: PayloadAction<Article[]>) => {
      state.items = action.payload;
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
    clearArticles: (state) => {
      state.items = [];
      state.rowStatuses = {};
      state.lastSearchHadResults = null;
    }
  }
});

export const { clearArticles, setArticles, updateArticleFromSnapshot } = articlesSlice.actions;
export default articlesSlice.reducer;
