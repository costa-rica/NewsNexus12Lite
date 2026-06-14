import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

import articlesReducer from "@/store/articlesSlice";
import orchestrationReducer from "@/store/orchestrationSlice";
import promptsReducer from "@/store/promptsSlice";
import rssSearchReducer from "@/store/rssSearchSlice";
import sessionReducer from "@/store/sessionSlice";
import uiReducer from "@/store/uiSlice";

const createNoopStorage = () => ({
  getItem: async () => null,
  setItem: async (_key: string, value: string) => value,
  removeItem: async () => undefined
});

const storage = typeof window !== "undefined" ? createWebStorage("session") : createNoopStorage();

const rootReducer = combineReducers({
  session: sessionReducer,
  rssSearch: rssSearchReducer,
  articles: articlesReducer,
  orchestration: orchestrationReducer,
  prompts: promptsReducer,
  ui: uiReducer
});

const persistedReducer = persistReducer(
  {
    key: "newsnexus12lite",
    version: 1,
    storage,
    whitelist: ["session", "articles", "orchestration", "prompts", "rssSearch"]
  },
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
