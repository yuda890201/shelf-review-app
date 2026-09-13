import { createClient } from "@/lib/supabase/server";
import type {
  DeliveryTruckRow,
  LayoutRow,
  StoreRow,
  TruckLayoutRow,
} from "@/lib/types";
import NewSessionWizard from "./new-session-wizard";

export default async function NewSessionPage() {
  const supabase = await createClient();

  const [{ data: stores }, { data: trucks }, { data: layouts }, { data: links }] =
    await Promise.all([
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
      supabase
        .from("layouts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
        .returns<LayoutRow[]>(),
      supabase
        .from("truck_layouts")
        .select("*")
        .order("sort_order", { ascending: true })
        .returns<TruckLayoutRow[]>(),
    ]);

  // 便 → その便が商品を持ってくるゴンドラID の対応表にしてから渡す。
  const gondolaIdsByTruck: Record<string, string[]> = {};
  for (const link of links ?? []) {
    (gondolaIdsByTruck[link.delivery_truck_id] ??= []).push(link.layout_id);
  }

  return (
    <NewSessionWizard
      stores={stores ?? []}
      trucks={trucks ?? []}
      gondolas={layouts ?? []}
      gondolaIdsByTruck={gondolaIdsByTruck}
    />
  );
}
