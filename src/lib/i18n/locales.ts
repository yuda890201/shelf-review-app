export const LOCALES = ["ja", "en", "ne"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ja";

/** 言語の選択はCookieに保存する。サーバーコンポーネント側でも同じ値を読めるようにするため。 */
export const LOCALE_COOKIE = "locale";

/** Cookieの有効期限(秒)。端末を変えない限り選び直さなくて済むよう1年にしている。 */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** 言語切り替えUIに出す表示名。どの言語で表示していても自言語表記のままにする。 */
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  ne: "नेपाली",
};

/** `Intl` 系(日時の書式など)に渡すBCP 47タグ。 */
export const LOCALE_TAGS: Record<Locale, string> = {
  ja: "ja-JP",
  en: "en-US",
  ne: "ne-NP",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
