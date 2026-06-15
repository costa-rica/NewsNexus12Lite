import type { LabelHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label className={cn("mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-400", className)} {...props}>
      {children}
    </label>
  );
}
