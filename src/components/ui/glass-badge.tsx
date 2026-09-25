"use client";

import { cn } from "@/lib/utils";

interface GlassBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "accent" | "muted";
}

export function GlassBadge({ children, className, variant = "default" }: GlassBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-white/5 text-text-muted border border-white/5",
        variant === "accent" && "bg-purple-500/15 text-purple-300 border border-purple-500/20",
        variant === "muted" && "bg-white/3 text-text-dim border border-white/3",
        className
      )}
    >
      {children}
    </span>
  );
}
