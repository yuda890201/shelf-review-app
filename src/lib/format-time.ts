import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/locales";

export function formatRelativeTime(
  isoString: string,
  t: Dictionary,
  locale: Locale,
): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return t.time.justNow;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return t.time.minutesAgo(diffMin);
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return t.time.hoursAgo(diffHour);
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return t.time.daysAgo(diffDay);

  return new Date(isoString).toLocaleDateString(LOCALE_TAGS[locale], {
    month: "numeric",
    day: "numeric",
  });
}
