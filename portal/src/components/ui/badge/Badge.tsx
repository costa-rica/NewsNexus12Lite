import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  color?: BadgeColor;
  endIcon?: ReactNode;
  size?: BadgeSize;
  startIcon?: ReactNode;
  variant?: BadgeVariant;
}

const colors: Record<BadgeVariant, Record<BadgeColor, string>> = {
  light: {
    primary: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
    success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
    error: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
    warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-orange-400",
    info: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-500",
    light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
    dark: "bg-gray-500 text-white dark:bg-white/5 dark:text-white"
  },
  solid: {
    primary: "bg-brand-500 text-white",
    success: "bg-success-500 text-white",
    error: "bg-error-500 text-white",
    warning: "bg-warning-500 text-white",
    info: "bg-blue-light-500 text-white",
    light: "bg-gray-400 text-white dark:bg-white/5 dark:text-white/80",
    dark: "bg-gray-700 text-white"
  }
};

export function Badge({ children, className, color = "primary", endIcon, size = "md", startIcon, variant = "light" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 font-medium",
        size === "sm" ? "text-theme-xs" : "text-sm",
        colors[variant][color],
        className
      )}
    >
      {startIcon ? <span>{startIcon}</span> : null}
      {children}
      {endIcon ? <span>{endIcon}</span> : null}
    </span>
  );
}
