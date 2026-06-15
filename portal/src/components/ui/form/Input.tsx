import * as React from "react";

import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  success?: boolean;
  error?: boolean;
  hint?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, disabled = false, error = false, hint, success = false, type = "text", ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={cn(
            "h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-theme-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-4 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30",
            disabled && "cursor-not-allowed border-gray-300 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
            error && "border-error-500 text-error-800 focus:ring-error-500/10 dark:text-error-400",
            success && "border-success-400 text-success-500 focus:border-success-300 focus:ring-success-500/10 dark:text-success-400",
            !disabled &&
              !error &&
              !success &&
              "border-gray-300 bg-transparent text-gray-800 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800",
            className
          )}
          {...props}
        />
        {hint ? (
          <p className={cn("mt-1.5 text-theme-xs", error ? "text-error-500" : success ? "text-success-500" : "text-gray-500")}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
