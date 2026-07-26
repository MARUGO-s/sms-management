# Graph Report - .  (2026-07-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 326 nodes · 343 edges · 32 communities (25 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `96acd595`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 30

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `scripts` - 15 edges
3. `processJob()` - 8 edges
4. `include` - 7 edges
5. `createCropPlan()` - 5 edges
6. `safeRelativeReturnPath()` - 4 edges
7. `getDb()` - 4 edges
8. `lib` - 4 edges
9. `rest()` - 4 edges
10. `appPath()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getDb()`  [EXTRACTED]
  examples/d1/app/api/notes/route.ts → db/index.ts
- `POST()` --calls--> `getDb()`  [EXTRACTED]
  examples/d1/app/api/notes/route.ts → db/index.ts
- `processJob()` --calls--> `createCropPlan()`  [EXTRACTED]
  workers/media-processor/processor.mjs → workers/media-processor/crop-plan.mjs
- `SocialConsole()` --calls--> `appPath()`  [EXTRACTED]
  app/social-console.tsx → app/lib/public-path.ts

## Import Cycles
- None detected.

## Communities (32 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (29): appPath(), aspectOptions, defaultMediaCrop, MediaAspect, MediaCropConfig, MediaEditorProps, ApiStatus, channelById (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): @cloudflare/vite-plugin, drizzle-kit, eslint, eslint-config-next, devDependencies, @cloudflare/vite-plugin, drizzle-kit, eslint (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (21): AccessState, actionLabels, AdminConsole(), AdminUserRow, AdminView, adminViews, AuditRow, entityLabels (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): architectureHash, colors, docsDir, edgeColors, escapeHtml(), escapeXml(), generatedAt, graph (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): engines, node, name, private, scripts, backup:dropbox, build, build:github-pages (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (17): drizzle-orm, @heroui/react, @heroui/styles, lucide-react, next, dependencies, drizzle-orm, @heroui/react (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (13): clamp(), createCropPlan(), outputByAspect, apiHeaders(), encodeObjectPath(), probeVideo(), processJob(), required (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (10): args, includeGenerated, limit, limitArg, matchingExcerpt(), normalize(), query, results (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (10): backupDir, backupRoot, fileDir, headers, listStorageFiles(), manifest, supabaseFetch(), tableDir (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (9): collectFiles(), errors, exists(), gitStatus, manifestPath, projectDir, requiredRepoFiles, requiredVaultFiles (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.39
Nodes (8): chatGPTSignInPath(), chatGPTSignOutPath(), ChatGPTUser, getChatGPTUser(), isReservedAuthPath(), requireChatGPTUser(), safeDecodeURIComponent(), safeRelativeReturnPath()

### Community 13 - "Community 13"
Cohesion: 0.39
Nodes (5): getDb(), GET(), POST(), toRouteErrorMessage(), notes

### Community 14 - "Community 14"
Cohesion: 0.32
Nodes (6): DispatchPayload, encodeBase64Url(), getGoogleAccessToken(), GoogleServiceAccount, mediaJobsFunction, privateKeyBytes()

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (3): Env, ExecutionContext, worker

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (4): expression, normalizedBasePath, outputDirectory, prefixes

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (4): Action, ChannelId, channels, secretFields

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (5): name, private, scripts, test, type

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): KNOWLEDGE_VAULT_APP_DIR, KNOWLEDGE_VAULT_GRAPHIFY_DIR, update-knowledge-vault.sh script

### Community 21 - "Community 21"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 22 - "Community 22"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

## Knowledge Gaps
- **183 isolated node(s):** `ChatGPTUser`, `MediaAspect`, `aspectOptions`, `MediaEditorProps`, `eslintConfig` (+178 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 1` to `Community 4`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 6` to `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `ChatGPTUser`, `MediaAspect`, `aspectOptions` to the rest of the system?**
  _183 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05897435897435897 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09881422924901186 - nodes in this community are weakly interconnected._