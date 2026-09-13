import { createClient } from "@/lib/supabase/server";
import type { DeliveryTruckRow, LayoutRow, StoreRow } from "@/lib/types";
import { fetchFeedPage } from "@/lib/feed-data";
import Feed from "./feed";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    page,
    { data: profileRows },
    { data: layouts },
    { data: stores },
    { data: trucks },
  ] = await Promise.all([
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
    supabase
      .from("stores")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<StoreRow[]>(),
    supabase
      .from("delivery_trucks")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<DeliveryTruckRow[]>(),
  ]);

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
      stores={stores ?? []}
      trucks={trucks ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
