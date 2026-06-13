import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

const isWebOnly = process.env.WEB_ONLY === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(!isWebOnly ? [
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist/electron',
              rollupOptions: {
                external: ['better-sqlite3', 'electron-updater', 'bufferutil', 'utf-8-validate'],
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload();
          },
          vite: {
            build: {
              outDir: 'dist/electron',
            },
          },
        },
      ]),
      renderer(),
    ] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
      '@db': path.resolve(__dirname, './database'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
