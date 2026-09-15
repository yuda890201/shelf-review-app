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

  /** 保留中の呼び出しを捨てる(ジェスチャーが中断されたとき)。 */
  throttled.cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    latest = null;
  };

  /**
   * 保留中の呼び出しを今すぐ実行する(指を離したとき)。
   * 捨ててしまうと最後の位置が反映されず、1フレーム内で終わる素早い操作は
   * 「動いていない」= タップとして誤判定される。
   */
  throttled.flush = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    const args = latest;
    latest = null;
    if (args) fn(...args);
  };

  return throttled;
}
