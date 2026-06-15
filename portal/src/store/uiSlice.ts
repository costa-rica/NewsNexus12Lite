import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

import type { ScoreExplanation, Toast } from "@/types";

interface UiState {
  sidebarRoute: string;
  isFirstLaunchModalOpen: boolean;
  isExplanationModalOpen: boolean;
  descriptionModalArticleId: string | null;
  selectedExplanation: ScoreExplanation | null;
  toasts: Toast[];
  isResponsiveSidebarOpen: boolean;
}

const initialState: UiState = {
  sidebarRoute: "/",
  isFirstLaunchModalOpen: false,
  isExplanationModalOpen: false,
  descriptionModalArticleId: null,
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
    openExplanationModal: (state) => {
      state.isExplanationModalOpen = true;
    },
    closeExplanationModal: (state) => {
      state.isExplanationModalOpen = false;
      state.selectedExplanation = null;
    },
    openDescriptionModal: (state, action: PayloadAction<string>) => {
      state.descriptionModalArticleId = action.payload;
    },
    closeDescriptionModal: (state) => {
      state.descriptionModalArticleId = null;
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
    closeResponsiveSidebar: (state) => {
      state.isResponsiveSidebarOpen = false;
    },
    toggleResponsiveSidebar: (state) => {
      state.isResponsiveSidebarOpen = !state.isResponsiveSidebarOpen;
    }
  }
});

export const {
  addToast,
  clearSelectedExplanation,
  closeDescriptionModal,
  closeExplanationModal,
  closeFirstLaunchModal,
  closeResponsiveSidebar,
  dismissToast,
  openDescriptionModal,
  openExplanationModal,
  openFirstLaunchModal,
  setSelectedExplanation,
  setSidebarRoute,
  toggleResponsiveSidebar
} = uiSlice.actions;
export default uiSlice.reducer;
