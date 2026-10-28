import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot: string = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: projectRoot,
  base: '/typhoon/',
  resolve: {
    alias: { '@': projectRoot },
  },
  build: {
    outDir: 'dist',
  },
});
