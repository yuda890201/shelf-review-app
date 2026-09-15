"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SCALE = 5;
const MIN_SCALE = 1;

type Point = { x: number; y: number };

export type PhotoZoom = {
  scale: number;
  isZoomed: boolean;
  /** 写真を包む要素に当てる transform。 */
  style: React.CSSProperties;
  /**
   * 写真の上で指が触れたときに呼ぶ。2本目の指なら拡大操作として扱い true を返す。
   * 呼び出し側は true のとき、進行中の1本指の操作(ピン/矢印)を中断する。
   */
  handlePointerDown: (e: React.PointerEvent) => boolean;
  reset: () => void;
};

/**
 * 写真を拡大したままピンを打てるようにするための拡大・移動。
 *
 * 1本指はピン(タップ)と矢印(ドラッグ)に使われているので、拡大と移動は
 * **2本指**に割り当てている。写真アプリや地図と同じ感覚で、片手の操作を
 * 一切奪わない。
 *
 * 座標変換は要らない。ピンの位置は `imageRef.getBoundingClientRect()` を
 * 基準にした0〜1の相対値で計算しており、`getBoundingClientRect()` は
 * transform を反映した矩形を返すため、外側の要素を拡大しても
 * 「指が触れた場所 = 写真上の同じ場所」が保たれる。
 */
export function usePhotoZoom(
  containerRef: React.RefObject<HTMLElement | null>,
): PhotoZoom {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{
    distance: number;
    center: Point;
    scale: number;
    offset: Point;
  } | null>(null);
  const contentRef = useRef({ width: 0, height: 0 });

  /** 写真が枠から完全に外れないように、ずらせる量を制限する。 */
  const clamp = useCallback((x: number, y: number, scale: number): Point => {
    const container = containerRef.current?.getBoundingClientRect();
    const content = contentRef.current;
    if (!container || content.width === 0) return { x, y };

    function axis(value: number, size: number, available: number) {
      if (size <= available) return (available - size) / 2;
      return Math.min(0, Math.max(available - size, value));
    }

    return {
      x: axis(x, content.width * scale, container.width),
      y: axis(y, content.height * scale, container.height),
    };
  }, [containerRef]);

  const reset = useCallback(() => setTransform({ scale: 1, x: 0, y: 0 }), []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const pointers = pointersRef.current;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size < 2) return false;

      const container = containerRef.current;
      if (!container) return false;
      // 拡大の基準になる写真の実寸(transform前)を控えておく
      contentRef.current = {
        width: container.clientWidth,
        height: container.clientHeight,
      };

      const [a, b] = [...pointers.values()];
      const rect = container.getBoundingClientRect();
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        center: {
          x: (a.x + b.x) / 2 - rect.left,
          y: (a.y + b.y) / 2 - rect.top,
        },
        scale: transform.scale,
        offset: { x: transform.x, y: transform.y },
      };
      return true;
    },
    [containerRef, transform],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const pointers = pointersRef.current;
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const pinch = pinchRef.current;
      if (!pinch || pointers.size < 2 || pinch.distance <= 0) return;

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const [a, b] = [...pointers.values()];

      const scale = Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          (pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.distance,
        ),
      );
      // 2本指の中心の動きがそのまま写真の移動になる(つまみながら運べる)
      const center = {
        x: (a.x + b.x) / 2 - rect.left,
        y: (a.y + b.y) / 2 - rect.top,
      };
      const ratio = scale / pinch.scale;
      const next = clamp(
        center.x - (pinch.center.x - pinch.offset.x) * ratio,
        center.y - (pinch.center.y - pinch.offset.y) * ratio,
        scale,
      );
      setTransform({ scale, x: next.x, y: next.y });
    }

    function onRelease(e: PointerEvent) {
      const pointers = pointersRef.current;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onRelease);
    window.addEventListener("pointercancel", onRelease);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
    };
  }, [containerRef, clamp]);

  return {
    scale: transform.scale,
    isZoomed: transform.scale > 1.01,
    style: {
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
      transformOrigin: "0 0",
    },
    handlePointerDown,
    reset,
  };
}
