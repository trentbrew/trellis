#!/usr/bin/env bash
# Build locally, stage .vercel/output, deploy with --prebuilt.
# Use this when deploying via CLI without Git (monorepo root isn't uploaded).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SANDBOX="$ROOT/apps/wc-sandbox"
OUTPUT="$SANDBOX/.vercel/output"

bash "$SANDBOX/scripts/build.sh"

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/static"
cp "$SANDBOX/public/index.html" "$OUTPUT/static/"
cp "$SANDBOX/public/bootstrap.json" "$OUTPUT/static/"

cat > "$OUTPUT/config.json" << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "src": "/(.*)",
      "headers": {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless"
      },
      "continue": true
    },
    {
      "src": "/api/bootstrap",
      "dest": "/bootstrap.json"
    },
    {
      "handle": "filesystem"
    }
  ]
}
EOF

echo "→ vercel deploy --prebuilt $*"
cd "$SANDBOX"
exec vercel deploy --prebuilt "$@"
