"use client";

import { useRef, useState } from "react";

const PULL_THRESHOLD_PX = 64;
const MAX_PULL_PX = 100;
const RESISTANCE = 0.5;

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const trackingRef = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    if (refreshing || window.scrollY > 0) return;
    startYRef.current = e.clientY;
    trackingRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!trackingRef.current || startYRef.current === null) return;
    if (window.scrollY > 0) {
      // 途中でページ自体がスクロールした場合は通常のスクロール操作とみなして中断する
      trackingRef.current = false;
      setPullDistance(0);
      return;
    }
    const dy = e.clientY - startYRef.current;
    if (dy <= 0) {
      setPullDistance(0);
      return;
    }
    e.preventDefault();
    setPullDistance(Math.min(MAX_PULL_PX, dy * RESISTANCE));
  }

  async function handlePointerUp() {
    if (!trackingRef.current) return;
    trackingRef.current = false;
    startYRef.current = null;
    if (pullDistance >= PULL_THRESHOLD_PX) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD_PX);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }

  function handlePointerCancel() {
    trackingRef.current = false;
    startYRef.current = null;
    setPullDistance(0);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className="flex items-center justify-center overflow-hidden text-xs text-gray-500 transition-[height] duration-150"
        style={{ height: pullDistance }}
      >
        {refreshing ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
        ) : (
          <span>
            {pullDistance >= PULL_THRESHOLD_PX ? "離すと更新" : "引っ張って更新"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
