-- フィードの絞り込みプルダウンに出す候補。
--
-- 絞り込みは `images.store_name` / `images.shelf_category` に保存された
-- 文字列との一致で行うが、候補を `stores` / `delivery_trucks` のマスタから
-- 作ると実際の値とずれる:
--   * 投稿ウィザードの「その他」で手入力した便はマスタに無いので選べない
--   * マスタの名前を変えると、古い投稿は選んでも1件も出てこない
-- 実際に投稿に付いている値だけを返し、選べるものと出てくるものを一致させる。

create or replace function feed_filter_options()
returns table (kind text, value text)
language sql
stable
as $$
  select 'store'::text as kind, i.store_name as value
  from images i
  join sessions s on s.image_id = i.id
  where i.store_name is not null and i.store_name <> ''
  group by i.store_name
  union all
  select 'truck'::text as kind, i.shelf_category as value
  from images i
  join sessions s on s.image_id = i.id
  where i.shelf_category is not null and i.shelf_category <> ''
  group by i.shelf_category
  order by 1, 2;
$$;

grant execute on function feed_filter_options() to authenticated;
