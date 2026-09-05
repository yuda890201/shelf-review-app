import { useEffect } from "react";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";

// <dialog>のinert化は背景のタップ/フォーカスは防いでくれるが、iOS Safari
// では背景のタッチスクロールまでは止めてくれないことがある。
// body-scroll-lockはタッチイベントレベルで背景のスクロールを止める
// (かつ渡した要素の中だけは通常通りスクロールできる)ための実績のある
// ライブラリで、これを併用する。
export function useBodyScrollLock(
  targetRef: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const el = targetRef.current;
    if (!el) return;
    disableBodyScroll(el, { reserveScrollBarGap: true });
    return () => {
      enableBodyScroll(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
