"use client";

import { Button } from "@heroui/react";
import type { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  History,
  Inbox,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  LogOut,
  Paperclip,
  PlugZap,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { supabase } from "./lib/supabase";

type ChannelId = "instagram" | "tiktok" | "x" | "threads";
type ViewId =
  | "compose"
  | "calendar"
  | "history"
  | "inbox"
  | "analytics"
  | "settings";
type ApiStatus = "未設定" | "登録済み" | "入力確認済み" | "要確認";
type RecordStatus = "下書き" | "予約済み" | "公開済み" | "失敗";

type LocalAttachment = {
  file: File;
  name: string;
  size: number;
  type: string;
};

type SavedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
};

type HistoryRecord = {
  id: string;
  title: string;
  body: string;
  time: string;
  channels: ChannelId[];
  status: RecordStatus;
  owner: string;
  format: string;
  savedAt: string;
  files: SavedFile[];
};

type SecretFlags = {
  clientSecret: boolean;
  accessToken: boolean;
  refreshToken: boolean;
  webhookSecret: boolean;
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
  stored: SecretFlags;
};

type DbPostRow = {
  id: string;
  title: string;
  body: string;
  scheduled_at: string | null;
  status: "draft" | "scheduled" | "published" | "failed";
  owner_name: string;
  format: string;
  created_at: string;
  social_post_channels: Array<{ channel: ChannelId }> | null;
  social_post_files: Array<{
    id: string;
    file_name: string;
    file_size: number;
    content_type: string;
    storage_path: string;
  }> | null;
};

const emptySecretFlags: SecretFlags = {
  clientSecret: false,
  accessToken: false,
  refreshToken: false,
  webhookSecret: false,
};

const channels: Array<{
  id: ChannelId;
  label: string;
  tone: string;
}> = [
  { id: "instagram", label: "Instagram", tone: "pink" },
  { id: "tiktok", label: "TikTok", tone: "cyan" },
  { id: "x", label: "X", tone: "ink" },
  { id: "threads", label: "Threads", tone: "violet" },
];

const defaultScopes: Record<ChannelId, string> = {
  instagram: "content_publish, instagram_manage_comments, instagram_basic",
  tiktok: "video.publish, user.info.basic, comment.list",
  x: "tweet.read, tweet.write, users.read, offline.access",
  threads: "threads_basic, threads_content_publish, threads_manage_replies",
};

const views: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: "compose", label: "投稿", icon: Send },
  { id: "calendar", label: "予約", icon: CalendarDays },
  { id: "history", label: "履歴", icon: History },
  { id: "inbox", label: "受信箱", icon: Inbox },
  { id: "analytics", label: "分析", icon: BarChart3 },
  { id: "settings", label: "連携", icon: PlugZap },
];

const channelById = Object.fromEntries(
  channels.map((channel) => [channel.id, channel]),
) as Record<ChannelId, (typeof channels)[number]>;

function createIntegration(id: ChannelId): IntegrationConfig {
  return {
    appId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
    callbackUrl: "",
    webhookSecret: "",
    scopes: defaultScopes[id],
    status: "未設定",
    updatedAt: "未保存",
    stored: { ...emptySecretFlags },
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function formatDateTime(value: string | null) {
  if (!value) return "日時未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusLabel(status: DbPostRow["status"]): RecordStatus {
  if (status === "scheduled") return "予約済み";
  if (status === "published") return "公開済み";
  if (status === "failed") return "失敗";
  return "下書き";
}

function safeFileName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned.slice(-120) || "file";
}

export default function SocialConsole() {
  const [activeView, setActiveView] = useState<ViewId>("compose");
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[]>([]);
  const [postText, setPostText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<LocalAttachment[]>([]);
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
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [notice, setNotice] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null);
      setHistory([]);
      setIntegrations(createDefaultIntegrations());
      return;
    }
    void loadWorkspaceData(user);
  }, [user?.id]);

  const selectedLabels = useMemo(
    () => selectedChannels.map((id) => channelById[id].label),
    [selectedChannels],
  );
  const selectedHistory = history.find(
    (record) => record.id === selectedHistoryId,
  );
  const activeIntegration = integrations[activeIntegrationId];
  const activeChannel = channelById[activeIntegrationId];
  const secretInputType = showSecrets[activeIntegrationId]
    ? "text"
    : "password";
  const registeredCount = useMemo(
    () =>
      channels.filter((channel) =>
        ["登録済み", "入力確認済み"].includes(
          integrations[channel.id].status,
        ),
      ).length,
    [integrations],
  );
  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("ja");
    if (!query) return history;
    return history.filter((record) =>
      [record.title, record.body, record.owner, ...record.channels]
        .join(" ")
        .toLocaleLowerCase("ja")
        .includes(query),
    );
  }, [history, searchQuery]);
  const queue = filteredHistory.filter(
    (record) => record.status === "予約済み",
  );
  const analytics = useMemo(() => {
    const total = history.length;
    const scheduled = history.filter(
      (record) => record.status === "予約済み",
    ).length;
    const published = history.filter(
      (record) => record.status === "公開済み",
    ).length;
    const failed = history.filter((record) => record.status === "失敗").length;
    return [
      { label: "保存済み投稿", value: total, size: total ? "100%" : "0%" },
      {
        label: "予約中",
        value: scheduled,
        size: total ? `${Math.round((scheduled / total) * 100)}%` : "0%",
      },
      {
        label: "公開済み",
        value: published,
        size: total ? `${Math.round((published / total) * 100)}%` : "0%",
      },
      {
        label: "失敗",
        value: failed,
        size: total ? `${Math.round((failed / total) * 100)}%` : "0%",
      },
    ];
  }, [history]);

  async function loadWorkspaceData(currentUser: User) {
    if (!supabase) return;
    setDataLoading(true);
    setNotice(null);

    try {
      const { data: existingWorkspace, error: workspaceError } = await supabase
        .from("social_workspaces")
        .select("id, name")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (workspaceError) throw workspaceError;

      let activeWorkspace = existingWorkspace;
      if (!activeWorkspace) {
        const { data: createdWorkspace, error: createError } = await supabase
          .from("social_workspaces")
          .insert({
            name: "Instatic TalksX",
            created_by: currentUser.id,
          })
          .select("id, name")
          .single();
        if (createError) throw createError;
        activeWorkspace = createdWorkspace;
      }

      setWorkspaceId(activeWorkspace.id);

      const [postsResult, integrationsResult] = await Promise.all([
        supabase
          .from("social_posts")
          .select(
            "id, title, body, scheduled_at, status, owner_name, format, created_at, social_post_channels(channel), social_post_files(id, file_name, file_size, content_type, storage_path)",
          )
          .eq("workspace_id", activeWorkspace.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("social_integrations")
          .select(
            "channel, app_id, callback_url, scopes, status, updated_at",
          )
          .eq("workspace_id", activeWorkspace.id),
      ]);

      if (postsResult.error) throw postsResult.error;
      if (integrationsResult.error) throw integrationsResult.error;

      const records = ((postsResult.data ?? []) as unknown as DbPostRow[]).map(
        (post) => ({
          id: post.id,
          title: post.title,
          body: post.body,
          time: formatDateTime(post.scheduled_at),
          channels: (post.social_post_channels ?? []).map(
            (item) => item.channel,
          ),
          status: getStatusLabel(post.status),
          owner: post.owner_name || currentUser.email || "担当者",
          format: post.format,
          savedAt: formatDateTime(post.created_at),
          files: (post.social_post_files ?? []).map((file) => ({
            id: file.id,
            name: file.file_name,
            size: Number(file.file_size),
            type: file.content_type,
            storagePath: file.storage_path,
          })),
        }),
      );

      setHistory(records);
      setSelectedHistoryId((current) =>
        current && records.some((record) => record.id === current)
          ? current
          : records[0]?.id ?? null,
      );

      const nextIntegrations = createDefaultIntegrations();
      for (const row of integrationsResult.data ?? []) {
        const channel = row.channel as ChannelId;
        if (!channelById[channel]) continue;
        nextIntegrations[channel] = {
          ...nextIntegrations[channel],
          appId: row.app_id,
          callbackUrl: row.callback_url,
          scopes: row.scopes,
          status: row.status === "configured" ? "登録済み" : "要確認",
          updatedAt: formatDateTime(row.updated_at),
        };
      }

      const { data: secretData, error: secretError } =
        await supabase.functions.invoke("integration-secrets", {
          body: { action: "list", workspaceId: activeWorkspace.id },
        });

      if (!secretError && secretData?.status) {
        for (const channel of channels) {
          const stored = secretData.status[channel.id] as
            | SecretFlags
            | undefined;
          if (!stored) continue;
          nextIntegrations[channel.id].stored = stored;
          if (
            nextIntegrations[channel.id].appId &&
            stored.accessToken
          ) {
            nextIntegrations[channel.id].status = "登録済み";
          }
        }
      }

      setIntegrations(nextIntegrations);
    } catch (error) {
      setNotice({
        tone: "error",
        text: getErrorMessage(error, "データの読み込みに失敗しました。"),
      });
    } finally {
      setDataLoading(false);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthLoading(true);
    setAuthMessage("");

    const result =
      authMode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });

    if (result.error) {
      setAuthMessage(result.error.message);
    } else if (authMode === "signup" && !result.data.session) {
      setAuthMessage(
        "確認メールを送信しました。メール内のリンクから登録を完了してください。",
      );
    }
    setAuthLoading(false);
  }

  async function sendPasswordReset() {
    if (!supabase || !email.trim()) {
      setAuthMessage("メールアドレスを入力してください。");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setAuthMessage(
      error
        ? error.message
        : "パスワード再設定メールを送信しました。",
    );
  }

  function toggleChannel(id: ChannelId) {
    setSelectedChannels((current) =>
      current.includes(id)
        ? current.filter((channelId) => channelId !== id)
        : [...current, id],
    );
  }

  function optimizeCopy() {
    const base =
      postText.trim() ||
      "投稿本文を入力すると、運用向けの文面に整えられます。";
    setPostText(
      `${base}\n\n詳細はプロフィールのリンクからご確認ください。\n#SNS運用 #マーケティング`,
    );
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;

    const available = Math.max(0, 4 - attachedFiles.length);
    const accepted = picked
      .filter((file) => file.size <= 20 * 1024 * 1024)
      .slice(0, available)
      .map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      }));

    setAttachedFiles((current) => [...current, ...accepted]);
    if (accepted.length !== picked.length) {
      setNotice({
        tone: "info",
        text: "添付は最大4件、1ファイル20MBまでです。",
      });
    }
  }

  async function schedulePost() {
    if (
      !supabase ||
      !user ||
      !workspaceId ||
      !postText.trim() ||
      !selectedChannels.length ||
      !scheduledAt
    ) {
      setNotice({
        tone: "error",
        text: "本文、投稿先、公開予定日時を入力してください。",
      });
      return;
    }

    setSavingPost(true);
    setNotice(null);
    let postId: string | null = null;

    try {
      const title =
        postText.trim().replace(/\s+/g, " ").slice(0, 48) ||
        "予約投稿";
      const format = selectedChannels.includes("tiktok")
        ? "Short / Reel"
        : "Post";

      const { data: post, error: postError } = await supabase
        .from("social_posts")
        .insert({
          workspace_id: workspaceId,
          title,
          body: postText.trim(),
          scheduled_at: new Date(scheduledAt).toISOString(),
          status: "scheduled",
          owner_name: user.email ?? "担当者",
          format,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (postError) throw postError;
      postId = post.id;

      const { error: channelError } = await supabase
        .from("social_post_channels")
        .insert(
          selectedChannels.map((channel) => ({
            post_id: post.id,
            channel,
          })),
        );
      if (channelError) throw channelError;

      for (const attachment of attachedFiles) {
        const storagePath = `${workspaceId}/${post.id}/${crypto.randomUUID()}-${safeFileName(attachment.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("post-files")
          .upload(storagePath, attachment.file, {
            contentType: attachment.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { error: fileError } = await supabase
          .from("social_post_files")
          .insert({
            workspace_id: workspaceId,
            post_id: post.id,
            storage_path: storagePath,
            file_name: attachment.name,
            content_type: attachment.type,
            file_size: attachment.size,
            created_by: user.id,
          });
        if (fileError) throw fileError;
      }

      setPostText("");
      setScheduledAt("");
      setAttachedFiles([]);
      setNotice({
        tone: "success",
        text: "予約投稿と添付ファイルをSupabaseへ保存しました。",
      });
      await loadWorkspaceData(user);
      setActiveView("calendar");
    } catch (error) {
      if (postId) {
        await supabase
          .from("social_posts")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", postId);
      }
      setNotice({
        tone: "error",
        text: getErrorMessage(error, "予約投稿の保存に失敗しました。"),
      });
    } finally {
      setSavingPost(false);
    }
  }

  async function downloadFile(file: SavedFile) {
    if (!supabase) return;
    const { data, error } = await supabase.storage
      .from("post-files")
      .createSignedUrl(file.storagePath, 60, { download: file.name });
    if (error) {
      setNotice({ tone: "error", text: error.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function updateIntegration(
    id: ChannelId,
    key: keyof IntegrationConfig,
    value: string,
  ) {
    setIntegrations((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
        status:
          current[id].status === "未設定" ? "未設定" : "要確認",
      },
    }));
  }

  async function saveIntegration(id: ChannelId) {
    if (!supabase || !user || !workspaceId) return;
    const target = integrations[id];
    const hasAccessToken =
      Boolean(target.accessToken.trim()) || target.stored.accessToken;
    if (!target.appId.trim() || !hasAccessToken) {
      setNotice({
        tone: "error",
        text: "Client ID / App ID と Access Token は必須です。",
      });
      return;
    }

    setSavingIntegration(true);
    setNotice(null);

    try {
      const { error: metadataError } = await supabase
        .from("social_integrations")
        .upsert(
          {
            workspace_id: workspaceId,
            channel: id,
            app_id: target.appId.trim(),
            callback_url: target.callbackUrl.trim(),
            scopes: target.scopes.trim(),
            status: "configured",
            created_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,channel" },
        );
      if (metadataError) throw metadataError;

      const { data, error: secretError } = await supabase.functions.invoke(
        "integration-secrets",
        {
          body: {
            action: "save",
            workspaceId,
            channel: id,
            secrets: {
              clientSecret: target.clientSecret,
              accessToken: target.accessToken,
              refreshToken: target.refreshToken,
              webhookSecret: target.webhookSecret,
            },
          },
        },
      );
      if (secretError) throw secretError;

      setIntegrations((current) => ({
        ...current,
        [id]: {
          ...current[id],
          clientSecret: "",
          accessToken: "",
          refreshToken: "",
          webhookSecret: "",
          stored: data.status as SecretFlags,
          status: "登録済み",
          updatedAt: formatDateTime(new Date().toISOString()),
        },
      }));
      setNotice({
        tone: "success",
        text: `${channelById[id].label}の認証情報を安全に保存しました。`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: getErrorMessage(error, "連携情報の保存に失敗しました。"),
      });
    } finally {
      setSavingIntegration(false);
    }
  }

  function checkIntegrationInput(id: ChannelId) {
    const target = integrations[id];
    const ready =
      Boolean(target.appId.trim()) &&
      (Boolean(target.accessToken.trim()) || target.stored.accessToken);
    setIntegrations((current) => ({
      ...current,
      [id]: {
        ...current[id],
        status: ready ? "入力確認済み" : "要確認",
      },
    }));
    setNotice({
      tone: ready ? "success" : "error",
      text: ready
        ? "必須項目を確認しました。登録ボタンで保存してください。"
        : "Client ID / App ID と Access Token を確認してください。",
    });
  }

  async function clearIntegration(id: ChannelId) {
    if (!supabase || !workspaceId) return;
    setSavingIntegration(true);
    setNotice(null);

    try {
      const { error: secretError } = await supabase.functions.invoke(
        "integration-secrets",
        { body: { action: "delete", workspaceId, channel: id } },
      );
      if (secretError) throw secretError;

      const { error: metadataError } = await supabase
        .from("social_integrations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("channel", id);
      if (metadataError) throw metadataError;

      setIntegrations((current) => ({
        ...current,
        [id]: createIntegration(id),
      }));
      setNotice({
        tone: "success",
        text: `${channelById[id].label}の連携情報を削除しました。`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: getErrorMessage(error, "連携情報の削除に失敗しました。"),
      });
    } finally {
      setSavingIntegration(false);
    }
  }

  function getStatusTone(status: ApiStatus) {
    if (status === "登録済み" || status === "入力確認済み") return "ready";
    if (status === "要確認") return "warning";
    return "idle";
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <Loader2 className="spin" aria-hidden="true" size={28} />
        <p>安全な接続を確認しています</p>
      </main>
    );
  }

  if (!supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-mark">IX</div>
          <h1>設定が必要です</h1>
          <p>Supabaseの公開URLとPublishable Keyを設定してください。</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="auth-brand">
            <div className="brand-mark">IX</div>
            <div>
              <p className="eyebrow">SNS Ops Console</p>
              <h1>Instatic TalksX</h1>
            </div>
          </div>
          <div className="auth-heading">
            <LockKeyhole aria-hidden="true" size={20} />
            <div>
              <h2>{authMode === "signin" ? "ログイン" : "利用者登録"}</h2>
              <p>業務データはアカウントごとに保護されます。</p>
            </div>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              <span>メールアドレス</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>パスワード</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  authMode === "signin" ? "current-password" : "new-password"
                }
                minLength={8}
                required
              />
            </label>
            {authMessage && <p className="auth-message">{authMessage}</p>}
            <Button
              className="primary-button"
              type="submit"
              variant="primary"
              isDisabled={authLoading}
            >
              {authLoading ? (
                <Loader2 className="spin" aria-hidden="true" size={18} />
              ) : (
                <ShieldCheck aria-hidden="true" size={18} />
              )}
              <span>{authMode === "signin" ? "ログイン" : "登録する"}</span>
            </Button>
          </form>
          <div className="auth-actions">
            <button
              type="button"
              onClick={() => {
                setAuthMode((current) =>
                  current === "signin" ? "signup" : "signin",
                );
                setAuthMessage("");
              }}
            >
              {authMode === "signin"
                ? "初めて利用する方"
                : "登録済みの方"}
            </button>
            <button type="button" onClick={sendPasswordReset}>
              パスワードを再設定
            </button>
          </div>
        </section>
      </main>
    );
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
                className={
                  activeView === view.id ? "view-tab active" : "view-tab"
                }
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
              onClick={() => {
                setActiveIntegrationId(channel.id);
                setActiveView("settings");
              }}
            >
              <span className={`network-badge ${channel.tone}`}>
                {channel.label.slice(0, 2)}
              </span>
              <span>
                <strong>{channel.label}</strong>
                <small>API設定</small>
              </span>
              <span className="account-health">
                {integrations[channel.id].status}
              </span>
            </button>
          ))}
        </section>

        <div className="user-panel">
          <div>
            <strong>{user.email}</strong>
            <small>Supabaseで保護</small>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="ログアウト"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut aria-hidden="true" size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">本日の運用</p>
            <h2>
              {activeView === "compose" && "投稿を作成"}
              {activeView === "calendar" && "予約一覧"}
              {activeView === "history" && "投稿履歴"}
              {activeView === "inbox" && "コメントとDM"}
              {activeView === "analytics" && "運用集計"}
              {activeView === "settings" && "連携設定"}
            </h2>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search aria-hidden="true" size={17} />
              <span className="sr-only">検索</span>
              <input
                placeholder="投稿本文を検索"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <button
              className="icon-button"
              type="button"
              aria-label="同期"
              onClick={() => void loadWorkspaceData(user)}
              disabled={dataLoading}
            >
              <RefreshCcw
                className={dataLoading ? "spin" : undefined}
                aria-hidden="true"
                size={18}
              />
            </button>
            <button
              className={
                activeView === "settings"
                  ? "icon-button active-icon"
                  : "icon-button"
              }
              type="button"
              aria-label="連携設定"
              onClick={() => setActiveView("settings")}
            >
              <Settings2 aria-hidden="true" size={18} />
            </button>
          </div>
        </header>

        {notice && (
          <div className={`app-notice ${notice.tone}`} role="status">
            {notice.tone === "success" ? (
              <CheckCircle2 aria-hidden="true" size={17} />
            ) : notice.tone === "error" ? (
              <AlertCircle aria-hidden="true" size={17} />
            ) : (
              <Cloud aria-hidden="true" size={17} />
            )}
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="通知を閉じる"
            >
              閉じる
            </button>
          </div>
        )}

        <section className="status-strip" aria-label="運用状況">
          <div>
            <span>保存済み</span>
            <strong>{history.length}件</strong>
          </div>
          <div>
            <span>予約中</span>
            <strong>{queue.length}件</strong>
          </div>
          <div>
            <span>保存先</span>
            <strong>Supabase</strong>
          </div>
          <div>
            <span>API設定</span>
            <strong>
              {registeredCount === channels.length
                ? "完了"
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
                  <h3>予約投稿を保存</h3>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={optimizeCopy}
                >
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
                maxLength={2200}
                placeholder="投稿する内容を入力"
              />
              <div className="field-meta">
                <span>{postText.length}/2200</span>
                <span>
                  {selectedLabels.join(" / ") || "投稿先未選択"}
                </span>
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
                <span className="file-upload-note">
                  最大4ファイル / 1ファイル20MBまで
                </span>
              </div>

              {attachedFiles.length > 0 && (
                <div className="attachment-list" aria-label="添付ファイル">
                  {attachedFiles.map((file) => (
                    <div
                      className="attachment-chip"
                      key={`${file.name}-${file.size}`}
                    >
                      <FileText aria-hidden="true" size={15} />
                      <span>{file.name}</span>
                      <small>{formatFileSize(file.size)}</small>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachedFiles((current) =>
                            current.filter(
                              (item) =>
                                !(
                                  item.name === file.name &&
                                  item.size === file.size
                                ),
                            ),
                          )
                        }
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
                      <small>{integrations[channel.id].status}</small>
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
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </label>
                <Button
                  className="primary-button"
                  type="button"
                  variant="primary"
                  onPress={schedulePost}
                  isDisabled={savingPost}
                >
                  {savingPost ? (
                    <Loader2 className="spin" aria-hidden="true" size={18} />
                  ) : (
                    <Plus aria-hidden="true" size={18} />
                  )}
                  <span>予約として保存</span>
                </Button>
              </div>
            </div>

            <aside className="preview-panel" aria-label="保存内容">
              <div className="storage-summary">
                <Database aria-hidden="true" size={24} />
                <div>
                  <p className="eyebrow">Protected storage</p>
                  <h3>Supabaseへ保存</h3>
                </div>
                <dl>
                  <div>
                    <dt>本文・履歴</dt>
                    <dd>Database</dd>
                  </div>
                  <div>
                    <dt>画像・動画</dt>
                    <dd>Private Storage</dd>
                  </div>
                  <div>
                    <dt>アクセス</dt>
                    <dd>ログイン必須</dd>
                  </div>
                </dl>
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
                <span className="count-pill">{queue.length}件</span>
              </div>
              <div className="queue-list">
                {queue.length ? (
                  queue.map((post) => (
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
                              className={`mini-badge ${channelById[channelId].tone}`}
                              key={`${post.id}-${channelId}`}
                            >
                              {channelById[channelId].label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="status-pill ready">{post.status}</span>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <CalendarDays aria-hidden="true" size={24} />
                    <h3>予約投稿はありません</h3>
                    <p>投稿画面から予約内容を保存すると、ここに表示されます。</p>
                  </div>
                )}
              </div>
            </div>
            <aside className="approval-panel">
              <div className="section-title">
                <ShieldCheck aria-hidden="true" size={17} />
                <span>運用状態</span>
              </div>
              <div className="approval-step done">
                <CheckCircle2 aria-hidden="true" size={17} />
                <span>ログイン認証</span>
              </div>
              <div className="approval-step done">
                <CheckCircle2 aria-hidden="true" size={17} />
                <span>履歴の永続保存</span>
              </div>
              <div className="approval-step done">
                <CheckCircle2 aria-hidden="true" size={17} />
                <span>非公開ファイル保存</span>
              </div>
              <div className="approval-step current">
                <AlertCircle aria-hidden="true" size={17} />
                <span>SNS公開処理はAPI審査後</span>
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
                <span className="count-pill">
                  {filteredHistory.length}件
                </span>
              </div>
              <div className="history-list">
                {filteredHistory.length ? (
                  filteredHistory.map((record) => (
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
                              className={`mini-badge ${channelById[channelId].tone}`}
                              key={`${record.id}-${channelId}`}
                            >
                              {channelById[channelId].label}
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
                  ))
                ) : (
                  <div className="empty-state compact">
                    <History aria-hidden="true" size={22} />
                    <p>保存済みの投稿はありません。</p>
                  </div>
                )}
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
                        className={`mini-badge ${channelById[channelId].tone}`}
                        key={`detail-${selectedHistory.id}-${channelId}`}
                      >
                        {channelById[channelId].label}
                      </span>
                    ))}
                  </div>
                  <div className="history-files">
                    <div className="section-title">
                      <Paperclip aria-hidden="true" size={16} />
                      <span>保存ファイル</span>
                    </div>
                    {selectedHistory.files.length ? (
                      selectedHistory.files.map((file) => (
                        <button
                          className="saved-file-row"
                          type="button"
                          onClick={() => void downloadFile(file)}
                          key={file.id}
                        >
                          <FileText aria-hidden="true" size={17} />
                          <span>
                            <strong>{file.name}</strong>
                            <small>{formatFileSize(file.size)}</small>
                          </span>
                          <Download aria-hidden="true" size={16} />
                        </button>
                      ))
                    ) : (
                      <p className="empty-note">
                        この投稿に保存ファイルはありません。
                      </p>
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
          <section className="single-panel" aria-label="コメントとDM">
            <div className="empty-state">
              <Inbox aria-hidden="true" size={28} />
              <h3>受信データはまだありません</h3>
              <p>
                各SNSのWebhookとAPI審査が完了すると、コメントとDMをここへ取り込みます。
              </p>
              <Button
                className="ghost-button"
                type="button"
                variant="secondary"
                onPress={() => setActiveView("settings")}
              >
                <PlugZap aria-hidden="true" size={17} />
                <span>連携設定を開く</span>
              </Button>
            </div>
          </section>
        )}

        {activeView === "analytics" && (
          <section className="analytics-layout" aria-label="分析">
            <div className="analytics-grid">
              {analytics.map((item) => (
                <article className="metric-card" key={item.label}>
                  <div className="metric-head">
                    <Database aria-hidden="true" size={18} />
                    <span>Supabase</span>
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
                  <p className="eyebrow">Data scope</p>
                  <h3>現在の集計範囲</h3>
                </div>
                <BarChart3 aria-hidden="true" size={20} />
              </div>
              <p className="history-body">
                現在は、この管理画面に保存した投稿・予約・失敗件数を集計しています。
                SNS側のリーチ、保存、返信数は各APIの接続と審査完了後に取得します。
              </p>
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
                        integrations[channel.id].status,
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
                  <span className={`network-badge ${activeChannel.tone}`}>
                    {activeChannel.label.slice(0, 2)}
                  </span>
                  <div>
                    <p className="eyebrow">{activeChannel.label}</p>
                    <h3>API情報を登録</h3>
                  </div>
                </div>
                <span
                  className={`status-pill ${getStatusTone(
                    activeIntegration.status,
                  )}`}
                >
                  {activeIntegration.status}
                </span>
              </div>

              <div className="secure-note">
                <LockKeyhole aria-hidden="true" size={17} />
                <p>
                  秘密値は保存後に再表示されません。変更する項目だけ入力してください。
                </p>
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
                        event.target.value,
                      )
                    }
                    placeholder={`${activeChannel.label} App ID`}
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
                          event.target.value,
                        )
                      }
                      placeholder={
                        activeIntegration.stored.clientSecret
                          ? "保存済み（変更時のみ入力）"
                          : "未登録"
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label="シークレット表示切り替え"
                      onClick={() =>
                        setShowSecrets((current) => ({
                          ...current,
                          [activeIntegrationId]:
                            !current[activeIntegrationId],
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
                        event.target.value,
                      )
                    }
                    placeholder={
                      activeIntegration.stored.accessToken
                        ? "保存済み（変更時のみ入力）"
                        : "必須"
                    }
                    autoComplete="new-password"
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
                        event.target.value,
                      )
                    }
                    placeholder={
                      activeIntegration.stored.refreshToken
                        ? "保存済み（変更時のみ入力）"
                        : "任意"
                    }
                    autoComplete="new-password"
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
                        event.target.value,
                      )
                    }
                    placeholder={`https://your-domain.example/oauth/${activeIntegrationId}/callback`}
                    autoComplete="url"
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
                        event.target.value,
                      )
                    }
                    placeholder={
                      activeIntegration.stored.webhookSecret
                        ? "保存済み（変更時のみ入力）"
                        : "任意"
                    }
                    autoComplete="new-password"
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
                        event.target.value,
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
                  onPress={() => void saveIntegration(activeIntegrationId)}
                  isDisabled={savingIntegration}
                >
                  {savingIntegration ? (
                    <Loader2 className="spin" aria-hidden="true" size={18} />
                  ) : (
                    <Save aria-hidden="true" size={18} />
                  )}
                  <span>安全に登録</span>
                </Button>
                <Button
                  className="ghost-button"
                  type="button"
                  variant="secondary"
                  onPress={() => checkIntegrationInput(activeIntegrationId)}
                  isDisabled={savingIntegration}
                >
                  <CheckCircle2 aria-hidden="true" size={18} />
                  <span>入力確認</span>
                </Button>
                <Button
                  className="danger-button"
                  type="button"
                  variant="danger"
                  onPress={() => void clearIntegration(activeIntegrationId)}
                  isDisabled={savingIntegration}
                >
                  <Trash2 aria-hidden="true" size={18} />
                  <span>連携を削除</span>
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
                      integrations[channel.id].status,
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
