import type { PinObjectKind } from "@/lib/types";

const PATHS: Record<PinObjectKind, string> = {
  move: "M12 20V4M5 11l7-7 7 7",
  widen: "M11 12H3m0 0 4-4m-4 4 4 4M13 12h8m0 0-4-4m4 4-4 4",
  narrow: "M3 12h8m0 0-4-4m4 4-4 4M21 12h-8m0 0 4-4m-4 4 4 4",
};

export const OBJECT_KIND_LABEL: Record<PinObjectKind, string> = {
  move: "移動",
  widen: "フェイス拡げる",
  narrow: "フェイス縮める",
};

export default function PinObjectIcon({
  kind,
  className,
}: {
  kind: PinObjectKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[kind]} />
    </svg>
  );
}
