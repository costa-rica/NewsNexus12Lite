"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { dismissToast } from "@/store/uiSlice";

export function ToastArea() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);
  return (
    <div className="toast-area" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone === "rate-limit" ? "medium" : ""}`}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>{toast.message}</span>
            <button className="btn" type="button" onClick={() => dispatch(dismissToast(toast.id))}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
