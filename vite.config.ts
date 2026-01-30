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
      // Ensure proper MIME types for module scripts
      middlewareMode: false,
      fs: {
        strict: false,
        allow: ['..'],
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
        // Force single React instance to prevent "useLayoutEffect" errors
        "react": path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
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
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Ensure proper chunk ordering - React must load first
          chunkFileNames: (chunkInfo) => {
            // React vendor chunk must be loaded first
            if (chunkInfo.name === 'react-vendor') {
              return 'assets/react-vendor-[hash].js';
            }
            return 'assets/[name]-[hash].js';
          },
          manualChunks(id) {
            // CRITICAL: NEVER split React - always keep it in main bundle
            // This prevents "useLayoutEffect" errors in production
            // React and React-DOM must be in the same chunk as the entry point
            if (
              id.includes('react') || 
              id.includes('react-dom') ||
              id.includes('react/jsx-runtime') ||
              id.includes('react/jsx-dev-runtime') ||
              id.includes('scheduler')
            ) {
              // Return undefined to keep in main entry bundle
              return undefined;
            }
            
            // Split large vendor libraries into separate chunks for better caching
            if (id.includes('node_modules')) {
              if (id.includes('@mui/material') || id.includes('@mui/icons-material')) {
                return 'mui';
              }
              if (id.includes('@mantine')) {
                return 'mantine';
              }
              if (id.includes('antd')) {
                return 'antd';
              }
              if (id.includes('supabase')) {
                return 'supabase';
              }
              // All other node_modules
              return 'vendor';
            }
          },
        },
        // Ensure React chunk is loaded before other chunks
        external: [],
        onwarn(warning, warn) {
          // Suppress warnings about circular dependencies in React
          if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('react')) {
            return;
          }
          warn(warning);
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      sourcemap: mode === 'development',
      // Ensure React is not tree-shaken incorrectly
      minify: 'esbuild',
    },
  };
});
