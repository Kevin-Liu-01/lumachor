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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" &&
          "bg-blue-500 hover:bg-blue-600",
        variant === "secondary" &&
          "bg-gray-100 text-black hover:text-white hover:bg-gray-200",
        variant === "outline" &&
          "border border-gray-300 hover:bg-gray-5 text-white hover:text-black",
        className
      )}
      {...props}
    />
  );
}
