#!/usr/bin/env bash

set -euo pipefail

# Update the Obsidian knowledge vault for Instatic TalksX.
# - Refreshes the in-admin Graphify system map (code-only).
# - Exports the code graph as Obsidian notes into the app's 90_Graphify folder.
# The vault is code-only: never point Graphify at env files, secrets, or data.

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"

# Vault Graphify output folder. Override with KNOWLEDGE_VAULT_GRAPHIFY_DIR.
vault_graphify_dir="${KNOWLEDGE_VAULT_GRAPHIFY_DIR:-/Users/yoshito/Library/CloudStorage/Dropbox/web/アプリ知識/10_アプリ別/Instatic TalksX/90_Graphify}"

if ! command -v graphify >/dev/null 2>&1; then
  echo "Graphify CLI is required. Install it before updating the knowledge vault." >&2
  exit 1
fi

echo "[knowledge] refreshing admin system map (code-only)..."
npm run graphify:system-map

echo "[knowledge] exporting Obsidian notes to vault..."
mkdir -p "$vault_graphify_dir"
graphify export obsidian --dir "$vault_graphify_dir"

echo "[knowledge] guard: scanning vault output for secret markers..."
if grep -RilE "service_role|supabase_secret_key|-----BEGIN [A-Z ]*PRIVATE KEY-----|client_secret|sb_secret" "$vault_graphify_dir" >/dev/null 2>&1; then
  echo "ERROR: potential secret found in generated vault output. Inspect $vault_graphify_dir before syncing." >&2
  exit 1
fi

echo "[knowledge] done. Vault Graphify folder updated: $vault_graphify_dir"
