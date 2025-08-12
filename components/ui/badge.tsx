// components/ui/badge.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer",
        variant === "default" && "bg-blue-500 hover:bg-blue-600",
        variant === "secondary" &&
          "bg-gray-100 text-black hover:text-white dark:text-white dark:hover:text-black hover:bg-gray-200",
        variant === "outline" &&
          "border border-gray-300 hover:bg-gray-50 transition-all dark:text-white text-black dark:hover:text-black",
        className
      )}
      {...props}
    />
  );
}
