import type { PinObjectKind } from "@/lib/types";

const ARROW_SIZE = 11;
const STROKE_WIDTH = 3.5;

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

  return (
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
  );
}
