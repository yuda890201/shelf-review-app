import { createClient } from "@supabase/supabase-js";

// service roleキーでRLSを無視してアクセスするための管理者クライアント。
// プッシュ通知の送信など、サーバー側の特権処理でのみ使用する。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
