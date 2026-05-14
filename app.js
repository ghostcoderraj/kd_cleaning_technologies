import express from 'express';
import { createMiddleware } from '@hattip/adapter-node';
import serverHandler from './dist/server/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Serve static assets from the client build directory
app.use(express.static(path.join(__dirname, 'dist/client')));

// Wrap the Cloudflare fetch handler to work with Node.js
const ssrMiddleware = createMiddleware((ctx) => {
  return serverHandler.fetch(ctx.request, process.env, ctx);
});

// Pass all other requests to TanStack Start SSR
app.use(ssrMiddleware);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Hostinger Node.js Server listening on port ${port}`);
});
