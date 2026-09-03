-- RLS: MVPではログイン済みユーザー全員が閲覧・投稿可能(権限管理は簡易)

alter table images enable row level security;
alter table sessions enable row level security;
alter table comments enable row level security;

-- images
create policy "authenticated users can read images"
  on images for select
  to authenticated
  using (true);

create policy "authenticated users can upload images"
  on images for insert
  to authenticated
  with check (auth.uid() = uploaded_by);

-- sessions
create policy "authenticated users can read sessions"
  on sessions for select
  to authenticated
  using (true);

create policy "authenticated users can create sessions"
  on sessions for insert
  to authenticated
  with check (auth.uid() = facilitator_id);

-- クローズ操作は司会者本人のみ
create policy "facilitator can update own session"
  on sessions for update
  to authenticated
  using (auth.uid() = facilitator_id)
  with check (auth.uid() = facilitator_id);

-- comments
create policy "authenticated users can read comments"
  on comments for select
  to authenticated
  using (true);

create policy "authenticated users can post comments"
  on comments for insert
  to authenticated
  with check (auth.uid() = author_id);
