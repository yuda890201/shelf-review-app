import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { LOCALE_TAGS } from "@/lib/i18n/locales";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "売場添削アプリ",
  description: "売場写真をチームで見ながら意見出しをするブレストツール",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "売場添削",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className="h-full antialiased"
      style={{ colorScheme: "dark" }}
    >
      <head>
        {/* 売場写真はSupabase Storageから直接読み込むため、先に接続を張っておくと
            低速回線の端末で最初の画像表示が目に見えて速くなる。 */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={process.env.NEXT_PUBLIC_SUPABASE_URL}
            crossOrigin=""
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-black text-gray-100">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
