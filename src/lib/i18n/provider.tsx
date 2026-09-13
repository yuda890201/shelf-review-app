"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "./locales";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

type I18nValue = {
  locale: Locale;
  /** 現在の言語の辞書。`t.feed.empty` のようにそのまま参照する。 */
  t: Dictionary;
  setLocale: (next: Locale) => void;
};

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: DICTIONARIES[DEFAULT_LOCALE],
  setLocale: () => {},
});

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      setLocaleState(next);
      // クライアント側は即座に切り替わるが、サーバーコンポーネントが描画した
      // 文言(コメント一覧やダッシュボードの見出しなど)はCookieを読み直す
      // 必要があるのでリフレッシュする。
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, t: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
