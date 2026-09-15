"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

export default function LoadingOverlay({
  label,
  variant = "fullscreen",
}: {
  label?: string;
  variant?: "fullscreen" | "inline";
}) {
  const { t } = useI18n();
  const tips = t.tips;
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * tips.length),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [tips.length]);

  const content = (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
      {label && <p className="text-sm font-semibold text-gray-200">{label}</p>}
      <p className="max-w-xs text-xs text-gray-500">{tips[tipIndex % tips.length]}</p>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {content}
    </div>
  );
}
