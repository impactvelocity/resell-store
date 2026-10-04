#!/usr/bin/env bash
# Renders thumbnail.html to thumbnail.png (2400x1600, 3:2) with headless Chrome.
# Needs a network connection for Google Fonts.
set -euo pipefail
cd "$(dirname "$0")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars --no-first-run \
  --allow-file-access-from-files --force-device-scale-factor=2 \
  --window-size=1200,800 --virtual-time-budget=5000 \
  --screenshot="$PWD/thumbnail.png" "file://$PWD/thumbnail.html"
sips -s format jpeg -s formatOptions 90 thumbnail.png --out thumbnail.jpg >/dev/null
