# Instatic TalksX

Instagram、TikTok、X、Threadsの投稿予約、履歴、添付ファイル、API設定を一括管理する業務用コンソールです。

## Current capabilities

- Supabase Authによるメールアドレス・パスワード認証
- ワークスペース単位の投稿予約と履歴保存
- 非公開Supabase Storageへのファイル保存と期限付きダウンロード
- SNS APIの公開設定と秘密情報の分離保存
- RLSによる利用者・ワークスペース単位のアクセス制御
- SupabaseからDropboxへの管理者向けバックアップ

SNSへの実際の公開、コメント、DM、外部分析値の取得には、各SNSの開発者アプリ審査とOAuth・Webhook実装が別途必要です。画面では未取得データを実データ風に表示しません。

## Local development

Node.js 22以降を使用します。

```bash
npm install
npm run dev
npm test
```

ローカル環境変数は `.env.local` に置きます。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

秘密キー、service role key、SNSトークンをGitへ保存しないでください。

## Supabase

```bash
supabase db push --linked
supabase functions deploy integration-secrets --use-api
supabase db advisors --linked --type all --level warn --fail-on none
```

データベース変更は必ず `supabase migration new <name>` で作成し、`supabase/migrations/` をGitへ保存します。

## Backup

`npm run backup:dropbox` は、管理者用のserver-only keyを使ってSupabaseのテーブルとファイルをDropboxへバックアップします。Supabaseが本番データの正本で、DropboxはバックアップとAI引き継ぎ用です。
