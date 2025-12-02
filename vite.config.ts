import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const stripLovableAttributes = (): any => ({
  name: 'strip-lovable-attributes',
  enforce: 'post' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) {
      return null;
    }
    if (!code.includes('data-lov-')) {
      return null;
    }
    const cleaned = code.replace(/\sdata-lov-[^=]*="[^"]*"/g, '');
    return {
      code: cleaned,
      map: null,
    };
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isCapacitorBuild =
    process.env.CAPACITOR === 'true' ||
    process.env.BUILD_TARGET === 'capacitor';

  const base =
    mode === 'production'
      ? (isCapacitorBuild ? './' : '/')
      : '/';

  return {
    // Use relative paths only when building for Capacitor so native apps can load bundles
    base,
    server: {
      host: "::",
      port: 8080,
      strictPort: false,
      open: false,
      cors: true,
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      stripLovableAttributes(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        '@mui/material',
        '@mui/icons-material',
        '@mui/x-data-grid',
        '@mui/x-date-pickers',
      ],
      exclude: [
        '@huggingface/transformers',
        'onnxruntime-common',
        'onnxruntime-web',
      ],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      sourcemap: mode === 'development',
    },
  };
});
