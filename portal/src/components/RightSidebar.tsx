"use client";

import { FlaskConical, PencilLine, Route, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggleButton } from "@/components/ui/ThemeToggleButton";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { closeResponsiveSidebar } from "@/store/uiSlice";

const links = [
  { href: "/", label: "Pipeline", icon: Route },
  { href: "/prompts/approver", label: "AI Approver Prompts", icon: FlaskConical },
  { href: "/prompts/state-assigner", label: "State Assigner Prompts", icon: PencilLine }
];

export function RightSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.isResponsiveSidebarOpen);

  return (
    <>
      {open ? (
        <button
          className="fixed inset-0 z-[9998] bg-gray-950/35 backdrop-blur-[1px]"
          type="button"
          aria-label="Close navigation backdrop"
          onClick={() => dispatch(closeResponsiveSidebar())}
        />
      ) : null}
      <aside
        className={`fixed right-0 top-0 z-9999 h-screen w-[min(20rem,calc(100vw-2rem))] border-l border-gray-200 bg-white p-4 shadow-theme-xl transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Primary"
        aria-hidden={!open}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-theme-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Menu</span>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            type="button"
            onClick={() => dispatch(closeResponsiveSidebar())}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="grid gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group menu-item ${active ? "menu-item-active" : "menu-item-inactive"}`}
                onClick={() => dispatch(closeResponsiveSidebar())}
              >
                <Icon className={`h-5 w-5 ${active ? "menu-item-icon-active" : "menu-item-icon-inactive"}`} aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-5 border-t border-gray-200 pt-5 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
            <ThemeToggleButton />
          </div>
        </div>
      </aside>
    </>
  );
}
