import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const isCapacitorBuild =
    process.env.CAPACITOR === 'true' ||
    process.env.BUILD_TARGET === 'capacitor';

  const base =
    mode === 'production'
      ? (isCapacitorBuild ? './' : '/')
      : '/';

  return {
    base,
    root: __dirname,
    publicDir: path.resolve(__dirname, './public'), // Fixed: use local public folder
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
      open: false,
      cors: true,
      hmr: {
        host: 'localhost',
        port: 8080,
        protocol: 'ws',
        clientPort: 8080,
      },
      watch: {
        usePolling: false,
      },
    },
    plugins: [react()],
    css: {
      postcss: './postcss.config.js',
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ['react', 'react-dom'], // Add this to fix React context issue
    },
    build: {
      outDir: path.resolve(__dirname, "./dist"),
      emptyOutDir: true,
      sourcemap: mode === 'development',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: ['react', 'react-dom'],
      force: true, // Force re-optimization to fix React instance issues
    },
  };
});