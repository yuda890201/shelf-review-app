import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="font-bold text-gray-900">
              売場添削アプリ
            </Link>
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              セッション一覧
            </Link>
            <Link
              href="/comments"
              className="text-gray-600 hover:text-gray-900"
            >
              コメント一覧
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{displayName}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
