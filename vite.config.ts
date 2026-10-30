import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { readFileSync } from 'node:fs';

// Keep the displayed release version in sync with package.json at build time.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

export default defineConfig({
  plugins: [react(), cloudflare()],
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
});
