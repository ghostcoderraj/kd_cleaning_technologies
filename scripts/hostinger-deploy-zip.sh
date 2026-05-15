#!/usr/bin/env bash
# Production zip for Hostinger Node.js Apps (upload in hPanel, NOT File Manager → public_html).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="$ROOT/hostinger-deploy.zip"

echo "Building and staging for Hostinger..."
npm run build:hostinger

if [[ ! -f deploy/public/index.html || ! -f deploy/server/server.js ]]; then
  echo "Staging failed — deploy/public/index.html or deploy/server/server.js missing."
  exit 1
fi

echo "Creating hostinger-deploy.zip (ready-to-run, no src/dist folders)..."
rm -f "$OUT"

zip -r "$OUT" \
  app.js \
  package.json \
  package-lock.json \
  hostinger.json \
  env.hostinger.example \
  deploy \
  -x "*.DS_Store" -x "*/__MACOSX/*"

echo ""
echo "Created: $OUT"
echo ""
echo "Upload in hPanel: Websites → Add Website → Node.js Apps → Upload ZIP"
echo ""
echo "Use these settings (important — wrong output dir causes 403):"
echo "  Framework:     Other"
echo "  Node version:  22"
echo "  Build command: npm install --omit=dev"
echo "  Start command: npm start"
echo "  Entry file:    app.js"
echo "  Output dir:    (leave EMPTY — do not use dist or deploy/public)"
echo ""
echo "Add env vars from env.hostinger.example before deploying."
