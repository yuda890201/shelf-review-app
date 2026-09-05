-- 投稿(コメント)によって蓄積していく「よく使う文言」タグ。
-- これまではcommentsテーブルから頻度集計していたが、ユーザーが手動で
-- 追加・編集・削除できるよう独立したテーブルに切り出す。

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  comment_type text not null check (comment_type in ('good', 'bad')),
  body text not null,
  use_count integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (comment_type, body)
);

create index if not exists tags_comment_type_idx on tags(comment_type);

alter table tags enable row level security;

create policy "authenticated users can read tags"
  on tags for select
  to authenticated
  using (true);

create policy "authenticated users can insert tags"
  on tags for insert
  to authenticated
  with check (true);

create policy "authenticated users can update tags"
  on tags for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete tags"
  on tags for delete
  to authenticated
  using (true);

alter publication supabase_realtime add table tags;
