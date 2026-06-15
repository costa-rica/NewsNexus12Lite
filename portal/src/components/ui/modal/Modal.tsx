"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ModalProps {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
}

export function Modal({ children, className, isOpen, onClose, titleId }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto bg-gray-950/45 p-4 backdrop-blur-[2px]" role="presentation">
      <button className="absolute inset-0 h-full w-full cursor-default" type="button" aria-label="Close modal" onClick={onClose} />
      <section
        className={cn(
          "relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          className="absolute right-4 top-4 z-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
          type="button"
          aria-label="Close modal"
          onClick={onClose}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {children}
      </section>
    </div>
  );
}
