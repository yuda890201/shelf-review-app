-- Web Push通知の購読情報を保存するテーブル。
-- 送信はサーバー側でservice roleキーを使って行うため、RLSはユーザー本人の
-- 登録・閲覧・削除のみを許可する形で十分。

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "users can insert their own push subscription"
  on push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can upsert their own push subscription"
  on push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can view their own push subscription"
  on push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete their own push subscription"
  on push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);
