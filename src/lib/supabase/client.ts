import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// createBrowserClient() は呼ぶたびに新しいクライアント(認証・Realtimeの状態を
// 含む)を作る。以前は描画のたびにコンポーネント内で呼んでいたため、再描画が
// 起きるたびに無駄なインスタンスが積み上がっていた。アプリ全体で1つを使い回す。
let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
