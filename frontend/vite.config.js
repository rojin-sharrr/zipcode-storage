import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// '/api/*' routes are Vercel serverless functions (see ./api/*.js) in
// production. For local dev, run `npm run dev:api` in a second terminal —
// it runs those same handler files via scripts/dev-api-server.mjs on
// port 4001, and this proxy forwards /api requests to it. `vercel dev` is
// also an option for higher-fidelity testing, but this proxy is the
// simpler day-to-day path.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
});
