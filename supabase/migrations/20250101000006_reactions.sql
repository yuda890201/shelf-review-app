-- セッション(写真)全体への「いいね」「まだまだ」リアクション

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'needs_work')),
  created_at timestamptz default now(),
  unique (session_id, user_id)
);

create index if not exists reactions_session_id_idx on reactions(session_id);

alter table reactions enable row level security;

create policy "authenticated users can read all reactions"
  on reactions for select
  to authenticated
  using (true);

create policy "users can insert their own reaction"
  on reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own reaction"
  on reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own reaction"
  on reactions for delete
  to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table reactions;
