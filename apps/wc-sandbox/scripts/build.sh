#!/usr/bin/env bash
# Build static Vercel assets into apps/wc-sandbox/public/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUT="$ROOT/apps/wc-sandbox/public"
ASSETS="$ROOT/src/wc/assets"

mkdir -p "$OUT"
node "$ROOT/bin/trellis.mjs" sandbox pack -P "$ROOT" -o "$OUT/bootstrap.json"
cp "$ASSETS/index.html" "$OUT/index.html"
echo "✓ $OUT"
