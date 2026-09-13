import { createClient } from "@/lib/supabase/server";
import type {
  DeliveryTruckRow,
  LayoutRow,
  StoreRow,
  TruckLayoutRow,
} from "@/lib/types";
import MastersEditor from "./masters-editor";

export default async function MastersPage() {
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
      supabase.from("truck_layouts").select("*").returns<TruckLayoutRow[]>(),
    ]);

  return (
    <MastersEditor
      initialStores={stores ?? []}
      initialTrucks={trucks ?? []}
      gondolas={layouts ?? []}
      initialLinks={links ?? []}
    />
  );
}
