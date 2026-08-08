// Local stand-in for Vercel's serverless functions during `npm run dev`.
// Runs the exact same handlers in frontend/api/*.js — no separate copy of
// the logic to keep in sync. `vercel dev` is the higher-fidelity option for
// testing (it emulates Vercel more closely), but this is faster and more
// predictable for day-to-day local iteration.

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, '..', 'api');
const PORT = process.env.DEV_API_PORT || 4001;

// Minimal .env.local loader (no dependency needed — Vercel normally does
// this injection for us, but this shim runs outside Vercel).
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

function addVercelResHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return res;
}

async function readJsonBody(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

const server = createServer(async (req, res) => {
  addVercelResHelpers(res);

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const name = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  const filePath = path.join(apiDir, `${name}.js`);

  if (!name || name.startsWith('_') || !existsSync(filePath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  req.body = await readJsonBody(req);

  try {
    // Cache-busting query string so edits to api/*.js are picked up without
    // restarting this process.
    const mod = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
    await mod.default(req, res);
  } catch (err) {
    console.error(`[dev-api] error in ${name}.js:`, err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] serving frontend/api/*.js on http://localhost:${PORT}`);
});
