"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface SwipeHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTapCenter?: () => void;
  enabled?: boolean;
}

export function useSwipeGesture(handlers: SwipeHandlers) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastCenterTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const handlersRef = useRef(handlers);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (handlersRef.current.enabled === false) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    setIsDragging(false);

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStart.current.x;
    const dy = endY - touchStart.current.y;
    const elapsed = Date.now() - touchStart.current.time;

    touchStart.current = null;

    const MIN_SWIPE = 40;
    const MAX_TIME = 600;

    if (elapsed > MAX_TIME) return;

    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) {
      const width = e.currentTarget.clientWidth;
      const isCenter = endX >= width / 3 && endX <= (width * 2) / 3;
      const tapTime = Date.now();

      if (isCenter) {
        const previousTap = lastCenterTap.current;
        const isDoubleTap =
          previousTap &&
          tapTime - previousTap.time <= 320 &&
          Math.abs(endX - previousTap.x) <= 32 &&
          Math.abs(endY - previousTap.y) <= 32;

        if (isDoubleTap) {
          lastCenterTap.current = null;
          handlersRef.current.onDoubleTapCenter?.();
        } else {
          lastCenterTap.current = { x: endX, y: endY, time: tapTime };
        }
      } else {
        lastCenterTap.current = null;
      }
      return;
    }

    lastCenterTap.current = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) handlersRef.current.onSwipeLeft();
      else handlersRef.current.onSwipeRight();
    } else {
      if (dy < 0) handlersRef.current.onSwipeUp?.();
      else handlersRef.current.onSwipeDown?.();
    }
  }, []);

  return { onTouchStart, onTouchEnd, isDragging };
}
