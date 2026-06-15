"use client";

import { FlaskConical, PencilLine, Route, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleResponsiveSidebar } from "@/store/uiSlice";

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
    <aside
      className={`fixed right-0 top-16 z-99 h-[calc(100vh-4rem)] w-[204px] border-l border-gray-200 bg-white p-4 shadow-theme-sm transition-transform dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-label="Primary"
    >
      <button
        className="mb-3 ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 lg:hidden"
        type="button"
        onClick={() => dispatch(toggleResponsiveSidebar())}
        aria-label="Close navigation"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <nav className="grid gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group menu-item ${active ? "menu-item-active" : "menu-item-inactive"}`}
              onClick={() => {
                if (open) {
                  dispatch(toggleResponsiveSidebar());
                }
              }}
            >
              <Icon className={`h-5 w-5 ${active ? "menu-item-icon-active" : "menu-item-icon-inactive"}`} aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
