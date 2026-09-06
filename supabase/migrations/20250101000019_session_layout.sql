-- フィード投稿(sessions)がどの本部レイアウト(売場)に対応するかを、閲覧中の誰でも
-- 設定できるようにする。sessionsへの直接UPDATEは司会者本人のみに制限されたままにし
-- (20250101000003_rls_policies.sql)、layout_idだけを安全に更新できるSECURITY DEFINER
-- 関数を新設してそちら経由でのみ書き込ませる。

alter table sessions
  add column if not exists layout_id uuid references layouts(id) on delete set null;

create or replace function set_session_layout(p_session_id uuid, p_layout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sessions set layout_id = p_layout_id where id = p_session_id;
end;
$$;

grant execute on function set_session_layout(uuid, uuid) to authenticated;
