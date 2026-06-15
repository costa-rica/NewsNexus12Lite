"use client";

import { X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { dismissToast } from "@/store/uiSlice";

function toneClasses(tone?: string) {
  if (tone === "error") {
    return "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400";
  }
  if (tone === "rate-limit") {
    return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-orange-400";
  }
  return "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300";
}

export function ToastArea() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);
  return (
    <div className="fixed bottom-5 left-5 z-99999 grid max-w-[calc(100vw-2.5rem)] gap-3" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`w-[min(420px,calc(100vw-2.5rem))] rounded-xl border px-4 py-3 shadow-theme-lg ${toneClasses(toast.tone)}`}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-theme-sm">{toast.message}</span>
            <button className="rounded-full p-1 transition hover:bg-white/50 dark:hover:bg-white/10" type="button" onClick={() => dispatch(dismissToast(toast.id))}>
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
