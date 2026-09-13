import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import type { LayoutRow, StoreRow } from "@/lib/types";
import NewProductPicker from "./new-product-picker";

export default async function NewProductsPage() {
  const [supabase, t] = await Promise.all([createClient(), getDictionary()]);
  const { data: layouts, error } = await supabase
    .from("layouts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<LayoutRow[]>();

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<StoreRow[]>();

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-gray-100">
        {t.newProducts.title}
      </h1>
      <p className="mb-4 text-xs text-gray-500">{t.newProducts.description}</p>

      {error && (
        <p className="text-sm text-red-400">
          {t.common.loadFailed(error.message)}
        </p>
      )}

      {layouts && layouts.length === 0 && (
        <p className="text-sm text-gray-500">{t.newProducts.noLayouts}</p>
      )}

      <NewProductPicker layouts={layouts ?? []} stores={stores ?? []} />
    </div>
  );
}
