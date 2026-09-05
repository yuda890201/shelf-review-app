-- 本部レイアウトの写真(お手本・現在)に流れるコメントのピンを打てるようにする
-- 汎用ピンテーブル。新商品導入機能もこのピンを再利用する
-- (対象は layout_reference_photos か layout_current_photos のどちらか一方)。

create table if not exists pins (
  id uuid primary key default gen_random_uuid(),
  layout_reference_photo_id uuid references layout_reference_photos(id) on delete cascade,
  layout_current_photo_id uuid references layout_current_photos(id) on delete cascade,
  position_x numeric not null,
  position_y numeric not null,
  width_pct numeric not null,
  height_pct numeric not null,
  rotation_deg numeric not null default 0,
  color text not null,
  body text not null,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  constraint pins_exactly_one_target check (
    (case when layout_reference_photo_id is not null then 1 else 0 end) +
    (case when layout_current_photo_id is not null then 1 else 0 end) = 1
  )
);

create index if not exists pins_reference_photo_idx on pins(layout_reference_photo_id);
create index if not exists pins_current_photo_idx on pins(layout_current_photo_id);

alter table pins enable row level security;

create policy "authenticated users can read pins"
  on pins for select
  to authenticated
  using (true);

create policy "authenticated users can insert pins"
  on pins for insert
  to authenticated
  with check (true);

alter publication supabase_realtime add table pins;
