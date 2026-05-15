/**
 * Hostinger build entry: use pre-built deploy/ from zip, or run Vite when source exists.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prebuilt =
  existsSync(path.join(root, "deploy/public/index.html")) &&
  existsSync(path.join(root, "deploy/server/server.js"));

if (prebuilt) {
  console.log("hostinger-build: using pre-built deploy/ (skip Vite)");
  process.exit(0);
}

if (!existsSync(path.join(root, "index.html"))) {
  console.error(
    "hostinger-build: index.html is missing at project root. Commit index.html and src/main.tsx, then redeploy.",
  );
  process.exit(1);
}

console.log("hostinger-build: running Vite production build...");
const vite = spawnSync("npx", ["vite", "build"], { cwd: root, stdio: "inherit", shell: true });
if (vite.status !== 0) process.exit(vite.status ?? 1);

const stage = spawnSync("node", ["scripts/hostinger-stage.mjs"], { cwd: root, stdio: "inherit" });
process.exit(stage.status ?? 0);
