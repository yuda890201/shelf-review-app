"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/sign-out-button";
import PushNotificationToggle from "@/components/push-notification-toggle";

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  comments:
    "M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  add: "M12 4.5v15m7.5-7.5h-15",
  chart:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C6.5 20.496 5.996 21 5.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  profile:
    "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z",
  newProduct: "M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z M3 8.5V16l9 4.5 9-4.5V8.5M12 13v7.5",
  compare: "M3 5h7.5v14h-7.5Z M13.5 5h7.5v14h-7.5Z",
};

export default function BottomNav({
  unreadCount,
  displayName,
  userId,
}: {
  unreadCount: number;
  displayName: string | null;
  userId: string | null;
}) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  const tabs: { href: string; icon: keyof typeof ICONS; badge?: number }[] = [
    { href: "/", icon: "home", badge: unreadCount },
    { href: "/new-products", icon: "newProduct" },
    { href: "/sessions/new", icon: "add" },
    { href: "/layouts", icon: "compare" },
  ];

  return (
    <>
      {profileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-neutral-800 bg-neutral-900 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 slide-up-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-gray-100">
              {displayName ?? "ゲスト"}
            </p>
            <Link
              href="/comments"
              onClick={() => setProfileOpen(false)}
              className="mb-2 block w-full rounded-md border border-neutral-700 px-3 py-2 text-center text-sm text-gray-200 active:bg-neutral-800"
            >
              💬 コメント一覧
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setProfileOpen(false)}
              className="mb-2 block w-full rounded-md border border-neutral-700 px-3 py-2 text-center text-sm text-gray-200 active:bg-neutral-800"
            >
              📊 ダッシュボード
            </Link>
            <Link
              href="/masters"
              onClick={() => setProfileOpen(false)}
              className="mb-2 block w-full rounded-md border border-neutral-700 px-3 py-2 text-center text-sm text-gray-200 active:bg-neutral-800"
            >
              🏬 店舗・納品トラックの管理
            </Link>
            <div className="mb-2">
              <PushNotificationToggle userId={userId} />
            </div>
            <SignOutButton />
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-black pb-[env(safe-area-inset-bottom)]"
        aria-label="メインメニュー"
      >
        <div className="mx-auto flex max-w-4xl items-center justify-around px-2 py-2.5">
          {tabs.map((tab) => {
            const active =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);

            if (tab.icon === "add") {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="-mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-950/50 active:bg-blue-700"
                  aria-label="新規セッション"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7"
                  >
                    <path d={ICONS.add} />
                  </svg>
                </Link>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center justify-center p-2 ${
                  active ? "text-white" : "text-gray-500"
                }`}
              >
                <Icon d={ICONS[tab.icon]} active={active} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-center p-2 text-gray-500"
            aria-label="プロフィール"
          >
            <Icon d={ICONS.profile} active={false} />
          </button>
        </div>
      </nav>
    </>
  );
}
