import { createClient } from "@/lib/supabase/server";
import type { DeliveryTruckRow, StoreRow } from "@/lib/types";
import MastersEditor from "./masters-editor";

export default async function MastersPage() {
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<StoreRow[]>();

  const { data: trucks } = await supabase
    .from("delivery_trucks")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<DeliveryTruckRow[]>();

  return (
    <MastersEditor initialStores={stores ?? []} initialTrucks={trucks ?? []} />
  );
}
