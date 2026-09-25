"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-medium transition-all duration-300",
          "active:scale-[0.96] select-none",
          variant === "default" && "glass-button text-foreground",
          variant === "ghost" && "bg-transparent hover:bg-white/5 text-foreground",
          variant === "accent" && "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25",
          size === "sm" && "h-8 px-3 text-xs gap-1.5",
          size === "md" && "h-10 px-5 text-sm gap-2",
          size === "lg" && "h-12 px-8 text-base gap-2.5",
          size === "icon" && "h-10 w-10 text-sm",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
