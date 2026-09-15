import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locales";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

/**
 * サーバーコンポーネントから現在の表示言語を読む。
 * 言語はURLではなくCookieで持つため、既存の共有リンク(`/?session=...`)や
 * プッシュ通知のリンクがそのまま使える。
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  return DICTIONARIES[await getLocale()];
}
