import express from "express";
import { createMiddleware } from "@hattip/adapter-node";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function firstExisting(...candidates) {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[candidates.length - 1];
}

const staticDir = firstExisting(
  path.join(__dirname, "deploy/public"),
  path.join(__dirname, "public"),
  path.join(__dirname, "dist/client"),
);

const serverEntry = firstExisting(
  path.join(__dirname, "deploy/server/server.js"),
  path.join(__dirname, "server/server.js"),
  path.join(__dirname, "dist/server/server.js"),
);

const { default: serverHandler } = await import(pathToFileURL(serverEntry).href);

const app = express();
app.set("trust proxy", 1);

app.use(express.static(staticDir, { index: ["index.html"] }));

const ssrMiddleware = createMiddleware((ctx) =>
  serverHandler.fetch(ctx.request, process.env, ctx),
);

app.use(ssrMiddleware);

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on port ${port} (static: ${staticDir})`);
});
