import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const componentTagger = (): any => ({
  name: 'component-tagger',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    // Only process React component files
    if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) {
      return null;
    }
    
    // Skip node_modules and other non-source files
    if (id.includes('node_modules') || id.includes('.d.ts')) {
      return null;
    }
    
    // Component tagger for Lovable Select feature
    // This plugin enables Lovable to identify and tag components
    // The actual tagging is handled by Lovable's runtime
    return null;
  },
});

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
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
      open: false,
      cors: true,
      hmr: {
        overlay: true,
        protocol: 'ws',
        host: 'localhost',
        // Make HMR more resilient to connection issues
        reconnect: true,
      },
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**'],
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
      componentTagger(),
      stripLovableAttributes(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ['react', 'react-dom'], // Ensure single React instance
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
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
