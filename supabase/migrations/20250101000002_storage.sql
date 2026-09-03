-- 売場画像用ストレージバケット

insert into storage.buckets (id, name, public)
values ('shelf-images', 'shelf-images', true)
on conflict (id) do nothing;

-- ログイン済みユーザーはアップロード可能
create policy "authenticated users can upload shelf images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'shelf-images');

-- 誰でも閲覧可能(公開バケットなので読み取りはアプリ側でも制御不要)
create policy "anyone can view shelf images"
  on storage.objects for select
  to public
  using (bucket_id = 'shelf-images');

-- アップロード本人は削除可能
create policy "owners can delete their shelf images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'shelf-images' and owner = auth.uid());
