"use client";

import { Button } from "@heroui/react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type AdminView = "posts" | "files" | "activity" | "users";
type AccessState = "checking" | "granted" | "denied";
type PostStatus = "draft" | "scheduled" | "published" | "failed";

type UserProfileRow = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type MembershipRow = {
  workspace_id: string;
  user_id: string;
  role: string;
};

type PostRow = {
  id: string;
  workspace_id: string;
  title: string;
  body: string;
  scheduled_at: string | null;
  status: PostStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  social_post_channels: Array<{ channel: string }> | null;
};

type FileRow = {
  id: string;
  workspace_id: string;
  post_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  created_by: string;
  created_at: string;
};

type AuditRow = {
  id: number;
  workspace_id: string | null;
  actor_user_id: string | null;
  action: "insert" | "update" | "delete";
  entity_type: string;
  entity_id: string | null;
  label: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type IntegrationRow = {
  id: string;
  workspace_id: string;
  channel: string;
  status: string;
};

const adminViews = [
  { id: "posts" as const, label: "投稿", icon: FileText },
  { id: "files" as const, label: "ファイル", icon: FolderOpen },
  { id: "activity" as const, label: "操作履歴", icon: Activity },
  { id: "users" as const, label: "利用者", icon: Users },
];

const statusOptions: Array<{ value: PostStatus; label: string }> = [
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "予約済み" },
  { value: "published", label: "公開済み" },
  { value: "failed", label: "失敗" },
];

const actionLabels = {
  insert: "作成",
  update: "更新",
  delete: "削除",
};

const entityLabels: Record<string, string> = {
  social_workspaces: "ワークスペース",
  social_workspace_members: "メンバー",
  social_posts: "投稿",
  social_post_channels: "投稿先",
  social_post_files: "ファイル",
  social_integrations: "SNS連携",
};

function formatDateTime(value: string | null) {
  if (!value) return "未記録";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(value: number) {
  const size = Number(value);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

export default function AdminConsole() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase));
  const [access, setAccess] = useState<AccessState>(
    supabase ? "checking" : "denied",
  );
  const [activeView, setActiveView] = useState<AdminView>("posts");
  const [dataLoading, setDataLoading] = useState(false);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PostStatus>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<UserProfileRow[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) setAccess("denied");
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) setAccess("denied");
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.user_id, profile])),
    [profiles],
  );
  const workspaceById = useMemo(
    () =>
      new Map(workspaces.map((workspace) => [workspace.id, workspace.name])),
    [workspaces],
  );
  const postById = useMemo(
    () => new Map(posts.map((post) => [post.id, post])),
    [posts],
  );

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ja");
  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (statusFilter !== "all" && post.status !== statusFilter) {
          return false;
        }
        if (!normalizedQuery) return true;
        const owner = profileById.get(post.created_by)?.email ?? "";
        const workspace = workspaceById.get(post.workspace_id) ?? "";
        const channels = (post.social_post_channels ?? [])
          .map((item) => item.channel)
          .join(" ");
        return [post.title, post.body, owner, workspace, channels]
          .join(" ")
          .toLocaleLowerCase("ja")
          .includes(normalizedQuery);
      }),
    [
      normalizedQuery,
      posts,
      profileById,
      statusFilter,
      workspaceById,
    ],
  );
  const filteredFiles = useMemo(
    () =>
      files.filter((file) => {
        if (!normalizedQuery) return true;
        const owner = profileById.get(file.created_by)?.email ?? "";
        const workspace = workspaceById.get(file.workspace_id) ?? "";
        const post = postById.get(file.post_id)?.title ?? "";
        return [
          file.file_name,
          file.content_type,
          owner,
          workspace,
          post,
        ]
          .join(" ")
          .toLocaleLowerCase("ja")
          .includes(normalizedQuery);
      }),
    [
      files,
      normalizedQuery,
      postById,
      profileById,
      workspaceById,
    ],
  );
  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter((log) => {
        if (!normalizedQuery) return true;
        const actor = log.actor_user_id
          ? profileById.get(log.actor_user_id)?.email ?? ""
          : "";
        const workspace = log.workspace_id
          ? workspaceById.get(log.workspace_id) ?? ""
          : "";
        return [
          log.label,
          actionLabels[log.action],
          entityLabels[log.entity_type] ?? log.entity_type,
          actor,
          workspace,
        ]
          .join(" ")
          .toLocaleLowerCase("ja")
          .includes(normalizedQuery);
      }),
    [auditLogs, normalizedQuery, profileById, workspaceById],
  );
  const filteredProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          !normalizedQuery ||
          profile.email.toLocaleLowerCase("ja").includes(normalizedQuery),
      ),
    [normalizedQuery, profiles],
  );

  const loadAdminData = useCallback(async () => {
    if (!supabase) return;
    setDataLoading(true);
    setNotice(null);

    try {
      const [
        profilesResult,
        workspacesResult,
        membershipsResult,
        postsResult,
        filesResult,
        auditResult,
        integrationsResult,
      ] = await Promise.all([
        supabase
          .from("social_user_profiles")
          .select("user_id, email, created_at, last_sign_in_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("social_workspaces")
          .select("id, name, created_by, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("social_workspace_members")
          .select("workspace_id, user_id, role")
          .limit(1000),
        supabase
          .from("social_posts")
          .select(
            "id, workspace_id, title, body, scheduled_at, status, created_by, created_at, updated_at, social_post_channels(channel)",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("social_post_files")
          .select(
            "id, workspace_id, post_id, storage_path, file_name, content_type, file_size, created_by, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("social_audit_logs")
          .select(
            "id, workspace_id, actor_user_id, action, entity_type, entity_id, label, metadata, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("social_integrations")
          .select("id, workspace_id, channel, status")
          .limit(1000),
      ]);

      const failedResult = [
        profilesResult,
        workspacesResult,
        membershipsResult,
        postsResult,
        filesResult,
        auditResult,
        integrationsResult,
      ].find((result) => result.error);

      if (failedResult?.error) throw failedResult.error;

      setProfiles((profilesResult.data ?? []) as UserProfileRow[]);
      setWorkspaces((workspacesResult.data ?? []) as WorkspaceRow[]);
      setMemberships((membershipsResult.data ?? []) as MembershipRow[]);
      setPosts((postsResult.data ?? []) as unknown as PostRow[]);
      setFiles((filesResult.data ?? []) as FileRow[]);
      setAuditLogs((auditResult.data ?? []) as unknown as AuditRow[]);
      setIntegrations((integrationsResult.data ?? []) as IntegrationRow[]);
    } catch (error) {
      setNotice(
        getErrorMessage(error, "管理データの読み込みに失敗しました。"),
      );
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;

    void supabase
      .from("social_admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setAccess("denied");
          return;
        }

        setAccess("granted");
        await loadAdminData();
      });

    return () => {
      active = false;
    };
  }, [loadAdminData, user]);

  async function updatePostStatus(postId: string, status: PostStatus) {
    if (!supabase) return;
    setUpdatingPostId(postId);
    setNotice(null);

    const { error } = await supabase
      .from("social_posts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (error) {
      setNotice(getErrorMessage(error, "投稿ステータスを更新できませんでした。"));
    } else {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, status, updated_at: new Date().toISOString() }
            : post,
        ),
      );
    }
    setUpdatingPostId(null);
  }

  async function downloadFile(file: FileRow) {
    if (!supabase) return;
    setNotice(null);

    const { data, error } = await supabase.storage
      .from("post-files")
      .createSignedUrl(file.storage_path, 60, {
        download: file.file_name,
      });

    if (error || !data?.signedUrl) {
      setNotice(
        getErrorMessage(error, "ファイルのダウンロードURLを作成できませんでした。"),
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function getUserWorkspaceCount(userId: string) {
    const ids = new Set(
      workspaces
        .filter((workspace) => workspace.created_by === userId)
        .map((workspace) => workspace.id),
    );
    memberships
      .filter((membership) => membership.user_id === userId)
      .forEach((membership) => ids.add(membership.workspace_id));
    return ids.size;
  }

  if (sessionLoading || access === "checking") {
    return (
      <main className="admin-access-shell">
        <section className="admin-access-panel">
          <ShieldCheck aria-hidden="true" size={28} />
          <p className="eyebrow">Administrator</p>
          <h1>管理コンソール</h1>
          <div className="admin-access-loading">
            <Loader2 className="spin" aria-hidden="true" size={18} />
            <span>管理者権限を確認しています</span>
          </div>
        </section>
      </main>
    );
  }

  if (!supabase || !user || access === "denied") {
    return (
      <main className="admin-access-shell">
        <section className="admin-access-panel">
          <ShieldAlert aria-hidden="true" size={28} />
          <p className="eyebrow">Restricted</p>
          <h1>管理者専用ページ</h1>
          <p>
            {user
              ? "このアカウントには管理者権限がありません。"
              : "管理者アカウントでログインしてください。"}
          </p>
          <Link className="admin-back-link" href="/">
            <ArrowLeft aria-hidden="true" size={17} />
            <span>通常画面へ戻る</span>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-rail" aria-label="管理メニュー">
        <div className="brand-lockup">
          <div className="brand-mark">IX</div>
          <div>
            <p className="eyebrow">Admin Console</p>
            <h1>Instatic TalksX</h1>
          </div>
        </div>

        <div className="admin-role">
          <ShieldCheck aria-hidden="true" size={17} />
          <span>管理者権限</span>
        </div>

        <nav className="admin-nav" aria-label="管理ビュー">
          {adminViews.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                className={
                  activeView === view.id
                    ? "admin-nav-button active"
                    : "admin-nav-button"
                }
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{view.label}</span>
              </button>
            );
          })}
        </nav>

        <Link className="admin-rail-back" href="/">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>通常画面</span>
        </Link>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">全体管理</p>
            <h2>管理コンソール</h2>
          </div>
          <div className="admin-header-actions">
            <span className="admin-session">
              <CheckCircle2 aria-hidden="true" size={15} />
              {user.email}
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label="管理データを更新"
              title="管理データを更新"
              disabled={dataLoading}
              onClick={() => void loadAdminData()}
            >
              <RefreshCcw
                className={dataLoading ? "spin" : undefined}
                aria-hidden="true"
                size={18}
              />
            </button>
          </div>
        </header>

        <section className="admin-metrics" aria-label="全体件数">
          <div>
            <span>利用者</span>
            <strong>{profiles.length}</strong>
          </div>
          <div>
            <span>ワークスペース</span>
            <strong>{workspaces.length}</strong>
          </div>
          <div>
            <span>投稿</span>
            <strong>{posts.length}</strong>
          </div>
          <div>
            <span>ファイル</span>
            <strong>{files.length}</strong>
          </div>
          <div>
            <span>有効なSNS連携</span>
            <strong>
              {
                integrations.filter(
                  (integration) => integration.status === "configured",
                ).length
              }
            </strong>
          </div>
        </section>

        {notice && (
          <div className="app-notice error" role="status">
            <ShieldAlert aria-hidden="true" size={17} />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)}>
              閉じる
            </button>
          </div>
        )}

        <div className="admin-toolbar">
          <label className="admin-search">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">管理データを検索</span>
            <input
              placeholder="利用者、投稿、ファイルを検索"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          {activeView === "posts" && (
            <label className="admin-filter">
              <span>ステータス</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | PostStatus)
                }
              >
                <option value="all">すべて</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {activeView === "posts" && (
          <section className="admin-table-panel" aria-label="全投稿">
            <div className="admin-section-heading">
              <div>
                <h3>すべての投稿</h3>
                <p>{filteredPosts.length}件を表示</p>
              </div>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>投稿内容</th>
                    <th>利用者</th>
                    <th>ワークスペース</th>
                    <th>投稿先</th>
                    <th>公開予定</th>
                    <th>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => (
                    <tr key={post.id}>
                      <td className="admin-primary-cell">
                        <strong>{post.title || "無題の投稿"}</strong>
                        <span>{post.body || "本文なし"}</span>
                      </td>
                      <td>{profileById.get(post.created_by)?.email ?? "不明"}</td>
                      <td>{workspaceById.get(post.workspace_id) ?? "不明"}</td>
                      <td>
                        <div className="admin-channel-list">
                          {(post.social_post_channels ?? []).map((item) => (
                            <span key={item.channel}>{item.channel}</span>
                          ))}
                        </div>
                      </td>
                      <td>{formatDateTime(post.scheduled_at)}</td>
                      <td>
                        <select
                          className={`admin-status ${post.status}`}
                          aria-label={`${post.title}のステータス`}
                          value={post.status}
                          disabled={updatingPostId === post.id}
                          onChange={(event) =>
                            void updatePostStatus(
                              post.id,
                              event.target.value as PostStatus,
                            )
                          }
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPosts.length === 0 && (
              <div className="admin-empty">
                <FileText aria-hidden="true" size={22} />
                <span>条件に一致する投稿はありません。</span>
              </div>
            )}
          </section>
        )}

        {activeView === "files" && (
          <section className="admin-table-panel" aria-label="全ファイル">
            <div className="admin-section-heading">
              <div>
                <h3>すべてのファイル</h3>
                <p>{filteredFiles.length}件を表示</p>
              </div>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ファイル</th>
                    <th>投稿</th>
                    <th>利用者</th>
                    <th>ワークスペース</th>
                    <th>保存日時</th>
                    <th>
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => (
                    <tr key={file.id}>
                      <td className="admin-primary-cell">
                        <strong>{file.file_name}</strong>
                        <span>
                          {file.content_type} ・ {formatFileSize(file.file_size)}
                        </span>
                      </td>
                      <td>{postById.get(file.post_id)?.title ?? "投稿なし"}</td>
                      <td>{profileById.get(file.created_by)?.email ?? "不明"}</td>
                      <td>{workspaceById.get(file.workspace_id) ?? "不明"}</td>
                      <td>{formatDateTime(file.created_at)}</td>
                      <td className="admin-action-cell">
                        <Button
                          className="admin-download-button"
                          size="sm"
                          variant="secondary"
                          aria-label={`${file.file_name}をダウンロード`}
                          onPress={() => void downloadFile(file)}
                        >
                          <Download aria-hidden="true" size={16} />
                          <span>取得</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredFiles.length === 0 && (
              <div className="admin-empty">
                <FolderOpen aria-hidden="true" size={22} />
                <span>条件に一致するファイルはありません。</span>
              </div>
            )}
          </section>
        )}

        {activeView === "activity" && (
          <section className="admin-table-panel" aria-label="全操作履歴">
            <div className="admin-section-heading">
              <div>
                <h3>操作履歴</h3>
                <p>{filteredAuditLogs.length}件を表示</p>
              </div>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>操作</th>
                    <th>対象</th>
                    <th>利用者</th>
                    <th>ワークスペース</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td>
                        <span className={`admin-action ${log.action}`}>
                          {actionLabels[log.action]}
                        </span>
                      </td>
                      <td className="admin-primary-cell">
                        <strong>
                          {entityLabels[log.entity_type] ?? log.entity_type}
                        </strong>
                        <span>{log.label || "詳細なし"}</span>
                      </td>
                      <td>
                        {log.actor_user_id
                          ? profileById.get(log.actor_user_id)?.email ?? "不明"
                          : "システム"}
                      </td>
                      <td>
                        {log.workspace_id
                          ? workspaceById.get(log.workspace_id) ?? "削除済み"
                          : "対象外"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredAuditLogs.length === 0 && (
              <div className="admin-empty">
                <Activity aria-hidden="true" size={22} />
                <span>条件に一致する操作履歴はありません。</span>
              </div>
            )}
          </section>
        )}

        {activeView === "users" && (
          <section className="admin-table-panel" aria-label="全利用者">
            <div className="admin-section-heading">
              <div>
                <h3>利用者一覧</h3>
                <p>{filteredProfiles.length}名を表示</p>
              </div>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>利用者</th>
                    <th>登録日時</th>
                    <th>最終ログイン</th>
                    <th>ワークスペース</th>
                    <th>投稿</th>
                    <th>ファイル</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.user_id}>
                      <td className="admin-primary-cell">
                        <strong>{profile.email || "メール未登録"}</strong>
                        <span>{profile.user_id.slice(0, 8)}</span>
                      </td>
                      <td>{formatDateTime(profile.created_at)}</td>
                      <td>{formatDateTime(profile.last_sign_in_at)}</td>
                      <td>{getUserWorkspaceCount(profile.user_id)}</td>
                      <td>
                        {
                          posts.filter(
                            (post) => post.created_by === profile.user_id,
                          ).length
                        }
                      </td>
                      <td>
                        {
                          files.filter(
                            (file) => file.created_by === profile.user_id,
                          ).length
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProfiles.length === 0 && (
              <div className="admin-empty">
                <Users aria-hidden="true" size={22} />
                <span>条件に一致する利用者はいません。</span>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
