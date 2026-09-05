export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return "たった今";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;

  return new Date(isoString).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}
