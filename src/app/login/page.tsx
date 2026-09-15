"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error || !data.user) {
      setErrorMessage(error?.message ?? t.login.failed);
      setSubmitting(false);
      return;
    }

    const displayName = name.trim();

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, display_name: displayName });

    if (profileError) {
      setErrorMessage(profileError.message);
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-2 text-xl font-bold text-gray-100">{t.login.title}</h1>
      <p className="mb-6 text-sm text-gray-400">{t.login.subtitle}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          required
          placeholder={t.login.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? t.common.processing : t.login.start}
        </button>
        {errorMessage && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
