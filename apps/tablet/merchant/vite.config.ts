import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const rootSrc = path.resolve(__dirname, "../../..", "src");
const repoRoot = path.resolve(__dirname, "../../..");

export default defineConfig(({ mode }) => {
  // Merchant app is only used as Capacitor/mobile; production build must use relative base so assets load in WebView
  const base = mode === "production" ? "./" : "/";

  return {
    base,
    root: __dirname,

    // Load .env from repo root so tablet app has same VITE_* vars as main app (Supabase, Stripe, Mapbox, etc.)
    envDir: repoRoot,
    publicDir: path.resolve(__dirname, "./public"),

    server: {
      host: "0.0.0.0",
      port: 8092,
      strictPort: false,
      open: false,
      cors: true,
      fs: {
        allow: [
          __dirname,
          path.resolve(__dirname, "../../..", "src"),
          path.resolve(__dirname, "../.."),
        ],
      },
      hmr: { protocol: "ws", reconnect: true },
      watch: { usePolling: false },
    },

    plugins: [react()],
    css: { postcss: "./postcss.config.js" },

    resolve: {
      alias: {
        "@": rootSrc,
        "@root": rootSrc,
        "@tablet": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },

    build: {
      outDir: path.resolve(__dirname, "./dist"),
      emptyOutDir: true,
      sourcemap: mode === "development",
      commonjsOptions: { transformMixedEsModules: true },

      rollupOptions: {
        output: {
          // Split heavy libs so WebView gets smaller initial chunks and can load in parallel
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@mantine") || id.includes("@emotion")) return "mantine";
              if (id.includes("@supabase")) return "supabase";
              if (id.includes("react-router") || id.includes("@tanstack/react-query")) return "router-query";
              return "vendor";
            }
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },

      // Match main web app target for broader WebView compatibility
      target: "es2020",
      minify: "esbuild",
    },

    optimizeDeps: {
      entries: ["index.html"],
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/notifications",
        "@supabase/supabase-js",
      ],
      force: false,
    },
  };
});