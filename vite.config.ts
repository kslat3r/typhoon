import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const projectRoot: string = fileURLToPath(new URL('.', import.meta.url));

function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle(): void {
      const dist: string = join(projectRoot, 'dist');
      const swPath: string = join(dist, 'sw.js');
      const assets: string = readdirSync(join(dist, 'assets')).sort().join('\n');
      const buildId: string = createHash('sha256').update(assets).digest('hex').slice(0, 10);
      writeFileSync(swPath, readFileSync(swPath, 'utf8').replaceAll('__BUILD_ID__', buildId));
    },
  };
}

export default defineConfig({
  root: projectRoot,
  base: '/typhoon/',
  resolve: {
    alias: { '@': projectRoot },
  },
  plugins: [stampServiceWorker()],
  build: {
    outDir: 'dist',
  },
});
