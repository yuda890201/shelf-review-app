/**
 * pointermove はブラウザによっては1フレームに何度も発火する。
 * そのたびに再描画すると低スペック端末ではドラッグがかくつくので、
 * 最後の位置だけを次の描画フレームで1回処理する。
 */
export function rafThrottle<T extends unknown[]>(fn: (...args: T) => void) {
  let frame = 0;
  let latest: T | null = null;

  function run() {
    frame = 0;
    const args = latest;
    latest = null;
    if (args) fn(...args);
  }

  function throttled(...args: T) {
    latest = args;
    if (!frame) frame = requestAnimationFrame(run);
  }

  throttled.cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    latest = null;
  };

  return throttled;
}
