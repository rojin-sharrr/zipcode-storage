import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Note: '/api/search' is now a Vercel serverless function (see ./api/search.js),
// not a separate Express server — so there's no dev proxy target here anymore.
// For local full-stack testing, run `vercel dev` from this directory instead of
// `npm run dev` — it serves the Vite app and the api/ functions together on one port.
export default defineConfig({
  plugins: [react()],
});
