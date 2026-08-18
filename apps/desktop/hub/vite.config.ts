import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '../../..');
const rootSrc = path.join(repositoryRoot, 'src');

export default defineConfig(({ mode }) => ({
  root: __dirname,
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  envDir: repositoryRoot,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 8095,
    strictPort: true,
    open: false,
    fs: {
      strict: false,
      allow: [__dirname, rootSrc, repositoryRoot],
    },
  },
  resolve: {
    alias: {
      '@': rootSrc,
      '@desktop': path.resolve(__dirname, 'src'),
      'react-is': path.join(repositoryRoot, 'node_modules/react-is'),
      '@mui/utils/node_modules/react-is': path.join(repositoryRoot, 'node_modules/react-is'),
      '@tabler/icons-react': path.join(
        repositoryRoot,
        'node_modules/@tabler/icons-react/dist/cjs/tabler-icons-react.cjs',
      ),
      '@capacitor/synapse': path.join(rootSrc, 'shims/capacitorSynapse.ts'),
    },
    dedupe: ['react', 'react-dom', 'react-is'],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.cjs'),
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'react-is',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mantine/core',
      '@mantine/hooks',
      '@mantine/notifications',
      '@tanstack/react-query',
      'dayjs',
    ],
    exclude: ['pdfjs-dist', 'monaco-editor'],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: mode === 'development',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1800,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [
        'pdfjs-dist',
        'monaco-editor',
        'nodemailer',
        'express',
        'helmet',
        'body-parser',
        'cors',
        'stripe',
        'pg',
        'sharp',
        'snyk',
        'bcryptjs',
      ],
    },
  },
}));
