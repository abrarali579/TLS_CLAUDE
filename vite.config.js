import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_NAME = 'TimeLink-Suite.html';

/** Ship the build under the app's real name instead of Vite's index.html. */
function nameTheOutput() {
  return {
    name: 'name-the-output',
    closeBundle() {
      const from = resolve('dist', 'index.html');
      if (existsSync(from)) renameSync(from, resolve('dist', OUT_NAME));
    },
  };
}

/**
 * Builds src/ into ONE self-contained HTML file, so the app keeps the property
 * that makes it pleasant to use: double-click it and it runs — no server, no
 * install, nothing to deploy. The source stays modular; the deliverable stays
 * a single file.
 */
export default defineConfig({
  root: 'src',
  plugins: [viteSingleFile(), nameTheOutput()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // This is an internal tool, not a public website. Readable output is worth
    // far more than a few saved kilobytes the first time something misbehaves.
    minify: false,
    target: 'es2020',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 5000,
  },
});
