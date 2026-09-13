-- フィードの並び替え・絞り込み・ページングをデータベース側でまとめて行う関数。
--
-- これまでフィードは全投稿・全コメント・全リアクションをブラウザに送ってから
-- 絞り込みと並び替えをしていた。投稿が増えるほど低スペック端末が苦しくなるため、
-- 「今表示すべき投稿のIDを、指定した条件・並び順で1ページ分だけ返す」役割を
-- この関数に移し、アプリ側はそのIDに紐づくデータだけを取りに行く。
--
-- SECURITY INVOKER(SQL関数の既定)なので、呼び出したユーザーのRLSがそのまま効く。

create or replace function feed_session_ids(
  p_store text default null,
  p_truck text default null,
  p_layout uuid default null,
  p_sort text default 'new',
  p_limit integer default 8,
  p_offset integer default 0
)
returns table (session_id uuid)
language sql
stable
as $$
  with filtered as (
    select s.id, s.created_at
    from sessions s
    join images i on i.id = s.image_id
    where (p_store is null or i.store_name = p_store)
      and (p_truck is null or i.shelf_category = p_truck)
      and (p_layout is null or s.layout_id = p_layout)
  ),
  scored as (
    select
      f.id,
      f.created_at,
      -- リアクションがまだ無い投稿は -1 にして、まだまだ率順では最後に回す。
      coalesce(
        count(r.id) filter (where r.reaction_type = 'needs_work')::numeric
          / nullif(count(r.id), 0),
        -1
      ) as needs_work_rate
    from filtered f
    left join reactions r on r.session_id = f.id
    group by f.id, f.created_at
  )
  select id
  from scored
  order by
    case when p_sort = 'needs_work' then needs_work_rate end desc nulls last,
    created_at desc
  limit p_limit
  offset p_offset;
$$;

grant execute on function feed_session_ids(text, text, uuid, text, integer, integer)
  to authenticated;
