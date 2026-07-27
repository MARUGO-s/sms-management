#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
worker_dir="$project_dir/workers/media-processor"
image="${MEDIA_WORKER_DOCKER_IMAGE:-instatic-talksx-media-processor:local}"
platform="${MEDIA_WORKER_DOCKER_PLATFORM:-linux/amd64}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is required for the media worker container check." >&2
  exit 1
fi

echo "[worker:docker] building $image for $platform..."
docker build --platform "$platform" --load -t "$image" "$worker_dir"

echo "[worker:docker] checking Node, FFmpeg, libx264, and non-root runtime..."
docker run --rm --platform "$platform" --entrypoint sh "$image" -c \
  'node --version && ffmpeg -version | head -1 && ffmpeg -encoders 2>/dev/null | grep -q libx264 && echo libx264-ready && test "$(id -u)" != "0" && id'

echo "[worker:docker] running crop and encoding plan tests inside the image..."
docker run --rm \
  --platform "$platform" \
  -v "$worker_dir/crop-plan.test.mjs:/app/crop-plan.test.mjs:ro" \
  -v "$worker_dir/encoding-plan.test.mjs:/app/encoding-plan.test.mjs:ro" \
  --entrypoint node \
  "$image" \
  --test /app/crop-plan.test.mjs /app/encoding-plan.test.mjs

echo "[worker:docker] encoding and probing a real 9:16 MP4..."
docker run --rm --platform "$platform" --entrypoint sh "$image" -c '
  set -eu
  work="$(mktemp -d)"
  filter="$(node --input-type=module -e "import { createCropPlan } from '\''./crop-plan.mjs'\''; console.log(createCropPlan(1280, 720, { aspect: '\''9:16'\'', zoom: 100, positionX: 50, positionY: 50 }).filter)")"
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "testsrc2=size=1280x720:rate=30" \
    -f lavfi -i "sine=frequency=1000:sample_rate=48000" \
    -t 1 \
    -vf "$filter" \
    -c:v libx264 -preset ultrafast -crf 30 \
    -pix_fmt yuv420p \
    -c:a aac -b:a 96k \
    -shortest -movflags +faststart \
    "$work/output.mp4"
  video="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "$work/output.mp4")"
  audio="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$work/output.mp4")"
  duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$work/output.mp4")"
  test "$video" = "h264,1080,1920"
  test "$audio" = "aac"
  test -s "$work/output.mp4"
  echo "video=$video audio=$audio duration=${duration}s"
'

echo "[worker:docker] passed; unrelated running containers were not modified"
