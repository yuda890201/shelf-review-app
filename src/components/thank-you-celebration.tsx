"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

const COLORS = [
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
const CONFETTI_COUNT = 46;
const FIREWORK_COUNT = 4;
const PARTICLES_PER_FIREWORK = 14;
const DURATION_MS = 2800;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/** 売場選択のような地味な手間をかけてくれた人へのお礼演出。画面いっぱいに紙吹雪・花火・流れる「ありがとう」を数秒表示して自動で消える。 */
export default function ThankYouCelebration({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const [confetti] = useState(() =>
    Array.from({ length: CONFETTI_COUNT }, () => ({
      left: randomBetween(0, 100),
      color: randomColor(),
      delay: randomBetween(0, 0.5),
      duration: randomBetween(1.8, 3.2),
      rotate: randomBetween(0, 360),
      drift: randomBetween(-40, 40),
      width: randomBetween(6, 11),
      height: randomBetween(9, 15),
    })),
  );

  const [fireworks] = useState(() =>
    Array.from({ length: FIREWORK_COUNT }, () => ({
      x: randomBetween(15, 85),
      y: randomBetween(12, 55),
      delay: randomBetween(0, 1.3),
      color: randomColor(),
      particles: Array.from({ length: PARTICLES_PER_FIREWORK }, (_, i) => {
        const angle = (i / PARTICLES_PER_FIREWORK) * Math.PI * 2;
        const radius = randomBetween(55, 110);
        return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
      }),
    })),
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {confetti.map((c, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${c.left}%`,
              width: `${c.width}px`,
              height: `${c.height}px`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              "--drift": `${c.drift}px`,
              "--rot": `${c.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}

      {fireworks.map((f, i) => (
        <div
          key={i}
          className="firework"
          style={{ left: `${f.x}%`, top: `${f.y}%` }}
        >
          {f.particles.map((p, j) => (
            <span
              key={j}
              className="firework-particle"
              style={
                {
                  background: f.color,
                  animationDelay: `${f.delay}s`,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}

      <div className="thank-you-banner">
        <span className="marquee-track" style={{ animationDuration: "3.2s" }}>
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1} className="thank-you-text">
              {`${t.celebration.message} 🎉 ・ ${t.celebration.message} 🎉 ・\u00a0`}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
