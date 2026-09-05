import { createClient } from "@/lib/supabase/server";
import type { LayoutRow, StoreRow } from "@/lib/types";
import NewProductPicker from "./new-product-picker";

export default async function NewProductsPage() {
  const supabase = await createClient();
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
      <h1 className="mb-1 text-lg font-bold text-gray-100">新商品導入</h1>
      <p className="mb-4 text-xs text-gray-500">
        新商品を並べる売場を選び、現在の売場写真(または過去のアーカイブ写真)にコメントを貼り付けて、並べ方を指示します。
      </p>

      {error && (
        <p className="text-sm text-red-400">
          読み込みに失敗しました: {error.message}
        </p>
      )}

      {layouts && layouts.length === 0 && (
        <p className="text-sm text-gray-500">
          まだ売場が登録されていません。先に「本部レイアウト比較」から売場を追加してください。
        </p>
      )}

      <NewProductPicker layouts={layouts ?? []} stores={stores ?? []} />
    </div>
  );
}
