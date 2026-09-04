import { createClient } from "@/lib/supabase/server";
import type { ReactionRow, SessionWithImage } from "@/lib/types";

type GroupStat = {
  key: string;
  doneCount: number;
  needsWorkCount: number;
  total: number;
  needsWorkRate: number;
};

function aggregate(
  sessions: SessionWithImage[],
  reactions: ReactionRow[],
  keyOf: (s: SessionWithImage) => string | null | undefined,
): GroupStat[] {
  const keyBySession: Record<string, string | null> = {};
  for (const s of sessions) {
    keyBySession[s.id] = keyOf(s) ?? null;
  }

  const groups: Record<string, { done: number; needs: number }> = {};
  for (const r of reactions) {
    const key = keyBySession[r.session_id];
    if (!key) continue;
    groups[key] ??= { done: 0, needs: 0 };
    if (r.reaction_type === "done") groups[key].done += 1;
    else groups[key].needs += 1;
  }

  return Object.entries(groups)
    .map(([key, { done, needs }]) => {
      const total = done + needs;
      return {
        key,
        doneCount: done,
        needsWorkCount: needs,
        total,
        needsWorkRate: total ? Math.round((needs / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.needsWorkRate - a.needsWorkRate || b.total - a.total);
}

function Section({
  title,
  stats,
  className,
}: {
  title: string;
  stats: GroupStat[];
  className?: string;
}) {
  if (stats.length === 0) return null;
  return (
    <div className={className}>
      <h2 className="mb-3 text-sm font-bold text-gray-300">{title}</h2>
      <div className="flex flex-col gap-3">
        {stats.map((s) => (
          <div
            key={s.key}
            className="rounded-md border border-neutral-800 bg-neutral-900 p-3"
          >
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-100">{s.key}</span>
              <span className="text-xs text-gray-500">{s.total}件の反応</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="bg-blue-500"
                style={{ width: `${100 - s.needsWorkRate}%` }}
              />
              <div
                className="bg-orange-400"
                style={{ width: `${s.needsWorkRate}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>完成率 {100 - s.needsWorkRate}%</span>
              <span>まだまだ率 {s.needsWorkRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, images!sessions_image_id_fkey(*)")
    .returns<SessionWithImage[]>();

  const { data: reactions } = await supabase
    .from("reactions")
    .select("*")
    .returns<ReactionRow[]>();

  const byStore = aggregate(
    sessions ?? [],
    reactions ?? [],
    (s) => s.images?.store_name,
  );
  const byCategory = aggregate(
    sessions ?? [],
    reactions ?? [],
    (s) => s.images?.shelf_category,
  );

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-gray-100">まだまだ率ダッシュボード</h1>
      <p className="mb-6 text-xs text-gray-500">
        店舗・売場カテゴリごとの「完成/まだまだ」反応の集計です。まだまだ率が高い順に並んでいます。
      </p>

      {byStore.length === 0 && byCategory.length === 0 && (
        <p className="text-sm text-gray-500">
          まだリアクションのデータがありません。フィードで「完成」「まだまだ」を押すとここに集計されます。
        </p>
      )}

      <Section title="店舗別" stats={byStore} />
      <Section title="売場カテゴリ別" stats={byCategory} className="mt-8" />
    </div>
  );
}
