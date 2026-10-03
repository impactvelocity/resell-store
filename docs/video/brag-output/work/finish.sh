#!/usr/bin/env bash
# v2: poster frame + mix.wav → ../brag.mp4 and ../brag.jpg  (run ./mix.sh first)
set -euo pipefail
cd "$(dirname "$0")"
POSTER_T="${POSTER_T:-149.0}"
node render.mjs stills "$POSTER_T" >/dev/null
ffmpeg -y -loglevel error -i "stills/t$(printf '%07.2f' "$POSTER_T").png" -q:v 2 ../brag.jpg
ffmpeg -y -loglevel error -i video-silent.mp4 -i mix.wav -i ../brag.jpg \
  -filter_complex "[0:v][2:v]overlay=enable='eq(n,0)'[v]" -map "[v]" -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest -movflags +faststart ../brag.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 ../brag.mp4
