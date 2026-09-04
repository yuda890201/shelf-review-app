-- 「ありがとう」を独立した無制限の応援(拍手)にする。
-- reactions は「完成/まだまだ」の1人1票の判定用に絞る(reaction_type: 'like' -> 'done')

create table if not exists claps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists claps_session_id_idx on claps(session_id);

alter table claps enable row level security;

create policy "authenticated users can read all claps"
  on claps for select
  to authenticated
  using (true);

create policy "users can insert their own claps"
  on claps for insert
  to authenticated
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table claps;

-- reactions: 'like' は完成の意味で使っていたので 'done' に改名
alter table reactions drop constraint if exists reactions_reaction_type_check;
update reactions set reaction_type = 'done' where reaction_type = 'like';
alter table reactions
  add constraint reactions_reaction_type_check
  check (reaction_type in ('done', 'needs_work'));
