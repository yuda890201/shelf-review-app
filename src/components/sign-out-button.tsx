"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

export default function SignOutButton() {
  const router = useRouter();
  const { t } = useI18n();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm text-gray-200 active:bg-neutral-800"
    >
      {t.nav.signOut}
    </button>
  );
}
