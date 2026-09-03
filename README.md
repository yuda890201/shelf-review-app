# 売場添削アプリ

コンビニ・小売店向けの売場添削アプリ。フェーズ1「意見出しモード」— チームで1枚の売場写真を見ながら、画像上にピンを打って良い点・悪い点をリアルタイムでブレストするツール。

## フェーズ設計

1. **(このリポジトリの実装対象)** 意見出しモード — 画像+ピン+コメントを構造化データとして蓄積する
2. (将来) 蓄積データを使った類似画像検索ベースの簡易添削
3. (将来) VLM(Claude等)にチームの陳列基準を注入した添削精度向上

## 技術スタック

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Supabase (Postgres + Auth + Storage + Realtime)
- `@supabase/ssr` によるサーバー/クライアント両対応のSupabaseクライアント

## セットアップ

### 1. Supabaseプロジェクトを作成

[supabase.com](https://supabase.com) でプロジェクトを作成し、`Project Settings > API` から URL と anon key を取得します。

### 2. マイグレーションを適用

`supabase/migrations/` 配下のSQLをSupabase SQL Editor で順番に実行するか、Supabase CLIでリンクして適用します。

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

マイグレーション内容:

- `20250101000001_init_schema.sql` — `images` / `sessions` / `comments` テーブル作成、`pgvector` 拡張の有効化(フェーズ2の埋め込み検索用)
- `20250101000002_storage.sql` — 売場画像用ストレージバケット `shelf-images` と権限
- `20250101000003_rls_policies.sql` — Row Level Security(ログイン済みユーザーは全件閲覧可、投稿は自分のuser_idのみ、セッションのクローズは司会者本人のみ)
- `20250101000004_realtime.sql` — `comments` テーブルをRealtimeパブリケーションに追加

### 3. 認証方式の確認

Supabase Dashboard > Authentication > Providers で **Email (Magic Link)** が有効になっていることを確認してください(デフォルトで有効です)。

### 4. 環境変数

```bash
cp .env.example .env.local
```

`.env.local` に Supabase の URL と anon key を設定します。

### 5. 開発サーバー起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

## 画面構成

| パス | 内容 |
|---|---|
| `/login` | メールのマジックリンクでログイン |
| `/` | セッション一覧(新規作成ボタンあり) |
| `/sessions/new` | 売場画像アップロード + セッション作成 |
| `/sessions/[id]` | セッション詳細 — 画像上にピンを打って良い点/悪い点コメントを投稿、他の参加者の投稿がリアルタイムで反映される。司会者(セッション作成者)はクローズ操作が可能 |
| `/comments` | コメント一覧・キーワード/種別での検索 |

## データモデル

`sessions`(1枚の画像を囲むブレスト会) → `images`(売場画像、Storageパスと店舗/棚カテゴリのメタ情報) → `comments`(相対座標0〜1のピン位置 + good/bad種別 + 本文 + 投稿者)。

`images.embedding` はフェーズ2以降の類似画像検索用に予約したカラムで、MVPでは未使用です。

## MVPで未実装の機能(意図的なスコープ外)

ログイン以外の権限管理、矩形描画・手書き注釈、カーソル共有、Googleスプレッドシート連携、類似画像検索、VLM添削。

## 既知の制約

- コメントの投稿者は `author_id`(user id)として構造化データに保存されますが、UI上は「自分」/「参加者」の区別のみ表示しています。参加者全員の表示名(メールアドレス等)を出すには `auth.users` を参照する `profiles` テーブルの追加が今後必要です。
