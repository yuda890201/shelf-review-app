import { BASE_HEIGHT_PCT, BASE_WIDTH_PCT } from "@/lib/comment-pin";
import { OBJECT_KIND_LABEL } from "@/components/pin-object-icon";
import type { PinObjectKind } from "@/lib/types";

const ARROW_SIZE = 11;
const STROKE_WIDTH = 3.5;

const TEXT_OUTLINE =
  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.7)";

function arrowheadPath(x: number, y: number, angle: number, size: number) {
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  const x1 = x + size * Math.cos(a1);
  const y1 = y + size * Math.sin(a1);
  const x2 = x + size * Math.cos(a2);
  const y2 = y + size * Math.sin(a2);
  return `M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`;
}

/** 始点(x1,y1)→終点(x2,y2)の線に矢印を重ねて描画する。move=終点のみ、widen=外向き2本、narrow=内向き2本。 */
export default function PinObjectLine({
  x1,
  y1,
  x2,
  y2,
  containerWidth,
  containerHeight,
  kind,
  color,
  dashed = false,
  showLabel = true,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  containerWidth: number;
  containerHeight: number;
  kind: PinObjectKind;
  color: string;
  dashed?: boolean;
  showLabel?: boolean;
}) {
  if (containerWidth <= 0 || containerHeight <= 0) return null;

  const px1 = x1 * containerWidth;
  const py1 = y1 * containerHeight;
  const px2 = x2 * containerWidth;
  const py2 = y2 * containerHeight;
  const angle = Math.atan2(py2 - py1, px2 - px1);

  const arrowheads: string[] =
    kind === "move"
      ? [arrowheadPath(px2, py2, angle, ARROW_SIZE)]
      : kind === "widen"
        ? [
            arrowheadPath(px2, py2, angle, ARROW_SIZE),
            arrowheadPath(px1, py1, angle + Math.PI, ARROW_SIZE),
          ]
        : [
            arrowheadPath(px2, py2, angle + Math.PI, ARROW_SIZE),
            arrowheadPath(px1, py1, angle, ARROW_SIZE),
          ];

  const label = OBJECT_KIND_LABEL[kind];
  const labelWidthPx = BASE_WIDTH_PCT * containerWidth;
  const labelHeightPx = BASE_HEIGHT_PCT * containerHeight;
  const fontSizePx = Math.max(9, labelHeightPx * 0.65);
  const duration = Math.max(4, label.length * 0.18);

  return (
    <>
      <svg
        className="pointer-events-none absolute left-0 top-0 z-20 overflow-visible"
        width={containerWidth}
        height={containerHeight}
        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      >
        <line
          x1={px1}
          y1={py1}
          x2={px2}
          y2={py2}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={dashed ? "7 6" : undefined}
          strokeLinecap="round"
        />
        {arrowheads.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {showLabel && (
        <div
          className="pointer-events-none absolute z-20 overflow-hidden"
          style={{
            left: `${(px1 + px2) / 2}px`,
            top: `${(py1 + py2) / 2}px`,
            width: `${labelWidthPx}px`,
            height: `${labelHeightPx}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span className="marquee-track" style={{ animationDuration: `${duration}s` }}>
            {[0, 1].map((copy) => (
              <span
                key={copy}
                aria-hidden={copy === 1}
                className="whitespace-nowrap px-2 font-black tracking-wide"
                style={{
                  fontSize: `${fontSizePx}px`,
                  lineHeight: `${labelHeightPx}px`,
                  color,
                  textShadow: TEXT_OUTLINE,
                }}
              >
                {label}
              </span>
            ))}
          </span>
        </div>
      )}
    </>
  );
}
