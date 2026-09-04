import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "売場添削アプリ",
  description: "売場写真をチームで見ながら意見出しをするブレストツール",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 調査用: 古い端末で白画面になる原因を特定するための一時的なエラー表示スクリプト */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function show(text) {
                  try {
                    var el = document.getElementById('__debug_overlay');
                    if (!el) {
                      el = document.createElement('pre');
                      el.id = '__debug_overlay';
                      el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#fff;color:#c00;font-size:11px;line-height:1.4;padding:8px;white-space:pre-wrap;word-break:break-all;border-bottom:3px solid #c00;max-height:70vh;overflow:auto;margin:0;';
                      (document.body || document.documentElement).appendChild(el);
                    }
                    el.textContent += text + '\\n\\n';
                  } catch (e) {}
                }
                window.addEventListener('error', function (e) {
                  show('[error] ' + e.message + ' (' + e.filename + ':' + e.lineno + ':' + e.colno + ')' + (e.error && e.error.stack ? '\\n' + e.error.stack : ''));
                });
                window.addEventListener('unhandledrejection', function (e) {
                  var r = e.reason;
                  show('[unhandledrejection] ' + (r && (r.stack || r.message || r) || r));
                });
                show('[debug] UA: ' + navigator.userAgent);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
