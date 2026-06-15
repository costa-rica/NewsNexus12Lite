"use client";

import { Menu } from "lucide-react";
import Image from "next/image";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleResponsiveSidebar } from "@/store/uiSlice";

export function TopBar() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.isResponsiveSidebarOpen);

  return (
    <header className="sticky top-0 z-999 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/images/logoAndNameRound.png"
          alt="NewsNexus Lite"
          width={164}
          height={44}
          priority
          className="h-11 w-auto object-contain"
        />
      </div>
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => dispatch(toggleResponsiveSidebar())}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}
