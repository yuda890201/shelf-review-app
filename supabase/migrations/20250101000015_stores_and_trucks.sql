-- 店舗マスタ・納品トラック(便)マスタ。
-- これまでソースコードに直接書かれていた固定リストをテーブル化し、
-- マイページの管理画面から追加・編集・削除できるようにする。

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists delivery_trucks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table stores enable row level security;
alter table delivery_trucks enable row level security;

create policy "authenticated users can read stores"
  on stores for select to authenticated using (true);
create policy "authenticated users can insert stores"
  on stores for insert to authenticated with check (true);
create policy "authenticated users can update stores"
  on stores for update to authenticated using (true) with check (true);
create policy "authenticated users can delete stores"
  on stores for delete to authenticated using (true);

create policy "authenticated users can read delivery trucks"
  on delivery_trucks for select to authenticated using (true);
create policy "authenticated users can insert delivery trucks"
  on delivery_trucks for insert to authenticated with check (true);
create policy "authenticated users can update delivery trucks"
  on delivery_trucks for update to authenticated using (true) with check (true);
create policy "authenticated users can delete delivery trucks"
  on delivery_trucks for delete to authenticated using (true);

-- これまで src/lib/stores.ts と sessions/new/page.tsx に直書きしていた値を
-- そのまま初期データとして投入し、既存の運用に影響が出ないようにする。
insert into stores (name, sort_order) values
  ('博多住吉通り店', 1),
  ('清川二丁目店', 2)
on conflict (name) do nothing;

insert into delivery_trucks (name, sort_order) values
  ('センター1便', 1),
  ('ヤマザキパン1便', 2),
  ('センター2便', 3),
  ('山崎パン2便', 4),
  ('昼ピークFF', 5),
  ('センター3便', 6),
  ('夜ピークFF', 7)
on conflict (name) do nothing;
