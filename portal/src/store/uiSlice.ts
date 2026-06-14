import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

import type { ScoreExplanation, Toast } from "@/types";

interface UiState {
  sidebarRoute: string;
  isFirstLaunchModalOpen: boolean;
  selectedExplanation: ScoreExplanation | null;
  toasts: Toast[];
  isResponsiveSidebarOpen: boolean;
}

const initialState: UiState = {
  sidebarRoute: "/",
  isFirstLaunchModalOpen: false,
  selectedExplanation: null,
  toasts: [],
  isResponsiveSidebarOpen: false
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSidebarRoute: (state, action: PayloadAction<string>) => {
      state.sidebarRoute = action.payload;
    },
    openFirstLaunchModal: (state) => {
      state.isFirstLaunchModalOpen = true;
    },
    closeFirstLaunchModal: (state) => {
      state.isFirstLaunchModalOpen = false;
    },
    setSelectedExplanation: (state, action: PayloadAction<ScoreExplanation>) => {
      state.selectedExplanation = action.payload;
    },
    clearSelectedExplanation: (state) => {
      state.selectedExplanation = null;
    },
    addToast: {
      reducer: (state, action: PayloadAction<Toast>) => {
        state.toasts.push(action.payload);
      },
      prepare: (toast: Omit<Toast, "id">) => ({ payload: { ...toast, id: nanoid() } })
    },
    dismissToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    toggleResponsiveSidebar: (state) => {
      state.isResponsiveSidebarOpen = !state.isResponsiveSidebarOpen;
    }
  }
});

export const {
  addToast,
  clearSelectedExplanation,
  closeFirstLaunchModal,
  dismissToast,
  openFirstLaunchModal,
  setSelectedExplanation,
  setSidebarRoute,
  toggleResponsiveSidebar
} = uiSlice.actions;
export default uiSlice.reducer;
