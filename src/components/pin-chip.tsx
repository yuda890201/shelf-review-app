const TEXT_OUTLINE =
  "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.7)";

export default function PinChip({
  x,
  y,
  widthPx,
  heightPx,
  rotationDeg,
  color,
  text,
  onClick,
  isActive,
}: {
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  rotationDeg: number;
  color: string;
  text: string;
  onClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
}) {
  const fontSizePx = Math.max(9, heightPx * 0.65);
  const duration = Math.max(4, text.length * 0.18);
  const style: React.CSSProperties = {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
    borderColor: color,
  };
  const track = (
    <span className="marquee-track" style={{ animationDuration: `${duration}s` }}>
      {[0, 1].map((copy) => (
        <span
          key={copy}
          aria-hidden={copy === 1}
          className="whitespace-nowrap px-2 font-black tracking-wide"
          style={{
            fontSize: `${fontSizePx}px`,
            lineHeight: `${heightPx}px`,
            color,
            textShadow: TEXT_OUTLINE,
          }}
        >
          {text || " "}
        </span>
      ))}
    </span>
  );

  if (!onClick) {
    return (
      <div
        className="pointer-events-none absolute z-20 overflow-hidden rounded border-2 bg-transparent"
        style={style}
      >
        {track}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`absolute z-10 overflow-hidden rounded border-2 bg-transparent ${
        isActive ? "ring-2 ring-blue-400" : ""
      }`}
      title={text}
    >
      {track}
    </button>
  );
}
