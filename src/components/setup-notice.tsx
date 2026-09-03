export default function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h1 className="mb-2 text-lg font-bold text-amber-900">
          Supabaseの設定が完了していません
        </h1>
        <p className="mb-4 text-sm text-amber-800">
          <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>{" "}
          に Supabase の URL と anon key が設定されていないため、アプリを表示できません。
        </p>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-amber-800">
          <li>Supabaseでプロジェクトを作成する</li>
          <li>
            <code className="rounded bg-amber-100 px-1 py-0.5">
              supabase/migrations/
            </code>{" "}
            のSQLをSQL Editorで実行する
          </li>
          <li>
            <code className="rounded bg-amber-100 px-1 py-0.5">
              cp .env.example .env.local
            </code>{" "}
            してURLとanon keyを設定する
          </li>
          <li>開発サーバーを再起動する</li>
        </ol>
        <p className="text-xs text-amber-700">
          詳しい手順は README.md を参照してください。
        </p>
      </div>
    </div>
  );
}
