"use client";

import { useI18n } from "@/lib/i18n/provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div>
      <p className="mb-1 text-[11px] text-gray-500">{t.language.label}</p>
      <div className="flex gap-2">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={`flex-1 rounded-md border px-2 py-2 text-xs font-semibold ${
              locale === code
                ? "border-blue-500 bg-blue-950/60 text-blue-300"
                : "border-neutral-700 text-gray-400 active:bg-neutral-800"
            }`}
          >
            {LOCALE_LABELS[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
