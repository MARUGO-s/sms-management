# Instatic TalksX 進行記録

## 文書情報

- 記録日時: 2026-07-26 21:50:36 JST
- 最終更新日時: 2026-07-27 00:25 JST
- 対象リポジトリ: `https://github.com/MARUGO-s/sms-management.git`
- 対象ブランチ: `main`
- 現在のHEAD: `bb23a9a221221b53fa7394b72ed22c9a0dcabfa1`
- ローカル作業場所: `/Users/yoshito/Documents/New project`
- 本番URL: `https://instatic-talksx.yoshito0428.chatgpt.site`
- 管理者URL: `https://instatic-talksx.yoshito0428.chatgpt.site/admin`
- Supabase project ref: `xpdrewhzisycjdtcvvey`
- この文書には秘密値、個人メール、アクセストークンを記載しない。

## AI引き継ぎの必須ルール

このセクションは、このプロジェクトを編集するすべてのAIと作業者に適用する。省略不可。

### 作業開始時

1. 編集前に`PROJECT_PROGRESS.md`を最初から最後まで読む。
2. `AI_HANDOFF.md`も読み、両方の記録を現在の実装と照合する。
3. `git status --short`、現在ブランチ、現在HEADを確認する。
4. 既存の未コミット変更を利用者または別AIの作業として扱い、勝手に削除・上書きしない。
5. 本番DB、Supabase設定、Sitesの状態は変化し得るため、作業対象に関係する項目を実環境で再確認する。
6. 秘密値は画面、チャット、ログ、Git、この文書へ表示しない。

### 編集中

1. 実装、設定変更、DB変更、デプロイ、テスト結果をその場で控える。
2. Supabase変更はmigration名、Edge Function名、適用先、検証結果を残す。
3. UI変更は確認したURLとデスクトップ・モバイルの確認結果を残す。
4. 問題や未完了事項を隠さず、再現条件と次の具体的な手順を残す。
5. 以前の記録は原則として削除しない。誤りを訂正する場合は、訂正日時と理由を追記する。

### 作業終了時

作業を行ったAIは、完了報告を返す前に必ず次を実施する。

1. この`PROJECT_PROGRESS.md`の「現在の到達点」「既知の警告」「未実装範囲」「次に着手する優先順位」を実態に合わせて更新する。
2. この文書末尾の「継続作業ログ」へ新しい記録を追記する。
3. 継続作業ログには、日時、依頼内容、実施内容、変更ファイル、DB・設定変更、テスト結果、デプロイ先、Git情報、未完了事項、次の作業を記載する。
4. 秘密値、個人メール、アクセストークン、Client Secret、Sitesのバイパストークンは記載しない。
5. コードとこの文書をGitへcommitし、明示された運用方針に従ってpushする。
6. `/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx/`へ、`.env*`などの除外規則を守ってソースを同期する。
7. Dropbox側の`PROJECT_PROGRESS.md`がGit作業場所の内容と一致することを確認する。

この更新を行っていない作業は、コードが動いていても引き継ぎ未完了として扱う。次のAIは、前回作業の記録漏れを発見した場合、確認できる事実だけを追記してから新しい作業を始める。

## 現在の到達点

Instatic TalksXは、Instagram、TikTok、X、Threadsの運用情報を一括管理する業務用Webアプリとして、以下の基盤まで本番反映済み。

- Supabase Authによるメール・パスワード認証
- Google OAuthログイン
- 公式22店舗とBLU NEROを合わせた23店舗の所属マスター
- 新規登録時の所属店舗必須選択
- 既存利用者向けの初回所属店舗設定
- 利用者ごとのワークスペース作成
- 通常画面での所属店舗表示
- 投稿本文、予約日時、投稿先、ステータスの保存
- 投稿履歴の閲覧
- 非公開Supabase Storageへの添付ファイル保存
- 1ファイル50MBまでのFreeプラン向け添付制限
- 動画の1:1、4:5、9:16、16:9クロップ設定
- 元動画を保持する非同期メディア処理キューと処理履歴
- Cloud Run Jobs向けFFmpeg動画クロップワーカー
- 期限付きURLによるファイルダウンロード
- SNS連携設定のメタデータ保存
- SNS APIシークレットのブラウザ非公開保存
- 全利用者、店舗、投稿、予約予定、ファイル、操作履歴を確認する管理者画面
- 管理者画面の全店舗一覧、店舗別絞り込み、店舗別運用状況
- 管理者画面からの管理者権限付与・解除
- 最後の管理者を削除できないDB保護
- 管理者権限変更を含む監査ログ
- GitHub、Dropbox、Sitesへの引き継ぎ経路

現時点では実際のSNS公開処理、コメント・DM同期、Webhook受信、各SNSの分析値取得は未実装。各SNSの開発者アプリ審査、OAuth認可、公開API実装が別途必要。動画クロップの画面、キュー、Edge Function、FFmpegワーカーは実装済みで、Cloud Run実行環境も構築済み。2026-07-27 00:19 JST時点で9分16秒動画のジョブがアプリ上で処理中表示になっており、処理済みMP4への変換完了はまだ確認できていない。

### Cloud Run動画処理の実環境

- Google Cloud project: `instatic-talksx-media`
- Region: `asia-northeast1`（東京）
- Artifact Registry: `instatic-talksx`
- Worker image: `asia-northeast1-docker.pkg.dev/instatic-talksx-media/instatic-talksx/media-processor:latest`
- Cloud Run Job: `instatic-media-processor`
- Job設定: 1 task、parallelism 1、max retries 1、timeout 15分、2 vCPU、2GiB、runtime service account `instatic-media-runtime`
- Secret Manager secret名: `instatic-supabase-url`、`instatic-supabase-secret-key`
- Dispatcher service account: `instatic-media-dispatcher`
- Dispatcher権限: `roles/run.jobsExecutorWithOverrides`
- Supabase Edge Function Secrets: `GOOGLE_SERVICE_ACCOUNT_JSON`、`GOOGLE_CLOUD_PROJECT_ID`、`GOOGLE_CLOUD_REGION`、`GOOGLE_CLOUD_RUN_JOB_NAME`
- 秘密値そのもの、サービスアカウントJSON、Supabase Secret keyはこの記録・Git・Dropboxソースミラーへ記載しない。

### 直近の動画処理確認

- アプリの予約一覧でテスト投稿1件を確認済み。
- 9分16秒動画をクロップ保存し、アプリ上で処理中表示を確認済み。
- 予約一覧は処理済み動画のプレビュー画面ではない。確認は`履歴`の投稿詳細から、`変換済み`と表示されたMP4をダウンロードして行う。
- 2026-07-27 00:25 JST時点では`変換済み`とダウンロード再生まで未確認。
- 15分を超えて処理中のままなら、Cloud Run JobのExecutionログとSupabaseの`social_media_jobs`のstatus/error_messageを確認する。手動でJobを実行しない。手動実行には対象ジョブID等の入力が必要で、アプリのDispatcher経由の実行と異なる。

## 本番データのスナップショット

2026-07-26 22:20 JSTまでに本番DBへ直接照会した結果。

| 対象 | 件数 |
| --- | ---: |
| Supabase Auth利用者 | 1 |
| 管理者 | 1 |
| 公開プロフィール | 1 |
| 店舗マスター | 23 |
| 所属店舗未設定プロフィール | 1 |
| ワークスペース | 1 |
| 所属店舗未設定ワークスペース | 1 |
| ワークスペースメンバー | 0 |
| 投稿 | 0 |
| 投稿先チャンネル | 0 |
| ファイルメタデータ | 0 |
| Storage内ファイル | 0 |
| SNS連携設定 | 0 |
| SNS連携シークレット行 | 0 |
| 監査ログ | 0 |

投稿、ファイル、SNS連携、監査ログが0件なのは、まだ実データ操作が行われていないためであり、読み込み失敗ではない。

## 技術構成

### フロントエンド

- React 19
- Next.js 16互換のVinext
- Vite 8
- TypeScript
- HeroUI v3
- Lucide React
- Cloudflare Workers互換のビルド出力

主要ファイル:

- `app/page.tsx`: 通常画面のルート
- `app/social-console.tsx`: 通常のSNS運用画面
- `app/admin/page.tsx`: 管理者画面のルート
- `app/admin/admin-console.tsx`: 管理者画面
- `app/lib/supabase.ts`: ブラウザ用Supabaseクライアント
- `app/globals.css`: 通常画面、認証画面、管理者画面の共通スタイル
- `app/layout.tsx`: メタデータ、フォント、OG設定

### バックエンド

- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- Row Level Security
- `private`スキーマ内のSecurity Definer関数

### ホスティング

- OpenAI Sites
- Sites project ID: `appgprj_6a65e85b2c6c8191b197204738f2e23f`
- `.openai/hosting.json`にproject IDを保存
- アクセスモード: 所有者のみのカスタムアクセス
- 最新Sitesバージョン: v9
- v9のsource commit: `1a1a79b2f7477b57bb877362adc6228eac88e26f`
- v9は所有者限定アクセスのまま本番公開済み

## 通常画面の機能

### 店舗所属

- 店舗マスターはMARUGO GROUP公式の22店舗と`BLU NERO`の合計23店舗
- 新規登録時に所属店舗を必須選択
- メール登録は`social_store_id`をAuth metadataへ渡し、DB側で有効店舗か検証
- Google OAuth登録はCallback完了まで選択値をローカルの一時情報として保持し、認証後にDBへ確定
- 既存利用者で所属店舗が未設定の場合、業務画面を表示する前に一度だけ選択を要求
- 所属店舗は`social_user_profiles.store_id`と`social_workspaces.store_id`を正本とする
- Authの`user_metadata`は認可判定には使用しない
- 通常画面のサイドバー、上部見出し、利用者欄へ現在の店舗名を表示

### 投稿

- 本文を最大2200文字で入力
- Instagram、TikTok、X、Threadsを複数選択
- 公開予定日時を設定
- 下書きまたは予約投稿としてPostgresへ保存
- 投稿タイトルは本文から生成
- 投稿の作成者をAuth user IDで保存

### 添付ファイル

- 1投稿につき最大4ファイル
- 1ファイル50MBまで
- ファイル本体は非公開Storage bucket `post-files`へ保存
- ファイル名、MIME type、サイズ、Storage pathは`social_post_files`へ保存
- ダウンロード時だけ60秒の署名付きURLを生成
- 動画は1:1、4:5、9:16、16:9のクロップ範囲を設定可能
- クロップ設定済み動画は`social_media_jobs`へ非同期ジョブとして保存
- 元動画を上書きせず、処理済みMP4を別ファイルとして追加
- 処理待ち、処理中、完了、失敗を履歴で確認
- 処理待ち・失敗ジョブは履歴から再実行可能

### 予約

- `scheduled`状態の投稿を一覧表示
- 予約日時、投稿先、担当者を確認

### 履歴

- 保存済み投稿を新しい順に表示
- 本文、ステータス、投稿先、保存日時、添付ファイルを確認
- 投稿本文の検索

### 受信箱

- 画面枠は存在する
- 実際のコメント・DM API同期は未実装
- 実データ風のダミー値は表示しない

### 分析

- 保存済み投稿の内部件数を集計
- 実際のSNSインプレッション、反応数、フォロワー推移は未取得

### 連携

- Instagram、TikTok、X、Threadsごとの設定画面
- App ID、Callback URL、Scopes、接続状態を`social_integrations`へ保存
- Client Secret、Access Token、Refresh Token、Webhook SecretはEdge Function経由で`social_integration_secrets`へ保存
- 保存済みシークレットの値はブラウザへ返さず、登録有無だけ返す

## 認証

### 有効なログイン方式

- メールアドレスとパスワード
- Google OAuth

### 現在の保護

- 未ログイン時は通常画面の業務データを表示しない
- 投稿、履歴、ファイル、SNS設定はSupabase RLSで保護
- UIを直接操作しなくても、Data API側で権限を拒否
- 新規登録は有効な所属店舗の選択を必須化
- 匿名利用者は有効な店舗名だけを読み取り可能で、店舗マスターを変更できない
- 所属店舗未設定の利用者は自分のプロフィールへ有効店舗を一度だけ設定でき、通常の画面操作では別店舗へ変更できない
- 新規登録画面は12文字以上のパスワードを要求
- Google OAuthのClient SecretはSupabase AuthenticationとGoogle Auth Platformにのみ保存

### Supabase Auth URL設定

- Site URL: 本番Sites URL
- Redirect URL: 本番URL配下
- Redirect URL: `http://localhost:3000/**`

### 既知のAuth警告

Supabase Advisorsは`Leaked Password Protection Disabled`を1件報告している。HaveIBeenPwned連携による漏洩パスワード保護はSupabase Proプラン向けのため、Freeプラン中は有効化できない。現在はアプリ側の12文字制限を維持する。

## 管理者画面

### アクセス

- ルート: `/admin`
- `social_admin_users`にAuth user IDが存在する利用者だけアクセス可能
- 一般利用者がURLを直接開いても管理データは取得できない
- 通常画面の「管理者」リンクも管理者にだけ表示

### 全体管理

- 全利用者数
- 全店舗数
- 全投稿数
- 全予約予定数
- 全ファイル数
- 設定済みSNS連携数
- 利用者、投稿、ファイルの横断検索
- 全店舗表示と店舗別表示を切り替える共通店舗フィルター
- 店舗ごとの利用者数、投稿数、予約数、次回予約を表示する運用状況一覧

### 投稿管理

- 全ワークスペースの投稿を確認
- 利用者、店舗、ワークスペース、投稿先、公開予定を表示
- 全店舗の一覧と店舗別の一覧を切り替え
- 投稿ステータスを下書き、予約済み、公開済み、失敗へ変更
- 管理者画面には投稿削除機能を置いていない

### 予約予定

- `scheduled`状態で公開予定日時がある投稿を時系列で表示
- 公開予定、店舗、投稿本文、投稿先、利用者、状態を表示
- 全店舗の予定と選択店舗だけの予定を切り替え

### ファイル管理

- 全ワークスペースのファイルメタデータを確認
- 投稿、作成者、店舗、ワークスペース、保存日時を表示
- 共通店舗フィルターで店舗別に絞り込み
- 非公開Storageから期限付きURLで取得
- 管理者画面にはファイル削除機能を置いていない

### 操作履歴

- 作成、更新、削除を監査ログへ保存
- 対象種別、対象ID、表示名、実行者、日時を記録
- 投稿本文は監査ログへ複製しない
- SNSシークレットは監査ログへ複製しない
- 監査対象:
  - ワークスペース
  - ワークスペースメンバー
  - 投稿
  - 投稿先
  - ファイルメタデータ
  - SNS連携メタデータ
  - 管理者権限

### 利用者管理

- 登録済み利用者を一覧表示
- 登録日時、最終ログイン、所属店舗、投稿数、ファイル数を表示
- 共通店舗フィルターで店舗別に絞り込み
- 管理者と一般利用者を区別
- 一般利用者を「管理者にする」
- 管理者の「権限を解除」
- 現在ログイン中の管理者は画面から自分自身を解除できない
- DB側でも最後の管理者1名は削除できない
- 権限付与・解除は監査ログへ保存
- 管理者へ変更できるのは、事前に一度登録済みの利用者のみ

## Supabaseテーブル

### `social_stores`

- 23店舗の正規マスター
- `id`、店舗名、エリア、表示順、有効状態を保持
- 匿名登録画面と認証済み画面は有効店舗を読み取り可能
- ブラウザロールに店舗の追加、変更、削除権限を付与しない

### `social_workspaces`

- ワークスペース
- `created_by`で作成者を保持
- `store_id`で店舗所属を保持
- 作成者またはメンバーが通常画面から閲覧
- 管理者は管理者画面から全件閲覧

### `social_workspace_members`

- ワークスペースと利用者の所属
- roleは`owner`、`admin`、`member`、`viewer`
- ワークスペース所有者だけがメンバーを管理

### `social_posts`

- 投稿本文、タイトル、公開予定、ステータス、形式、作成者
- ステータスは`draft`、`scheduled`、`published`、`failed`
- 通常利用者は所属ワークスペース内だけ操作
- アプリ管理者は全件閲覧とステータス更新が可能

### `social_post_channels`

- 投稿とSNSチャンネルの多対多情報
- チャンネルは`instagram`、`tiktok`、`x`、`threads`

### `social_post_files`

- Storage内ファイルのメタデータ
- Storage pathは一意
- ファイルサイズは0以上
- `media_variant`で元ファイルと処理済みファイルを区別
- `generated_from_file_id`で処理済みファイルから元ファイルを追跡

### `social_media_jobs`

- 動画クロップの非同期処理要求
- 対象ワークスペース、投稿、元ファイル、依頼者を保持
- クロップ比率、横位置、縦位置、拡大率をJSONで保持
- 状態は`queued`、`processing`、`completed`、`failed`、`cancelled`
- 処理済みファイル、Cloud Run実行名、安全なエラー情報を保持
- 通常利用者は所属ワークスペース内だけ閲覧・作成
- ジョブの元ファイルは同一ワークスペース・同一投稿・同一作成者の動画に限定
- service roleだけがCloud Runワーカーとして処理結果を更新

### `social_integrations`

- SNS連携の公開可能なメタデータ
- App ID、Callback URL、Scopes、Status
- シークレット値は保存しない

### `social_integration_secrets`

- Client Secret
- Access Token
- Refresh Token
- Webhook Secret
- ブラウザロール`anon`、`authenticated`へ権限を付与しない
- `service_role`とEdge Functionのみが操作

### `social_admin_users`

- アプリ全体の管理者
- Auth user IDを主キーとして保持
- 付与者と付与日時を保持
- RLSにより管理者だけが全管理者を閲覧・変更
- 最後の管理者削除を拒否

### `social_user_profiles`

- `auth.users`を直接Data APIへ公開しないための管理者向けディレクトリ
- email、所属店舗、登録日時、最終ログインを同期
- `auth.users`のInsert、email更新、last sign-in更新で自動同期
- 通常利用者は自分のプロフィール、管理者は全件を閲覧
- `store_id`が空の間だけ、利用者本人が有効店舗を一度設定可能

### `social_audit_logs`

- 操作履歴
- workspace ID、actor user ID、action、entity type、entity ID、label、metadata、日時
- 管理者だけが閲覧
- 本文やシークレットを保存しない

## Supabase Storage

- Bucket ID: `post-files`
- Public設定: false
- 1ファイル上限: 50MB
- 通常利用者は所属ワークスペースのファイルだけ操作可能
- アプリ管理者は全ファイルを読み取り可能
- ファイルの更新・削除権限は管理者へ自動拡張していない

## Supabase Edge Function

### `integration-secrets`

- 状態: ACTIVE
- バージョン: 1
- JWT検証: 有効
- 役割:
  - SNSシークレット保存
  - 保存済みシークレットの有無確認
  - SNSシークレット削除
- シークレット値をブラウザへ返さない

### `media-jobs`

- 状態: ACTIVE
- JWT検証: 有効
- 役割:
  - 認証済み利用者が閲覧可能なメディアジョブだけを受理
  - Cloud Run Jobへ`MEDIA_JOB_ID`を安全に渡して実行
  - Cloud Run未接続時はジョブを失敗させず`queued`で維持
  - Dispatch失敗時は安全なエラー情報だけを保存
- Google service-account JSONはSupabase Secretsへ保存する設計で、Gitには保存しない

## 適用済みマイグレーション

ローカルと本番が一致している。

### `20260726102900_social_ops_storage.sql`

- SNS運用の基本テーブル作成
- 投稿、チャンネル、ファイル、連携設定
- 非公開Storage bucket作成
- 初期RLSと権限

### `20260726103150_consolidate_social_rls_policies.sql`

- 初期RLSの重複整理

### `20260726104635_secure_integration_secrets.sql`

- サーバー専用シークレットテーブル
- browser roleからシークレットテーブル権限を削除
- Storageの20MB制限

### `20260726111630_fix_social_rls_recursion.sql`

- `private`スキーマ作成
- Security Definerによる所有者・メンバー判定
- 循環RLSによるログイン後読み込み失敗を修正

### `20260726114941_allow_workspace_owner_returning.sql`

- 新規ワークスペース作成直後の`insert ... returning`を所有者が読めるよう修正

### `20260726135609_add_social_media_processing.sql`

- Storage上限をFreeプラン向け50MBへ変更
- 元ファイルと処理済みファイルの系譜を追加
- `social_media_jobs`、RLS、監査trigger、service role権限を追加

### `20260726141243_fix_media_job_rls_qualification.sql`

- メディアジョブ作成RLSの外側テーブル参照を明示
- 元動画とジョブのワークスペース・投稿一致を厳密化

### `20260726121622_add_social_admin_console.sql`

- 管理者テーブル
- 利用者プロフィール同期
- 監査ログ
- 管理者の全体閲覧RLS
- 投稿ステータス更新

### `20260726122528_consolidate_social_admin_rls.sql`

- 管理者用RLSを既存ポリシーへ統合
- 複数Permissive Policy警告を解消
- 管理者の権限を閲覧と投稿更新へ限定

### `20260726124138_manage_social_administrators.sql`

- 管理者による管理者権限付与・解除
- 最後の管理者保護
- 管理者変更の監査ログ

### `20260726130739_add_social_store_affiliation.sql`

- `social_stores`と23店舗の初期データを作成
- プロフィールとワークスペースへ`store_id`を追加
- 新規登録時の`social_store_id` metadataを有効店舗に限定してプロフィールへ同期
- 既存利用者が空の`store_id`を一度だけ設定できるRLS
- 匿名登録画面へ有効店舗の読み取りだけを許可

## RLS検証結果

2026-07-26に本番DB上でロールとJWT subjectを切り替え、トランザクションをRollbackして検証。

- 管理者は全利用者、ワークスペース、投稿、ファイル、監査ログを閲覧可能
- 一般利用者相当では管理者一覧、利用者ディレクトリ、監査ログが0件
- 管理者でない利用者は管理者削除判定がfalse
- 最後の管理者をDELETEしても1名が残る
- 管理者ロールには管理者テーブルのINSERT、DELETE grantが存在
- 実際の変更可否はRLSで管理者だけに制限
- 投稿の作成・更新・削除の監査テストで3操作を記録
- 監査テストで投稿本文がログへ混入しないことを確認
- 匿名ロールは有効な23店舗を読み取れる
- 匿名ロールは店舗マスターへINSERTできない
- 認証済み利用者は未設定の自分の`store_id`を有効店舗へ設定できる
- 一度設定した`store_id`を通常利用者が別店舗へ変更できない
- 所属設定の検証はTransaction内で行いRollbackし、本番プロフィールは未設定のまま維持

## Gitの状態

店舗所属・予約予定機能の実装反映時点:

- ブランチ: `main`
- 実装commit: `ed6ecf98e37ebd3d5096f3c71f6f1716a02bde54`
- 実装commitはGitHub `origin/main`へpush済み
- Remote: `origin`
- Remote URL: `https://github.com/MARUGO-s/sms-management.git`

直近のコミット:

| Commit | 日時 | 内容 |
| --- | --- | --- |
| `ed6ecf9` | 2026-07-26 22:28 JST | Add store-scoped social operations |
| `c7f462e` | 2026-07-26 21:57 JST | Record completed handoff synchronization |
| `356f127` | 2026-07-26 21:55 JST | Require continuous AI handoff records |
| `62fc116` | 2026-07-26 21:51 JST | Add detailed project progress record |
| `04b3451` | 2026-07-26 21:45 JST | Manage administrators from admin console |
| `06be302` | 2026-07-26 21:38 JST | Document Dropbox secret handoff |
| `c86dece` | 2026-07-26 21:31 JST | Add administrator operations console |
| `db7f506` | 2026-07-26 21:07 JST | Show authenticated storage access state |
| `e219e84` | 2026-07-26 21:02 JST | Keep existing password sign-ins compatible |
| `1f56eec` | 2026-07-26 20:58 JST | Add Google authentication flow |
| `0998b66` | 2026-07-26 20:21 JST | Fix authenticated workspace loading |
| `4ac36e8` | 2026-07-26 20:10 JST | Document production deployment handoff |

この進行記録を追加するとHEADは変わるため、次回はこの文書の記録時HEADと現在HEADを比較すること。

## Dropbox

### ソース引き継ぎ

パス:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx/`

この文書を同期する直前のファイル数: 60

この文書を含めた同期後の想定ファイル数: 61

含むもの:

- アプリソース
- Supabase migrations
- Supabase Edge Functionソース
- README
- AI_HANDOFF
- この進行記録

除外するもの:

- `.git`
- `node_modules`
- `dist`
- `.next`
- `.wrangler`
- `.env*`
- `supabase/.temp`
- coverage、outputs、work

### 秘密情報引き継ぎ

パス:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-secrets/`

記録時のファイル数: 2

- `.env.local`: 現在のブラウザ実行設定
- `README.md`: 秘密情報引き継ぎ方針

`.env.local`に存在する変数名:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DROPBOX_BACKUP_DIR`

秘密値はこの文書へ記載しない。

`SUPABASE_SECRET_KEY`または`SUPABASE_SERVICE_ROLE_KEY`は記録時点でローカルenvに存在しない。入手した場合はGitソース外のDropbox secretsフォルダに`server.env`として保存する。

### 実データバックアップ

既定パス:

`/Users/yoshito/Library/CloudStorage/Dropbox/web/instatic-talksx-backups/`

記録時のバックアップフォルダ数: 0

`npm run backup:dropbox`は以下をバックアップする設計:

- 全業務テーブル
- 管理者テーブル
- 利用者プロフィール
- 監査ログ
- SNS連携シークレット
- `post-files`のファイル本体

実行には`SUPABASE_SECRET_KEY`と`DROPBOX_BACKUP_DIR`が必要。現在はserver-only keyがないため、実データバックアップは未実行。

## 秘密情報の方針

所有者の指示により、秘密情報はAI引き継ぎ目的でDropbox専用secretsフォルダへ保存してよい。

保存してよい場所:

- Supabase
- Google Auth Platform
- 所有者のDropbox secretsフォルダ
- 所有者のDropbox backupフォルダ

保存しない場所:

- Git
- GitHub issue、PR本文
- アプリのブラウザStorage
- チャット本文
- スクリーンショット
- `AI_HANDOFF.md`
- `PROJECT_PROGRESS.md`
- Dropboxのソースミラー

公開可能なSupabase Publishable Keyと、server-onlyのSecret Keyを混同しないこと。Publishable KeyだけではRLSを回避できない。

## 確認済みテスト

### コード

- `npm run lint`
- `npm test`
- `npm run build`
- `node --test tests/rendered-html.test.mjs`
- `git diff --check`

結果:

- Build成功
- `/`のサーバーレンダリング成功
- `/admin`のサーバーレンダリング成功
- 店舗所属、管理者の予約予定、店舗別運用状況を検証する自動テスト成功
- 新規登録画面の店舗選択肢がプレースホルダーを含む24件で、23店舗すべてを含むことを確認
- `BLU NERO`が登録選択肢とDB店舗マスターに存在
- スタータープレビューが残っていないことを確認
- ESLint error 0

### 実画面

- ローカル新規登録画面で所属店舗の必須選択を表示
- ローカル新規登録画面で23店舗と`BLU NERO`を表示
- 新規登録画面を1280pxデスクトップで確認
- 新規登録画面を390 x 844のモバイルで確認
- デスクトップ、モバイルとも画面全体の横方向オーバーフローがないことを確認
- 本番通常画面で既存利用者向けの「所属店舗を設定」を表示
- 本番管理者画面で店舗数23、全店舗フィルター、店舗別運用状況を表示
- 本番管理者画面で`BLU NERO`へ切り替えると見出しが店舗別表示へ変わることを確認
- 本番管理者画面で予約予定タブと時系列一覧を表示
- 本番管理者画面をデスクトップと390 x 844のモバイルで確認
- 本番管理者画面のモバイル幅で横方向オーバーフローがないことを確認
- 本番通常画面へGoogle OAuthでログイン
- 通常画面に管理者リンクが管理者だけ表示
- `/admin`の全体件数を表示
- 投稿、ファイル、操作履歴、利用者タブを切り替え
- 利用者タブに管理者1名を表示
- 現在の管理者に解除ボタンが出ないことを確認
- デスクトップ表示を確認
- 390 x 844のモバイル表示を確認
- 表はモバイルで横スクロールし、画面全体を押し広げない

## 既知の警告と環境上の注意

### Supabase Advisors

- `Leaked Password Protection Disabled`が1件
- Freeプランでは有効化不可
- 他のRLS重複・スキーマ警告は解消済み

### ESLint

- `supabase/functions/integration-secrets/index.ts`のanonymous default export warningが1件
- errorではなく、機能やデプロイを阻害していない

### Docker

- Docker Desktopは記録時に起動していない
- `supabase db push --linked`のマイグレーション適用自体は成功
- 適用後のローカルmigration catalog cache生成だけがDocker未起動警告を出す
- FFmpegワーカーの計算テストは成功したが、コンテナimage buildはDocker未起動のため未実行
- ローカルSupabase stackを起動する場合はDocker Desktopが必要

### Cloud Run

- ワーカー実装とデプロイ手順は`workers/media-processor/`にある
- GCPプロジェクト、課金設定、Artifact Registry、実行用service accountは未選定・未作成
- Supabase側のGoogleシークレットも未設定
- Cloud Run接続前でも予約投稿、元動画、クロップ設定、処理待ち履歴はSupabase Freeへ保存される
- 実際のFFmpeg処理完了まではCloud Run接続が必要

### ローカル開発サーバー

- 記録時点で`127.0.0.1:3000`にNodeプロセスがLISTEN中
- PIDは一時的な値なので引き継ぎ判断には使用しない
- 必要に応じて`npm run dev`を実行

## 現時点の未実装範囲

### SNS連携

- 各SNSのOAuth認可開始・Callback処理
- Access Token更新
- 実際の投稿公開
- 各SNS APIへの処理済み動画アップロード
- 公開結果の取得
- 公開失敗時の再試行
- Rate limit制御
- Webhook署名検証

### 受信箱

- コメント取得
- DM取得
- コメント返信
- DM返信
- 既読・担当者管理

### 分析

- SNS APIからの実績取得
- 投稿別インプレッション
- エンゲージメント
- フォロワー推移
- CSV出力

### 運用

- Cloud Run JobのGCP本番接続
- 定期実行ワーカー
- 予約時刻になった投稿の自動公開
- Dropboxバックアップの自動実行
- 障害通知
- メール通知
- 監査ログの保持期間設定
- 大量データ向けページネーション

### 管理

- 利用者停止
- パスワードリセットの管理者実行
- 管理者による利用者・ワークスペースの所属店舗変更UI
- 管理者による投稿本文編集
- 管理者による安全な論理削除

## 次に着手する優先順位

### 優先度1: Cloud Run動画処理の完了確認

1. アプリの履歴を更新し、対象ジョブが`変換済み`になるか確認
2. `変換済み`のMP4をダウンロードして、クロップ比率と動画時間を確認
3. 15分超または`失敗`なら、Cloud Run Job Executionログと`social_media_jobs.error_message`を確認
4. 必要に応じて既存Jobの設定を修正する。既存のGCP資源、Secret、サービスアカウントを再作成しない

具体的なコマンドと秘密情報の配置先は`workers/media-processor/README.md`を参照。

### 優先度2: SNS OAuth

1. 連携対象SNSを1つに絞る
2. 開発者アプリのClient ID、Client Secretを準備
3. 認可開始URLをEdge Functionで生成
4. Callbackを受けてTokenをserver-only領域へ保存
5. Token更新処理を実装

最初はInstagramまたはThreadsを推奨。複数SNSを同時に実装しない。

### 優先度3: 実際の投稿公開

1. 画像のみの投稿から開始
2. Provider APIへ公開
3. Provider側post IDを保存する列を追加
4. 成功時に`published`
5. 失敗時に`failed`と安全なエラーコードを保存
6. Retry可能な状態を設計

### 優先度4: 予約実行

1. 実行対象投稿を取得するserver-only処理
2. 重複実行防止
3. ロックまたはidempotency key
4. 実行履歴
5. 失敗通知

### 優先度5: バックアップ

1. Dropbox secretsフォルダへserver-only keyを配置
2. `npm run backup:dropbox`を手動実行
3. manifestとファイル数を確認
4. 定期実行方法を決定

## 作業再開手順

1. `/Users/yoshito/Documents/New project`を開く。
2. `git status --short`で利用者の未コミット変更を確認する。
3. `git pull --ff-only origin main`で最新化する。
4. `AI_HANDOFF.md`と`PROJECT_PROGRESS.md`を読む。
5. `.env.local`がない場合はDropbox secretsフォルダの`.env.local`を利用する。値はチャットへ表示しない。
6. `npm install`が必要か確認する。
7. `npm run dev`でローカル起動する。
8. `npm test`で現在の基準状態を確認する。
9. DB変更前に`supabase migration new <name>`を実行する。
10. `supabase db push --linked --dry-run`で確認する。
11. 本番適用後にRollback前提のSQLでRLSを検証する。
12. `supabase db advisors --linked --type all --level warn --fail-on none`を実行する。
13. UI変更時は実画面をデスクトップとモバイルで確認する。
14. Gitへcommit、pushする。
15. Dropboxソースミラーを更新する。
16. `.openai/hosting.json`が存在するため、Sitesで本番公開まで完了する。

## 変更時に守ること

- 秘密値をGitへ入れない。
- `social_integration_secrets`をブラウザへ直接公開しない。
- RLSを無効化しない。
- 管理者画面を隠すだけの認可にしない。必ずDB側でも拒否する。
- 最後の管理者保護を削除しない。
- 投稿本文やシークレットを監査ログへ複製しない。
- 管理者権限をemail文字列で判定しない。Auth user IDを使用する。
- 本番DBへテストデータを残さない。検証はTransactionとRollbackを使用する。
- 利用者の既存Git変更を勝手に戻さない。
- Supabaseのマイグレーション履歴を直接書き換えない。
- Sites ID、version ID、deployment IDを推測しない。

## よく使うコマンド

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run backup:dropbox
supabase migration new <name>
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
supabase db lint --linked --level warning
supabase db advisors --linked --type all --level warn --fail-on none
supabase functions list --project-ref xpdrewhzisycjdtcvvey
supabase functions deploy integration-secrets --use-api
supabase functions deploy media-jobs --use-api
```

## 完了条件の基準

今後の機能追加は、最低限以下を満たして完了とする。

- TypeScript build成功
- 既存テスト成功
- 新機能のRLSまたはserver-side認可確認
- 一般利用者の拒否確認
- 秘密情報のGit混入なし
- デスクトップ表示確認
- モバイル表示確認
- Git commitとpush
- Dropboxソース同期
- Supabase変更の本番適用
- Sites変更の本番公開
- `PROJECT_PROGRESS.md`の現在状態と継続作業ログの更新

## 継続作業ログ

新しい記録はこのセクションの末尾へ追加する。過去の記録を上書きしない。

### 2026-07-26 21:50 JST - 進行記録の初版作成

- 依頼: 他のAIが現在状態を把握できる詳細な進行記録を作成する。
- 実施内容: 本番、Supabase、認証、管理者機能、Git、Dropbox、未実装項目、再開手順を記録。
- 変更ファイル: `PROJECT_PROGRESS.md`
- DB・設定変更: なし。
- 検証: 本番DB件数、migration同期、Edge Function、Sites v7、Git状態、Dropbox状態を確認。秘密情報スキャンと`git diff --check`に合格。
- デプロイ: アプリ本体の変更がないためSitesデプロイなし。
- Git: commit `62fc116`を`main`へpush。
- Dropbox: ソースミラーへ同期し、内容一致と`.env*`除外を確認。
- 未完了事項: 実データバックアップはserver-only key未配置のため未実行。
- 次の作業: 各SNS OAuthの実装、または利用者が指定する機能。

### 2026-07-26 21:55 JST - AI間の継続記録ルール追加

- 依頼: 次のAIがこの文書を読み、自身の編集結果も同じ文書へ書き込み、さらに次のAIへ引き継ぐことを必須化する。
- 実施内容: 作業開始時、編集中、終了時の必須手順と追記式の継続作業ログを追加。
- 変更ファイル: `PROJECT_PROGRESS.md`
- DB・設定変更: なし。
- 検証: Markdown内容、秘密情報の混入、Git差分を確認。
- デプロイ: アプリ本体の変更がないためSitesデプロイなし。
- Git: commit `356f127`を`main`へpush。
- Dropbox: ソースミラーへ同期し、内容一致と`.env*`除外を確認。
- 未完了事項: なし。
- 次の作業: 次回のAIは作業前にこの文書を読み、作業後にこのログ末尾へ記録を追加する。

### 2026-07-26 22:32 JST - 店舗所属と店舗別管理・予約予定を追加

- 依頼: MARUGO GROUP公式サイトの店舗と`BLU NERO`を登録し、新規登録時の所属店舗選択、通常画面の店舗表示、管理者画面の店舗別表示と予約予定を追加する。
- 実施内容: 公式ブランドページの22店舗に`BLU NERO`を加えた23店舗マスターを作成。メール・Google OAuth登録、既存利用者の初回設定、通常画面の店舗表示、管理者の全店舗／店舗別フィルター、店舗別運用状況、予約予定タブを実装。
- 変更ファイル: `app/social-console.tsx`、`app/admin/admin-console.tsx`、`app/globals.css`、`tests/rendered-html.test.mjs`、`supabase/migrations/20260726130739_add_social_store_affiliation.sql`、`README.md`、`AI_HANDOFF.md`、`PROJECT_PROGRESS.md`。
- DB・設定変更: migration `20260726130739_add_social_store_affiliation.sql`を本番Supabaseへ適用。`social_stores`、プロフィールとワークスペースの`store_id`、店舗RLS、登録metadata検証triggerを追加。店舗23件と`BLU NERO`を確認。
- RLS検証: 匿名の有効店舗SELECTとINSERT拒否、認証済み利用者の未設定店舗の一度限り設定、二度目の変更拒否をTransactionとRollbackで確認。本番の既存プロフィールとワークスペースは未設定のまま。
- テスト: `npm test` 4件成功、`npm run build`成功、`npm run lint`は既存warning 1件・error 0、`git diff --check`成功、差分の秘密値スキャン該当なし。
- 実画面: ローカル登録画面を1280pxと390 x 844で確認。本番通常画面の既存利用者向け所属設定、本番管理者の23店舗、全店舗／店舗別、予約予定、デスクトップと390 x 844を確認。店舗の確定操作は行わず、本番データを変更していない。
- デプロイ: Sites v8を所有者限定のまま本番公開。URLは`https://instatic-talksx.yoshito0428.chatgpt.site`、source commitは`ed6ecf98e37ebd3d5096f3c71f6f1716a02bde54`。
- Git: 実装commit `ed6ecf9`を`main`へpush。記録更新も同じ`main`へ追加commitしてpushする。
- Dropbox: 除外規則を維持してソースミラーへ同期し、`PROJECT_PROGRESS.md`の一致と`.env*`除外を再確認する。
- 未完了事項: 既存利用者1名と既存ワークスペース1件は所属店舗未設定。利用者が次回通常画面で正しい店舗を一度選択する必要がある。管理者による後からの所属店舗変更UIは未実装。
- 次の作業: 利用者が所属店舗を選択後、店舗名が通常画面へ表示されることを確認。その後、優先するSNSのOAuthと実投稿処理へ進む。

### 2026-07-26 23:20 JST - Supabase Free向け動画クロップ基盤を追加

- 依頼: Supabase Freeを維持したまま、Cloud Run Jobsで動画をクロップできる機能を実装する。
- 実施内容: 動画プレビュー、1:1・4:5・9:16・16:9、位置・拡大設定、元動画保持、非同期処理キュー、履歴の状態表示・再実行を実装。Cloud Run向けNode.js/FFmpegワーカーと安全なデプロイ手順を追加。
- 変更ファイル: `app/social-console.tsx`、`app/media-editor.tsx`、`app/globals.css`、`workers/media-processor/`、`supabase/functions/media-jobs/`、migration 2件、テスト、README、AI handoff、進行記録。
- DB・設定変更: `20260726135609_add_social_media_processing.sql`と`20260726141243_fix_media_job_rls_qualification.sql`を本番Supabaseへ適用。Storage上限を50MBへ変更し、`social_media_jobs`、ファイル系譜、RLS、監査triggerを追加。`media-jobs` Edge FunctionをJWT検証付きで本番公開。
- RLS検証: `anon`にテーブル権限がないこと、RLS有効、認証済み利用者の正しい動画ジョブ作成成功、元動画とジョブの投稿・ワークスペース一致条件を確認。検証データはTransactionとRollbackを使用し、本番残存0件を確認。
- テスト: `npm test` 7件成功、`npm run build`成功、`supabase db lint`エラー0、Edge Function未認証POSTは401、Supabase Advisorsは既知のPro限定Auth警告1件のみ。
- セキュリティ: service role、Google service-account JSON、SNSシークレットはGitへ追加していない。Cloud Run側はGoogle Secret Manager、Dispatcher側はSupabase Secretsへ保存する手順。
- デプロイ: Supabase DBと`media-jobs` Edge Functionを本番反映。Sites v9を所有者限定アクセスのまま`https://instatic-talksx.yoshito0428.chatgpt.site`へ本番公開。Sites source commitは`1a1a79b2f7477b57bb877362adc6228eac88e26f`。
- Git: 実装commit `1a1a79b2f7477b57bb877362adc6228eac88e26f`を`main`へpush。公開結果を記録する文書commitも同じ`main`へpushする。
- Dropbox: `.env*`を除外してソースミラーへ同期し、`PROJECT_PROGRESS.md`の一致と秘密ファイル除外を確認する。
- 未完了事項: Cloud Run Job自体はGCPプロジェクト未選定、`gcloud`未導入、Docker未起動、server-only key未配置のため未デプロイ。接続前のジョブは`queued`で保持される。
- 次の作業: 使用するGCPプロジェクトを所有者が指定後、`workers/media-processor/README.md`に従ってCloud Runを接続し、50MB未満の実動画1件で処理完了を確認する。

### 2026-07-27 00:25 JST - Cloud Run動画処理環境の構築とAI引き継ぎ更新

- 依頼: 使用量枠が近いため、次のAIが現在状態を問題なく引き継げるよう、実装・本番・Cloud Run設定・未完了事項を記録する。
- 実施内容: Google Cloud project `instatic-talksx-media`を使用。必要APIを有効化し、Artifact Registry、FFmpeg worker image、runtime service account、Secret Manager secrets、Cloud Run Job、Dispatcher service accountと実行権限を作成。Supabase Edge Function SecretsへCloud Run接続設定を保存。
- 実行済みコマンドの要約: `gcloud services enable`、`gcloud artifacts repositories create`、`gcloud builds submit`、service account作成、Secret Manager登録・IAM付与、`gcloud run jobs create`、Dispatcher IAM付与、service account JSON作成・ダウンロード・Cloud Shell側削除。
- 変更ファイル: `PROJECT_PROGRESS.md`。アプリコードの変更なし。
- DB・設定変更: Supabase DB migrationの追加なし。既存の`media-jobs` Edge Functionと既存Secretsを利用。Cloud Run JobとGoogle Cloud IAM/Secret Manager設定を追加。
- セキュリティ: Supabase Secret keyとGoogle service account JSONはチャット、スクリーンショット、Git、Dropboxソースミラーへ記録していない。ダウンロードしたJSONのCloud Shell側ファイルは削除済み。Macのダウンロードフォルダ側の一時JSONは利用者が削除する運用として案内済みで、次のAIは再取得しない。
- テスト結果: Artifact Registry buildは`STATUS: SUCCESS`。Cloud Run Job作成成功。アプリで9分16秒動画をクロップ保存し、処理中表示まで確認。変換済みMP4のダウンロード・再生、Cloud Run Execution成功、動画時間の確認は未完了。
- デプロイ先: 本番Sitesは既存v9のまま。Supabase `media-jobs` Edge Functionは既存本番版を使用。Cloud Run Jobは`instatic-media-processor`。
- Git: 作業開始時HEADは`bb23a9a221221b53fa7394b72ed22c9a0dcabfa1`。この記録更新を新しいcommitとして`main`へ保存・pushする。
- Dropbox: Gitソースミラーを更新し、`PROJECT_PROGRESS.md`をGit作業場所と一致させる。`.env*`と秘密JSONは同期しない。
- 未完了事項: 9分16秒動画が15分以内に`変換済み`へ遷移するか未確認。遷移しない場合は既存Cloud Run Executionログ、Supabase job status、workerのエラーを調査する。SNS API連携・実投稿公開は未実装。
- 次のAIへの最初の作業: `PROJECT_PROGRESS.md`と`AI_HANDOFF.md`を全文確認し、`git status`を確認。既存資源を再作成せず、まずアプリ履歴を更新して変換済みMP4を確認する。秘密値は表示・取得・再発行しない。

### 2026-07-27 00:40 JST - GitHub Pagesのトップ表示を修正

- 依頼: GitHub PagesのURLを開くとREADMEが表示されるため、トップページからアプリを開けるようにする。
- 実施内容: リポジトリルートに`index.html`を追加。GitHub Pagesのトップアクセスを本番アプリURLへ即時リダイレクトし、自動遷移できない場合のリンクも表示する。
- 変更ファイル: `index.html`、`PROJECT_PROGRESS.md`、`AI_HANDOFF.md`。
- DB・設定変更: なし。GitHub Pagesはアプリ実行環境ではなく、本番アプリはOpenAI Sites上で動作するため、Pages側は本番URLへの入口として扱う。
- 検証: `git diff --check`とHTML内容を確認。GitHub Pagesの反映後、`https://marugo-s.github.io/sms-management/`を開き、本番URLへ遷移することを確認する。GitHub Pagesの反映には数分かかる場合がある。
- 未完了事項: GitHub Pagesのリモート反映後のブラウザ確認は未完了。ブラウザキャッシュが残る場合はプライベートウィンドウまたは強制再読み込みを使う。
 - 次の作業: GitHub Pages URLを再読込し、本番アプリへ遷移することを確認。アプリの機能変更は本番Sites側のデプロイで行い、GitHub Pages用の`index.html`をアプリ本体と混同しない。

### 2026-07-27 01:00 JST - 予約投稿キャンセル機能を追加

- 依頼: 投稿の予約をキャンセルできるようにする。
- 実施内容: 予約一覧の各予約投稿にキャンセルボタンを追加。確認ダイアログ後、対象投稿がまだ`scheduled`の場合だけ`status=draft`、`scheduled_at=null`へ更新し、本文・添付ファイル・履歴は削除しない。キャンセル後は予約一覧から消え、履歴の下書きとして残る。
- 変更ファイル: `app/social-console.tsx`、`app/globals.css`、`PROJECT_PROGRESS.md`、`AI_HANDOFF.md`。
- DB・設定変更: migrationなし。既存のworkspace member RLS付き`social_posts` UPDATEを使用し、対象状態を`scheduled`に限定。
- テスト: `npm test`成功。既存7テスト全てpass。`git diff --check`成功。
- デプロイ: Sites本番バージョン10として公開完了（2026-07-27 01:03 JST）。本番URLは`https://instatic-talksx.yoshito0428.chatgpt.site`。Supabase DB・Edge Function変更なし。
- 未完了事項: 認証済みブラウザ上で予約投稿を1件キャンセルし、予約一覧からの消失と履歴での下書き表示を実操作確認すること。未認証のHTTP確認は所有者限定公開のため`401`となる。
- 次の作業: 認証済み本番画面で予約投稿を1件選び、確認ダイアログ、予約一覧からの消失、履歴での下書き表示を確認する。既存の動画Cloud Run資源や秘密値は触らない。

### 2026-07-27 01:25 JST - Graphify管理者用システムマップを追加

- 依頼: インストール済みのGraphifyをSNS管理アプリへ最適化して対応する。
- 実施内容: `/admin`に管理者専用の`システムマップ`タブを追加。Graphifyのコード構成グラフをアプリ内で表示し、別画面でも確認できるようにした。更新用に`npm run graphify:system-map`と`scripts/refresh-system-map.sh`を追加。
- 解析範囲: `graphify extract . --code-only --out .`でアプリのコード構成のみを対象にした。投稿本文、添付ファイル、Supabaseの本番データ、環境変数、SNS連携情報、秘密キーは解析・表示・送信しない。`graphify-out/`はローカル作業用としてGitとDropboxソースミラーから除外する。
- 生成結果: 254ノード、269関係、25コミュニティ。Graph診断でmissing edge、dangling edge、self-loop、collapsed edgeは0件。
- 変更ファイル: `app/admin/admin-console.tsx`、`app/globals.css`、`public/system-map/graph.html`、`public/system-map/GRAPH_REPORT.md`、`scripts/refresh-system-map.sh`、`package.json`、`.gitignore`、`README.md`、`AI_HANDOFF.md`、テスト。
- DB・設定変更: Supabase migration、Edge Function、Cloud Run、Google Cloud、SNS APIの変更なし。Graphify CLIはCodex開発環境にのみインストール済みで、アプリ利用者端末に依存関係を追加していない。
- 検証: `npm test`は7件すべて成功、`git diff --check`成功。ローカルで`/admin`の既存管理者ログイン制限を確認し、`/system-map/graph.html`が254ノード・269関係のインタラクティブグラフとして描画されることを確認。公開対象の秘密値スキャンで新規の秘密値混入なし。
- デプロイ: Sites v11を所有者限定アクセスのまま本番公開。URLは`https://instatic-talksx.yoshito0428.chatgpt.site`、source commitは`827d5ddf03a7e6e4699dfd69cf949b813df012d0`。Supabase DB・Edge Function、Cloud Run、Google Cloudの変更なし。
- 次の作業: コード構成を大きく変更した時だけ`npm run graphify:system-map`を実行し、生成された公開用マップをレビューしてから本番へデプロイする。Graphifyを実データ処理に使う場合は、別途Supabase RLS・Storage・Cloud Runを含む設計を行う。
