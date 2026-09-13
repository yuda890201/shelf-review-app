-- 納品トラック(便)とゴンドラ(売場 = layouts)の紐づけ。
--
-- 1つの便が複数のゴンドラに商品を持ってくることがある
-- (例: ヤマザキパン1便 → 菓子パン・惣菜パン・マルチパン)。
-- その場合ゴンドラごとに写真が必要になるため、投稿ウィザードで
-- 「便を選ぶ → その便のゴンドラを1つずつ撮る」という流れにできるよう、
-- 便とゴンドラの多対多の対応表を持たせる。

create table if not exists truck_layouts (
  id uuid primary key default gen_random_uuid(),
  delivery_truck_id uuid not null references delivery_trucks(id) on delete cascade,
  layout_id uuid not null references layouts(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  unique (delivery_truck_id, layout_id)
);

create index if not exists truck_layouts_truck_idx
  on truck_layouts(delivery_truck_id);
create index if not exists truck_layouts_layout_idx
  on truck_layouts(layout_id);

alter table truck_layouts enable row level security;

create policy "authenticated users can read truck layouts"
  on truck_layouts for select to authenticated using (true);
create policy "authenticated users can insert truck layouts"
  on truck_layouts for insert to authenticated with check (true);
create policy "authenticated users can update truck layouts"
  on truck_layouts for update to authenticated using (true) with check (true);
create policy "authenticated users can delete truck layouts"
  on truck_layouts for delete to authenticated using (true);
