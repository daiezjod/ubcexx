import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rootDir = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : path.resolve('.');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    esbuild: {
      drop: ['console' as const, 'debugger' as const],
      legalComments: 'none' as const,
    },
    build: {
      target: ['es2015', 'chrome60', 'safari11', 'edge18', 'firefox60'],
      cssTarget: ['chrome60', 'safari11'],
      sourcemap: false,
      minify: 'esbuild' as const,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
