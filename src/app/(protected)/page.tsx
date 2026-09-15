import { createClient } from "@/lib/supabase/server";
import type { LayoutRow } from "@/lib/types";
import { fetchFeedPage } from "@/lib/feed-data";
import Feed from "./feed";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [page, { data: profileRows }, { data: layouts }, { data: filterRows }] =
    await Promise.all([
      fetchFeedPage(supabase, 0),
      supabase
        .from("profiles")
        .select("id, display_name")
        .returns<{ id: string; display_name: string }[]>(),
      supabase
        .from("layouts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<LayoutRow[]>(),
      // 絞り込みの候補は、マスタではなく実際に投稿に付いている値から作る
      // (「その他」で手入力した便も選べるように、かつ選んでも0件にならないように)
      supabase.rpc("feed_filter_options"),
    ]);

  const options = (filterRows ?? []) as { kind: string; value: string }[];

  const profileNames: Record<string, string> = {};
  for (const row of profileRows ?? []) {
    profileNames[row.id] = row.display_name;
  }

  if (user) {
    await supabase
      .from("profiles")
      .update({ notifications_seen_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return (
    <Feed
      initialPage={page}
      initialProfileNames={profileNames}
      layouts={layouts ?? []}
      storeOptions={options
        .filter((row) => row.kind === "store")
        .map((row) => row.value)}
      truckOptions={options
        .filter((row) => row.kind === "truck")
        .map((row) => row.value)}
      currentUserId={user?.id ?? null}
    />
  );
}
