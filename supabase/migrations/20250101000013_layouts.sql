-- 本部レイアウト比較機能。
-- 本部が春・秋に発表する売場レイアウト(お手本写真)と、各店舗の現在の
-- 売場写真を並べて比較し、対応すべきタスクをチェックリストで管理する。

create table if not exists layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table layouts enable row level security;

create policy "authenticated users can read layouts"
  on layouts for select
  to authenticated
  using (true);

create policy "authenticated users can insert layouts"
  on layouts for insert
  to authenticated
  with check (true);

create policy "authenticated users can update layouts"
  on layouts for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete layouts"
  on layouts for delete
  to authenticated
  using (true);

-- 本部のお手本写真(季節ごとに追加され、最新のものが現行レイアウトになる)
create table if not exists layout_reference_photos (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references layouts(id) on delete cascade,
  season text not null check (season in ('spring', 'autumn')),
  year integer not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists layout_reference_photos_layout_id_idx
  on layout_reference_photos(layout_id);

alter table layout_reference_photos enable row level security;

create policy "authenticated users can read reference photos"
  on layout_reference_photos for select
  to authenticated
  using (true);

create policy "authenticated users can insert reference photos"
  on layout_reference_photos for insert
  to authenticated
  with check (true);

-- 各店舗の現在の売場写真(店舗ごとに1レイアウトへ複数回アップロード可、
-- 最新のものを現在の状態として表示する)
create table if not exists layout_current_photos (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references layouts(id) on delete cascade,
  store_name text not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists layout_current_photos_layout_store_idx
  on layout_current_photos(layout_id, store_name);

alter table layout_current_photos enable row level security;

create policy "authenticated users can read current photos"
  on layout_current_photos for select
  to authenticated
  using (true);

create policy "authenticated users can insert current photos"
  on layout_current_photos for insert
  to authenticated
  with check (true);

alter publication supabase_realtime add table layout_current_photos;

-- 比較後にやるべきことのチェックリスト(店舗ごと)
create table if not exists layout_tasks (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references layouts(id) on delete cascade,
  store_name text not null,
  body text not null,
  done boolean not null default false,
  done_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists layout_tasks_layout_store_idx
  on layout_tasks(layout_id, store_name);

alter table layout_tasks enable row level security;

create policy "authenticated users can read tasks"
  on layout_tasks for select
  to authenticated
  using (true);

create policy "authenticated users can insert tasks"
  on layout_tasks for insert
  to authenticated
  with check (true);

create policy "authenticated users can update tasks"
  on layout_tasks for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete tasks"
  on layout_tasks for delete
  to authenticated
  using (true);

alter publication supabase_realtime add table layout_tasks;
