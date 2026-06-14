"use client";

import { FlaskConical, Menu, PencilLine, Route } from "lucide-react";
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
    <aside className="right-sidebar" aria-label="Primary">
      <button className="btn" type="button" onClick={() => dispatch(toggleResponsiveSidebar())} aria-label="Toggle navigation">
        <Menu size={18} />
      </button>
      <nav className="stack" style={{ marginTop: 12, display: open ? "grid" : undefined }}>
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`nav-link${active ? " active" : ""}`}>
              <Icon size={18} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
