#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
worker_dir="$project_dir/workers/media-processor"
image="${MEDIA_WORKER_DOCKER_IMAGE:-instatic-talksx-media-processor:local}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is required for the media worker container check." >&2
  exit 1
fi

echo "[worker:docker] building $image..."
docker build -t "$image" "$worker_dir"

echo "[worker:docker] checking Node, FFmpeg, libx264, and non-root runtime..."
docker run --rm --entrypoint sh "$image" -c \
  'node --version && ffmpeg -version | head -1 && ffmpeg -encoders 2>/dev/null | grep -q libx264 && echo libx264-ready && test "$(id -u)" != "0" && id'

echo "[worker:docker] running crop-plan tests inside the image..."
docker run --rm \
  -v "$worker_dir/crop-plan.test.mjs:/app/crop-plan.test.mjs:ro" \
  --entrypoint node \
  "$image" \
  --test /app/crop-plan.test.mjs

echo "[worker:docker] passed; unrelated running containers were not modified"
