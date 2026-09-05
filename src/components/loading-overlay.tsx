"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "🙏 ありがとうは何回でも送れます。投稿者を応援しましょう。",
  "✅ 完成 / 🔧 まだまだ は1人1回だけ押せます。売場の完成度が可視化されます。",
  "💬 のアイコンをタップすると、画面遷移せずにその場でコメントできます。",
  "📤 のアイコンで投稿へのリンクをスタッフに共有できます。",
  "写真をダブルタップしても🙏を送れます。",
  "下のアイコンバー: ホーム・新商品導入・投稿・本部レイアウト比較・プロフィールです。",
  "コメント一覧・ダッシュボードはプロフィールから開けます。",
  "ダッシュボードでは店舗・売場カテゴリ別の完成率を確認できます。",
  "「対応済み」にすると、改善前後の写真を並べて表示できます。",
  "コメントはすべて匿名です。誰が投稿したかは表示されません。",
  "写真をタップすると、打たれたピンの内容がハイライト表示されます。",
  "本部レイアウト比較では、本部お手本写真と現在の売場写真を見比べてタスク管理できます。",
  "新商品導入では、現在の売場写真や過去のアーカイブ写真に配置指示のピンを貼れます。",
  "店舗・納品トラックの一覧はプロフィールの「店舗・納品トラックの管理」から追加・編集できます。",
];

export default function LoadingOverlay({
  label,
  variant = "fullscreen",
}: {
  label?: string;
  variant?: "fullscreen" | "inline";
}) {
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * TIPS.length),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const content = (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
      {label && <p className="text-sm font-semibold text-gray-200">{label}</p>}
      <p className="max-w-xs text-xs text-gray-500">{TIPS[tipIndex]}</p>
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
