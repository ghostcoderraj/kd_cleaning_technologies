/**
 * Flattens Vite output for Hostinger:
 *   dist/client → public/   (static assets + fallback index.html)
 *   dist/server → server/   (SSR bundle)
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distClient = path.join(root, "dist/client");
const distServer = path.join(root, "dist/server/server.js");
const deployDir = path.join(root, "deploy");
const publicDir = path.join(deployDir, "public");
const serverDir = path.join(deployDir, "server");

if (!existsSync(distClient) || !existsSync(distServer)) {
  console.error("Run `npm run build` first — dist/client and dist/server are missing.");
  process.exit(1);
}

await rm(deployDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

await cp(distClient, publicDir, { recursive: true });
await cp(path.join(root, "dist/server"), serverDir, { recursive: true });

// Prerender home page so static hosting / misconfigured output does not return 403.
const { default: serverHandler } = await import(`file://${distServer}`);
const home = await serverHandler.fetch(new Request("http://localhost/"), process.env, {});
if (home.ok) {
  await writeFile(path.join(publicDir, "index.html"), await home.text(), "utf8");
  console.log("Wrote deploy/public/index.html (SSR fallback for /)");
}

// SPA fallback when Apache serves public/ without Node (deep links still need Node for SSR data).
await writeFile(
  path.join(publicDir, ".htaccess"),
  `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`,
  "utf8",
);

console.log("Hostinger staging complete: deploy/public/ + deploy/server/");
