"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, elevated = false, hover = false, onClick }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4",
        elevated ? "glass-elevated" : "glass",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer active:scale-[0.98]",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
