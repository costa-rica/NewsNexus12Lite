import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "danger";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    endIcon,
    size = "md",
    startIcon,
    type = "button",
    variant = "primary",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-theme-xs transition focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-50",
        size === "sm" ? "px-3 py-2 text-theme-xs" : "px-5 py-3 text-theme-sm",
        variant === "primary" &&
          "bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-300 dark:disabled:bg-brand-800",
        variant === "outline" &&
          "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]",
        variant === "danger" &&
          "border border-error-300 bg-white text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:bg-gray-900 dark:text-error-400 dark:hover:bg-error-500/10",
        className
      )}
      disabled={disabled}
      type={type}
      {...props}
    >
      {startIcon ? <span className="flex items-center">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="flex items-center">{endIcon}</span> : null}
    </button>
  );
});
