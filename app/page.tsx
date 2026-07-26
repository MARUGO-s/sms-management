"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Button } from "@heroui/react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Inbox,
  KeyRound,
  Link2,
  LineChart,
  Megaphone,
  MessageSquare,
  Plus,
  PlugZap,
  RefreshCcw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  Wand2,
  Eye,
  EyeOff,
  History,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

type ChannelId = "instagram" | "tiktok" | "x" | "threads";
type ViewId =
  | "compose"
  | "calendar"
  | "history"
  | "inbox"
  | "analytics"
  | "settings";
type ApiStatus = "未設定" | "登録済み" | "入力確認済み" | "要確認";

type QueuedPost = {
  id: number;
  title: string;
  time: string;
  channels: ChannelId[];
  status: "予約済み" | "審査中" | "公開済み";
  owner: string;
  format: string;
};

type SavedFile = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

type HistoryRecord = {
  id: number;
  title: string;
  body: string;
  time: string;
  channels: ChannelId[];
  status: "下書き" | "予約済み" | "公開済み" | "失敗";
  owner: string;
  format: string;
  savedAt: string;
  files: SavedFile[];
};

type IntegrationConfig = {
  appId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  callbackUrl: string;
  webhookSecret: string;
  scopes: string;
  status: ApiStatus;
  updatedAt: string;
};

const channels: Array<{
  id: ChannelId;
  label: string;
  handle: string;
  tone: string;
  health: string;
  followers: string;
}> = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@instatic.jp",
    tone: "pink",
    health: "接続中",
    followers: "48.2K",
  },
  {
    id: "tiktok",
    label: "TikTok",
    handle: "@talksx",
    tone: "cyan",
    health: "接続中",
    followers: "82.7K",
  },
  {
    id: "x",
    label: "X",
    handle: "@instatic_ops",
    tone: "ink",
    health: "制限確認",
    followers: "19.4K",
  },
  {
    id: "threads",
    label: "Threads",
    handle: "@instatic.jp",
    tone: "violet",
    health: "接続中",
    followers: "12.8K",
  },
];

const integrationStorageKey = "instatic-talksx-integrations";
const historyStorageKey = "instatic-talksx-history";

const defaultScopes: Record<ChannelId, string> = {
  instagram: "content_publish, instagram_manage_comments, instagram_basic",
  tiktok: "video.publish, user.info.basic, comment.list",
  x: "tweet.read, tweet.write, users.read, offline.access",
  threads: "threads_basic, threads_content_publish, threads_manage_replies",
};

function createIntegration(id: ChannelId): IntegrationConfig {
  return {
    appId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
    callbackUrl: `http://localhost:3000/oauth/${id}/callback`,
    webhookSecret: "",
    scopes: defaultScopes[id],
    status: "未設定",
    updatedAt: "未保存",
  };
}

function createDefaultIntegrations(): Record<ChannelId, IntegrationConfig> {
  return {
    instagram: createIntegration("instagram"),
    tiktok: createIntegration("tiktok"),
    x: createIntegration("x"),
    threads: createIntegration("threads"),
  };
}

const initialQueue: QueuedPost[] = [
  {
    id: 1,
    title: "週末キャンペーンの短尺告知",
    time: "今日 19:30",
    channels: ["instagram", "tiktok"],
    status: "予約済み",
    owner: "Mika",
    format: "Reel / Short",
  },
  {
    id: 2,
    title: "導入事例の引用投稿",
    time: "明日 09:00",
    channels: ["x", "threads"],
    status: "審査中",
    owner: "Ren",
    format: "Text post",
  },
  {
    id: 3,
    title: "ライブ配信のリマインド",
    time: "7/29 18:00",
    channels: ["instagram", "x", "threads"],
    status: "予約済み",
    owner: "Aya",
    format: "Carousel",
  },
];

const initialHistory: HistoryRecord[] = [
  {
    id: 101,
    title: "導入事例の引用投稿",
    body: "現場の運用チームが、毎日の確認時間を短縮できた事例を紹介します。",
    time: "7/24 09:00",
    channels: ["x", "threads"],
    status: "公開済み",
    owner: "Ren",
    format: "Text post",
    savedAt: "7/24 08:12",
    files: [],
  },
  {
    id: 102,
    title: "夏季キャンペーン告知",
    body: "夏季キャンペーンの受付を開始しました。詳しくはプロフィールのリンクからご確認ください。",
    time: "7/22 18:30",
    channels: ["instagram", "tiktok"],
    status: "公開済み",
    owner: "Mika",
    format: "Reel / Short",
    savedAt: "7/22 16:40",
    files: [],
  },
];

const inboxItems = [
  {
    source: "Instagram",
    user: "yumi.design",
    body: "料金プランとチーム承認の使い方を知りたいです。",
    priority: "高",
    age: "6分前",
  },
  {
    source: "TikTok",
    user: "foodlab_tokyo",
    body: "コラボ動画の素材はどこへ送ればよいですか？",
    priority: "中",
    age: "18分前",
  },
  {
    source: "X",
    user: "sato_marketing",
    body: "昨日の投稿のリンクが切れているようです。",
    priority: "高",
    age: "32分前",
  },
];

const analytics = [
  { label: "リーチ", value: "428K", delta: "+18%", size: "82%" },
  { label: "保存", value: "12.4K", delta: "+11%", size: "64%" },
  { label: "返信", value: "1,284", delta: "+7%", size: "46%" },
  { label: "CV", value: "318", delta: "+23%", size: "72%" },
];

const views: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "compose", label: "投稿", icon: Send },
  { id: "calendar", label: "予約", icon: CalendarDays },
  { id: "history", label: "履歴", icon: History },
  { id: "inbox", label: "受信箱", icon: Inbox },
  { id: "analytics", label: "分析", icon: BarChart3 },
  { id: "settings", label: "連携", icon: PlugZap },
];

const channelById = Object.fromEntries(channels.map((channel) => [channel.id, channel]));

export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>("compose");
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([
    "instagram",
    "tiktok",
  ]);
  const [postText, setPostText] = useState(
    "新機能の予約投稿カレンダーを公開しました。Instagram、TikTok、Xの投稿予定を一つの画面で確認できます。"
  );
  const [scheduledAt, setScheduledAt] = useState("今日 20:00");
  const [queue, setQueue] = useState<QueuedPost[]>(initialQueue);
  const [history, setHistory] = useState<HistoryRecord[]>(initialHistory);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(
    initialHistory[0]?.id ?? null
  );
  const [attachedFiles, setAttachedFiles] = useState<SavedFile[]>([]);
  const [activeIntegrationId, setActiveIntegrationId] =
    useState<ChannelId>("instagram");
  const [integrations, setIntegrations] = useState<
    Record<ChannelId, IntegrationConfig>
  >(createDefaultIntegrations);
  const [showSecrets, setShowSecrets] = useState<Record<ChannelId, boolean>>({
    instagram: false,
    tiktok: false,
    x: false,
    threads: false,
  });

  useEffect(() => {
    const savedIntegrations = window.localStorage.getItem(integrationStorageKey);
    if (!savedIntegrations) return;

    try {
      const parsed = JSON.parse(savedIntegrations) as Partial<
        Record<ChannelId, Partial<IntegrationConfig>>
      >;
      const defaults = createDefaultIntegrations();
      setIntegrations({
        instagram: { ...defaults.instagram, ...parsed.instagram },
        tiktok: { ...defaults.tiktok, ...parsed.tiktok },
        x: { ...defaults.x, ...parsed.x },
        threads: { ...defaults.threads, ...parsed.threads },
      });
    } catch {
      window.localStorage.removeItem(integrationStorageKey);
    }
  }, []);

  useEffect(() => {
    const savedHistory = window.localStorage.getItem(historyStorageKey);
    if (!savedHistory) return;

    try {
      const parsed = JSON.parse(savedHistory) as HistoryRecord[];
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      window.localStorage.removeItem(historyStorageKey);
    }
  }, []);

  const selectedLabels = useMemo(
    () => selectedChannels.map((id) => channelById[id]?.label).filter(Boolean),
    [selectedChannels]
  );

  const previewTitle = postText.trim().split("。")[0] || "投稿内容を入力";
  const canSchedule = postText.trim().length > 0 && selectedChannels.length > 0;
  const registeredCount = useMemo(
    () =>
      channels.filter((channel) =>
        ["登録済み", "入力確認済み"].includes(integrations[channel.id].status)
      ).length,
    [integrations]
  );
  const activeIntegration = integrations[activeIntegrationId];
  const secretInputType = showSecrets[activeIntegrationId] ? "text" : "password";
  const activeChannel = channelById[activeIntegrationId];
  const selectedHistory = history.find((record) => record.id === selectedHistoryId);

  function toggleChannel(id: ChannelId) {
    setSelectedChannels((current) =>
      current.includes(id)
        ? current.filter((channelId) => channelId !== id)
        : [...current, id]
    );
  }

  function optimizeCopy() {
    const base =
      postText.trim() ||
      "新しい投稿の本文を入力すると、各SNS向けに整えた文面を作成できます。";
    setPostText(`${base}\n\n保存して後で見返せるように、チームの運用メモもまとめました。\n#SNS運用 #予約投稿 #マーケティング`);
  }

  function persistHistory(next: HistoryRecord[]) {
    window.localStorage.setItem(historyStorageKey, JSON.stringify(next));
  }

  function formatFileSize(size: number) {
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    Promise.all(
      files.slice(0, 4).map(
        (file) =>
          new Promise<SavedFile>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: String(reader.result ?? ""),
              });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    )
      .then((nextFiles) => setAttachedFiles((current) => [...current, ...nextFiles]))
      .catch(() => undefined);

    event.target.value = "";
  }

  function removeAttachedFile(name: string) {
    setAttachedFiles((current) => current.filter((file) => file.name !== name));
  }

  function schedulePost() {
    if (!canSchedule) return;

    const title =
      postText.trim().replace(/\s+/g, " ").slice(0, 30) ||
      "新しい予約投稿";

    const id = Date.now();
    const format = selectedChannels.includes("tiktok") ? "Short / Reel" : "Post";
    const time = scheduledAt || "日時未設定";
    const queuedPost: QueuedPost = {
      id,
      title,
      time,
      channels: selectedChannels,
      status: "予約済み",
      owner: "You",
      format,
    };
    const historyRecord: HistoryRecord = {
      ...queuedPost,
      body: postText.trim(),
      savedAt: getTimestamp(),
      files: attachedFiles,
      status: "予約済み",
    };

    setQueue((current) => [queuedPost, ...current]);
    setHistory((current) => {
      const next = [historyRecord, ...current];
      persistHistory(next);
      setSelectedHistoryId(id);
      return next;
    });
    setActiveView("calendar");
    setPostText("");
    setAttachedFiles([]);
  }

  function persistIntegrations(next: Record<ChannelId, IntegrationConfig>) {
    window.localStorage.setItem(integrationStorageKey, JSON.stringify(next));
  }

  function getTimestamp() {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }

  function updateIntegration(
    id: ChannelId,
    key: keyof IntegrationConfig,
    value: string
  ) {
    setIntegrations((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
        status:
          current[id].status === "未設定" || current[id].status === "要確認"
            ? current[id].status
            : "要確認",
      },
    }));
  }

  function saveIntegration(id: ChannelId) {
    setIntegrations((current) => {
      const target = current[id];
      const hasMinimumKeys =
        target.appId.trim().length > 0 && target.accessToken.trim().length > 0;
      const next = {
        ...current,
        [id]: {
          ...target,
          status: hasMinimumKeys ? "登録済み" : "要確認",
          updatedAt: hasMinimumKeys ? getTimestamp() : target.updatedAt,
        },
      };
      persistIntegrations(next);
      return next;
    });
  }

  function checkIntegrationInput(id: ChannelId) {
    setIntegrations((current) => {
      const target = current[id];
      const hasMinimumKeys =
        target.appId.trim().length > 0 && target.accessToken.trim().length > 0;
      const next = {
        ...current,
        [id]: {
          ...target,
          status: hasMinimumKeys ? "入力確認済み" : "要確認",
          updatedAt: hasMinimumKeys ? getTimestamp() : target.updatedAt,
        },
      };
      persistIntegrations(next);
      return next;
    });
  }

  function clearIntegration(id: ChannelId) {
    setIntegrations((current) => {
      const next = {
        ...current,
        [id]: createIntegration(id),
      };
      persistIntegrations(next);
      return next;
    });
  }

  function getStatusTone(status: ApiStatus) {
    if (status === "登録済み" || status === "入力確認済み") return "ready";
    if (status === "要確認") return "warning";
    return "idle";
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="SNS管理メニュー">
        <div className="brand-lockup">
          <div className="brand-mark">IX</div>
          <div>
            <p className="eyebrow">SNS Ops Console</p>
            <h1>Instatic TalksX</h1>
          </div>
        </div>

        <nav className="view-tabs" aria-label="表示切り替え">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                className={activeView === view.id ? "view-tab active" : "view-tab"}
                type="button"
                onClick={() => setActiveView(view.id)}
                aria-pressed={activeView === view.id}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{view.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="account-stack" aria-label="接続アカウント">
          <div className="section-title">
            <ShieldCheck aria-hidden="true" size={17} />
            <span>接続アカウント</span>
          </div>
          {channels.map((channel) => (
            <button
              className="account-row"
              key={channel.id}
              type="button"
              onClick={() => toggleChannel(channel.id)}
              aria-pressed={selectedChannels.includes(channel.id)}
            >
              <span className={`network-badge ${channel.tone}`}>
                {channel.label.slice(0, 2)}
              </span>
              <span>
                <strong>{channel.label}</strong>
                <small>{channel.handle}</small>
              </span>
              <span className="account-health">
                {integrations[channel.id].status}
              </span>
            </button>
          ))}
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">本日の運用</p>
            <h2>
              {activeView === "compose" && "投稿を作成"}
              {activeView === "calendar" && "予約カレンダー"}
              {activeView === "history" && "投稿履歴"}
              {activeView === "inbox" && "コメントとDM"}
              {activeView === "analytics" && "パフォーマンス分析"}
              {activeView === "settings" && "連携設定"}
            </h2>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search aria-hidden="true" size={17} />
              <span className="sr-only">検索</span>
              <input placeholder="投稿、返信、担当者を検索" />
            </label>
            <button className="icon-button" type="button" aria-label="同期">
              <RefreshCcw aria-hidden="true" size={18} />
            </button>
            <button
              className={
                activeView === "settings" ? "icon-button active-icon" : "icon-button"
              }
              type="button"
              aria-label="連携設定"
              onClick={() => setActiveView("settings")}
            >
              <Settings2 aria-hidden="true" size={18} />
            </button>
          </div>
        </header>

        <section className="status-strip" aria-label="運用状況">
          <div>
            <span>本日の投稿</span>
            <strong>8件</strong>
          </div>
          <div>
            <span>要返信</span>
            <strong>14件</strong>
          </div>
          <div>
            <span>承認待ち</span>
            <strong>3件</strong>
          </div>
          <div>
            <span>API状態</span>
            <strong>
              {registeredCount === channels.length
                ? "正常"
                : `${registeredCount}/${channels.length}`}
            </strong>
          </div>
        </section>

        {activeView === "compose" && (
          <section className="compose-layout" aria-label="投稿作成">
            <div className="composer-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Composer</p>
                  <h3>一括投稿を準備</h3>
                </div>
                <button className="ghost-button" type="button" onClick={optimizeCopy}>
                  <Wand2 aria-hidden="true" size={17} />
                  <span>文面を整える</span>
                </button>
              </div>

              <label className="field-label" htmlFor="post-copy">
                投稿本文
              </label>
              <textarea
                id="post-copy"
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                maxLength={460}
              />
              <div className="field-meta">
                <span>{postText.length}/460</span>
                <span>{selectedLabels.join(" / ") || "投稿先未選択"}</span>
              </div>

              <div className="file-upload-row">
                <label className="file-upload-button">
                  <Paperclip aria-hidden="true" size={17} />
                  <span>ファイルを添付</span>
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    onChange={handleFileSelection}
                  />
                </label>
                <span className="file-upload-note">最大4ファイル / 1ファイル1MBまで</span>
              </div>

              {attachedFiles.length > 0 && (
                <div className="attachment-list" aria-label="添付ファイル">
                  {attachedFiles.map((file) => (
                    <div className="attachment-chip" key={`${file.name}-${file.size}`}>
                      <FileText aria-hidden="true" size={15} />
                      <span>{file.name}</span>
                      <small>{formatFileSize(file.size)}</small>
                      <button
                        type="button"
                        onClick={() => removeAttachedFile(file.name)}
                        aria-label={`${file.name}を削除`}
                      >
                        <Trash2 aria-hidden="true" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="channel-toggle-grid" aria-label="投稿先">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    className={
                      selectedChannels.includes(channel.id)
                        ? `channel-toggle ${channel.tone} active`
                        : `channel-toggle ${channel.tone}`
                    }
                    onClick={() => toggleChannel(channel.id)}
                    aria-pressed={selectedChannels.includes(channel.id)}
                  >
                    <span className={`network-badge ${channel.tone}`}>
                      {channel.label.slice(0, 2)}
                    </span>
                    <span>
                      <strong>{channel.label}</strong>
                      <small>{channel.followers} followers</small>
                    </span>
                    {selectedChannels.includes(channel.id) && (
                      <CheckCircle2 aria-hidden="true" size={18} />
                    )}
                  </button>
                ))}
              </div>

              <div className="schedule-row">
                <label>
                  <span>公開予定</span>
                  <input
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    placeholder="今日 20:00"
                  />
                </label>
                <Button
                  className="primary-button"
                  type="button"
                  variant="primary"
                  onPress={schedulePost}
                  isDisabled={!canSchedule}
                >
                  <Plus aria-hidden="true" size={18} />
                  <span>投稿を予約</span>
                </Button>
              </div>
            </div>

            <aside className="preview-panel" aria-label="投稿プレビュー">
              <div className="phone-preview">
                <div className="phone-top">
                  <span />
                  <span />
                </div>
                <div className="preview-account">
                  <span className="avatar">IX</span>
                  <div>
                    <strong>Instatic TalksX</strong>
                    <small>{selectedLabels[0] || "Preview"}</small>
                  </div>
                </div>
                <div className="media-preview">
                  <Sparkles aria-hidden="true" size={28} />
                  <span>Campaign visual</span>
                </div>
                <p>{previewTitle}</p>
                <div className="preview-tags">
                  {selectedChannels.map((id) => (
                    <span key={id}>{channelById[id]?.label}</span>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        )}

        {activeView === "calendar" && (
          <section className="calendar-layout" aria-label="予約投稿一覧">
            <div className="calendar-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Schedule</p>
                  <h3>予約投稿</h3>
                </div>
                <button className="ghost-button" type="button">
                  <CalendarDays aria-hidden="true" size={17} />
                  <span>週表示</span>
                </button>
              </div>

              <div className="queue-list">
                {queue.map((post) => (
                  <article className="queue-card" key={post.id}>
                    <div className="queue-time">
                      <Clock3 aria-hidden="true" size={16} />
                      <span>{post.time}</span>
                    </div>
                    <div>
                      <h4>{post.title}</h4>
                      <p>
                        {post.format} / 担当 {post.owner}
                      </p>
                      <div className="mini-badge-row">
                        {post.channels.map((channelId) => (
                          <span
                            className={`mini-badge ${channelById[channelId]?.tone}`}
                            key={`${post.id}-${channelId}`}
                          >
                            {channelById[channelId]?.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="status-pill">{post.status}</span>
                  </article>
                ))}
              </div>
            </div>

            <aside className="approval-panel">
              <div className="section-title">
                <UsersRound aria-hidden="true" size={17} />
                <span>承認フロー</span>
              </div>
              <div className="approval-step done">
                <CheckCircle2 aria-hidden="true" size={17} />
                <span>下書き作成</span>
              </div>
              <div className="approval-step done">
                <CheckCircle2 aria-hidden="true" size={17} />
                <span>ブランド確認</span>
              </div>
              <div className="approval-step current">
                <AlertCircle aria-hidden="true" size={17} />
                <span>責任者レビュー</span>
              </div>
              <div className="approval-step">
                <Send aria-hidden="true" size={17} />
                <span>公開キュー</span>
              </div>
            </aside>
          </section>
        )}

        {activeView === "history" && (
          <section className="history-layout" aria-label="投稿履歴">
            <div className="history-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Archive</p>
                  <h3>過去の投稿</h3>
                </div>
                <span className="count-pill">{history.length}件</span>
              </div>

              <div className="history-list">
                {history.map((record) => (
                  <button
                    className={
                      selectedHistoryId === record.id
                        ? "history-card active"
                        : "history-card"
                    }
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedHistoryId(record.id)}
                  >
                    <div className="history-card-main">
                      <strong>{record.title}</strong>
                      <small>
                        {record.time} / {record.owner} / {record.format}
                      </small>
                      <div className="mini-badge-row">
                        {record.channels.map((channelId) => (
                          <span
                            className={`mini-badge ${channelById[channelId]?.tone}`}
                            key={`${record.id}-${channelId}`}
                          >
                            {channelById[channelId]?.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={`status-pill ${
                        record.status === "失敗" ? "warning" : "ready"
                      }`}
                    >
                      {record.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <aside className="history-detail-panel">
              {selectedHistory ? (
                <>
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Post Detail</p>
                      <h3>{selectedHistory.title}</h3>
                    </div>
                    <History aria-hidden="true" size={20} />
                  </div>
                  <div className="history-detail-meta">
                    <span>{selectedHistory.status}</span>
                    <span>{selectedHistory.time}</span>
                    <span>保存日時 {selectedHistory.savedAt}</span>
                  </div>
                  <p className="history-body">{selectedHistory.body}</p>
                  <div className="mini-badge-row">
                    {selectedHistory.channels.map((channelId) => (
                      <span
                        className={`mini-badge ${channelById[channelId]?.tone}`}
                        key={`detail-${selectedHistory.id}-${channelId}`}
                      >
                        {channelById[channelId]?.label}
                      </span>
                    ))}
                  </div>
                  <div className="history-files">
                    <div className="section-title">
                      <Paperclip aria-hidden="true" size={16} />
                      <span>保存ファイル</span>
                    </div>
                    {selectedHistory.files.length > 0 ? (
                      selectedHistory.files.map((file) => (
                        <a
                          className="saved-file-row"
                          href={file.dataUrl}
                          download={file.name}
                          key={`${selectedHistory.id}-${file.name}`}
                        >
                          <FileText aria-hidden="true" size={17} />
                          <span>
                            <strong>{file.name}</strong>
                            <small>{formatFileSize(file.size)}</small>
                          </span>
                          <Download aria-hidden="true" size={16} />
                        </a>
                      ))
                    ) : (
                      <p className="empty-note">この投稿に保存ファイルはありません。</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-note">履歴を選択してください。</p>
              )}
            </aside>
          </section>
        )}

        {activeView === "inbox" && (
          <section className="inbox-layout" aria-label="コメントとDM">
            <div className="conversation-list">
              {inboxItems.map((item) => (
                <article className="conversation-card" key={`${item.source}-${item.user}`}>
                  <span className="message-icon">
                    <MessageSquare aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <div className="conversation-head">
                      <strong>{item.user}</strong>
                      <span>{item.source}</span>
                    </div>
                    <p>{item.body}</p>
                    <small>
                      優先度 {item.priority} / {item.age}
                    </small>
                  </div>
                  <button className="icon-button" type="button" aria-label="返信へ進む">
                    <ChevronRight aria-hidden="true" size={18} />
                  </button>
                </article>
              ))}
            </div>

            <aside className="reply-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Reply Assist</p>
                  <h3>返信テンプレート</h3>
                </div>
                <Megaphone aria-hidden="true" size={20} />
              </div>
              <button className="reply-chip" type="button">
                料金プランを案内
              </button>
              <button className="reply-chip" type="button">
                素材送付先を案内
              </button>
              <button className="reply-chip" type="button">
                不具合を確認中
              </button>
              <textarea defaultValue="お問い合わせありがとうございます。確認して、担当者から本日中にご案内します。" />
              <Button className="primary-button" type="button" variant="primary">
                <Send aria-hidden="true" size={18} />
                <span>下書きを作成</span>
              </Button>
            </aside>
          </section>
        )}

        {activeView === "analytics" && (
          <section className="analytics-layout" aria-label="分析">
            <div className="analytics-grid">
              {analytics.map((item) => (
                <article className="metric-card" key={item.label}>
                  <div className="metric-head">
                    <LineChart aria-hidden="true" size={18} />
                    <span>{item.delta}</span>
                  </div>
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                  <div className="meter">
                    <span style={{ width: item.size }} />
                  </div>
                </article>
              ))}
            </div>

            <div className="insight-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Insights</p>
                  <h3>今週伸びている要因</h3>
                </div>
                <Sparkles aria-hidden="true" size={20} />
              </div>
              <div className="insight-row">
                <span>01</span>
                <p>15秒以内の動画で保存率が高く、TikTokからInstagramへの再利用が効いています。</p>
              </div>
              <div className="insight-row">
                <span>02</span>
                <p>Xでは質問形式の投稿が返信数を押し上げています。Threadsにも同じ型を転用できます。</p>
              </div>
              <div className="insight-row">
                <span>03</span>
                <p>コメント対応は公開後30分以内の初動がよく、要返信キューを短く保つ価値があります。</p>
              </div>
            </div>
          </section>
        )}

        {activeView === "settings" && (
          <section className="settings-layout" aria-label="SNS API連携設定">
            <aside className="integration-list-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Connections</p>
                  <h3>SNS API</h3>
                </div>
                <span className="count-pill">
                  {registeredCount}/{channels.length}
                </span>
              </div>

              <div className="integration-list">
                {channels.map((channel) => (
                  <button
                    className={
                      activeIntegrationId === channel.id
                        ? "integration-item active"
                        : "integration-item"
                    }
                    key={channel.id}
                    type="button"
                    onClick={() => setActiveIntegrationId(channel.id)}
                    aria-pressed={activeIntegrationId === channel.id}
                  >
                    <span className={`network-badge ${channel.tone}`}>
                      {channel.label.slice(0, 2)}
                    </span>
                    <span>
                      <strong>{channel.label}</strong>
                      <small>{integrations[channel.id].updatedAt}</small>
                    </span>
                    <span
                      className={`connection-dot ${getStatusTone(
                        integrations[channel.id].status
                      )}`}
                      aria-label={integrations[channel.id].status}
                    />
                  </button>
                ))}
              </div>
            </aside>

            <section className="integration-editor-panel">
              <div className="panel-heading">
                <div className="integration-title">
                  <span className={`network-badge ${activeChannel?.tone}`}>
                    {activeChannel?.label.slice(0, 2)}
                  </span>
                  <div>
                    <p className="eyebrow">{activeChannel?.label}</p>
                    <h3>API情報を登録</h3>
                  </div>
                </div>
                <span
                  className={`status-pill ${getStatusTone(
                    activeIntegration.status
                  )}`}
                >
                  {activeIntegration.status}
                </span>
              </div>

              <div className="form-grid">
                <label className="integration-field">
                  <span>
                    <KeyRound aria-hidden="true" size={15} />
                    Client ID / App ID
                  </span>
                  <input
                    value={activeIntegration.appId}
                    onChange={(event) =>
                      updateIntegration(
                        activeIntegrationId,
                        "appId",
                        event.target.value
                      )
                    }
                    placeholder={`${activeChannel?.label} App ID`}
                    autoComplete="off"
                  />
                </label>

                <label className="integration-field">
                  <span>
                    <KeyRound aria-hidden="true" size={15} />
                    Client Secret
                  </span>
                  <div className="secret-input">
                    <input
                      type={secretInputType}
                      value={activeIntegration.clientSecret}
                      onChange={(event) =>
                        updateIntegration(
                          activeIntegrationId,
                          "clientSecret",
                          event.target.value
                        )
                      }
                      placeholder="••••••••••••••••"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      aria-label="シークレット表示切り替え"
                      onClick={() =>
                        setShowSecrets((current) => ({
                          ...current,
                          [activeIntegrationId]: !current[activeIntegrationId],
                        }))
                      }
                    >
                      {showSecrets[activeIntegrationId] ? (
                        <EyeOff aria-hidden="true" size={17} />
                      ) : (
                        <Eye aria-hidden="true" size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <label className="integration-field">
                  <span>
                    <ShieldCheck aria-hidden="true" size={15} />
                    Access Token
                  </span>
                  <input
                    type={secretInputType}
                    value={activeIntegration.accessToken}
                    onChange={(event) =>
                      updateIntegration(
                        activeIntegrationId,
                        "accessToken",
                        event.target.value
                      )
                    }
                    placeholder="長期アクセストークン"
                    autoComplete="off"
                  />
                </label>

                <label className="integration-field">
                  <span>
                    <RefreshCcw aria-hidden="true" size={15} />
                    Refresh Token
                  </span>
                  <input
                    type={secretInputType}
                    value={activeIntegration.refreshToken}
                    onChange={(event) =>
                      updateIntegration(
                        activeIntegrationId,
                        "refreshToken",
                        event.target.value
                      )
                    }
                    placeholder="任意"
                    autoComplete="off"
                  />
                </label>

                <label className="integration-field wide">
                  <span>
                    <Link2 aria-hidden="true" size={15} />
                    Callback URL
                  </span>
                  <input
                    value={activeIntegration.callbackUrl}
                    onChange={(event) =>
                      updateIntegration(
                        activeIntegrationId,
                        "callbackUrl",
                        event.target.value
                      )
                    }
                    placeholder="https://example.com/oauth/callback"
                    autoComplete="off"
                  />
                </label>

                <label className="integration-field">
                  <span>
                    <ShieldCheck aria-hidden="true" size={15} />
                    Webhook Secret
                  </span>
                  <input
                    type={secretInputType}
                    value={activeIntegration.webhookSecret}
                    onChange={(event) =>
                      updateIntegration(
                        activeIntegrationId,
                        "webhookSecret",
                        event.target.value
                      )
                    }
                    placeholder="コメント/DM受信用"
                    autoComplete="off"
                  />
                </label>

                <label className="integration-field wide">
                  <span>
                    <Settings2 aria-hidden="true" size={15} />
                    Scopes
                  </span>
                  <textarea
                    value={activeIntegration.scopes}
                    onChange={(event) =>
                      updateIntegration(
                        activeIntegrationId,
                        "scopes",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <div className="settings-actions">
                <Button
                  className="primary-button"
                  type="button"
                  variant="primary"
                  onPress={() => saveIntegration(activeIntegrationId)}
                >
                  <Save aria-hidden="true" size={18} />
                  <span>登録</span>
                </Button>
                <Button
                  className="ghost-button"
                  type="button"
                  variant="secondary"
                  onPress={() => checkIntegrationInput(activeIntegrationId)}
                >
                  <CheckCircle2 aria-hidden="true" size={18} />
                  <span>入力確認</span>
                </Button>
                <Button
                  className="danger-button"
                  type="button"
                  variant="danger"
                  onPress={() => clearIntegration(activeIntegrationId)}
                >
                  <Trash2 aria-hidden="true" size={18} />
                  <span>削除</span>
                </Button>
              </div>
            </section>

            <aside className="integration-summary-panel">
              <div className="section-title">
                <PlugZap aria-hidden="true" size={17} />
                <span>登録状況</span>
              </div>
              {channels.map((channel) => (
                <div className="summary-row" key={`summary-${channel.id}`}>
                  <span className={`network-badge ${channel.tone}`}>
                    {channel.label.slice(0, 2)}
                  </span>
                  <div>
                    <strong>{channel.label}</strong>
                    <small>{integrations[channel.id].status}</small>
                  </div>
                  <span
                    className={`connection-dot ${getStatusTone(
                      integrations[channel.id].status
                    )}`}
                  />
                </div>
              ))}
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
