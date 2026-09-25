"use client";

import { useState, useCallback, useEffect } from "react";

export function useImmersiveMode() {
  const [isImmersive, setIsImmersive] = useState(false);

  const enterImmersive = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fallback: CSS immersive mode
    }
    setIsImmersive(true);

    // Try to hide iOS Safari toolbar
    if (typeof window !== "undefined") {
      window.scrollTo(0, 1);
    }
  }, []);

  const exitImmersive = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
    setIsImmersive(false);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsImmersive(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return { isImmersive, enterImmersive, exitImmersive };
}
