/**
 * Feeder dev server – runs from apps/feeder.
 * Uses root src via alias @ -> ../../src. Original root vite.config.ts left unchanged.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: __dirname,
  base: "/",
  publicDir: path.resolve(__dirname, "../../public"),

  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    open: false,
    cors: true,
    warmup: {
      clientFiles: ["./index.html", "./src/main.tsx"],
    },
    hmr: {
      overlay: true,
      protocol: "ws",
      host: "localhost",
      reconnect: true,
    },
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**"],
    },
    fs: {
      strict: false,
      allow: ["../.."],
    },
  },

  plugins: [react()],

  css: {
    postcss: "./postcss.config.js",
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
    },
    dedupe: ["react", "react-dom"],
    conditions: ["import", "module", "browser", "default"],
  },

  optimizeDeps: {
    entries: ["index.html", "src/main.tsx"],
    include: [
      "hoist-non-react-statics",
      "prop-types",
      "react-is",
      "@emotion/react",
      "@emotion/styled",
      "deepmerge",
      "@mui/utils",
      "@tabler/icons-react",
    ],
    exclude: [
      "@mui/material",
      "@mui/system",
      "@mui/icons-material",
      "@mui/x-data-grid",
      "@mui/x-date-pickers",
    ],
    esbuildOptions: {
      target: "es2020",
    },
  },

  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: true,
    minify: "esbuild",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      onwarn(warning, warn) {
        if (
          warning.code === "CIRCULAR_DEPENDENCY" &&
          warning.message.includes("react")
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
});
