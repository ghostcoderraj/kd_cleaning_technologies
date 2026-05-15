#!/usr/bin/env bash
# Production zip for Hostinger Node.js Apps (upload in hPanel, NOT File Manager → public_html).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/hostinger-deploy.zip"

echo "Building and staging for Hostinger..."
npm run build:vite

if [[ ! -f deploy/public/index.html || ! -f deploy/server/server.js ]]; then
  echo "Staging failed — deploy/public/index.html or deploy/server/server.js missing."
  exit 1
fi

if [[ ! -f index.html || ! -f src/main.tsx ]]; then
  echo "Missing index.html or src/main.tsx at project root."
  exit 1
fi

echo "Creating hostinger-deploy.zip..."
rm -f "$OUT"

# Include index.html + src so Hostinger can run npm run build safely if it ignores pre-built deploy/.
zip -r "$OUT" \
  app.js \
  index.html \
  package.json \
  package-lock.json \
  hostinger.json \
  env.hostinger.example \
  vite.config.ts \
  tsconfig.json \
  tsconfig.app.json \
  tsconfig.node.json \
  components.json \
  scripts/hostinger-build.mjs \
  scripts/hostinger-stage.mjs \
  public \
  src \
  deploy \
  -x "*.DS_Store" -x "*/__MACOSX/*"

echo ""
echo "Created: $OUT"
echo ""
echo "hPanel settings:"
echo "  Framework:     Other"
echo "  Node version:  22"
echo "  Build command: npm install && npm run build"
echo "  Start command: npm start"
echo "  Entry file:    app.js"
echo "  Output dir:    deploy/public"
echo ""
echo "GitHub: push index.html, src/main.tsx, and all files above before redeploy."
