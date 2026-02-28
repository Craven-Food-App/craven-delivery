import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";

const rootSrc = path.resolve(__dirname, "../../..", "src");
const repoRoot = path.resolve(__dirname, "../../..");

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf-8")
) as { version?: string };

export default defineConfig(({ mode }) => {
  // Merchant app is only used as Capacitor/mobile; production build must use
  // relative base so assets load from file:// in the Android WebView.
  const base = mode === "production" ? "./" : "/";

  return {
    base,
    root: __dirname,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version ?? "1.0.0"),
      __APP_BUILD__: JSON.stringify(process.env.BUILD_NUMBER ?? process.env.CI ?? "1"),
    },

    // Load .env from repo root so tablet app has same VITE_* vars as main app
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
        // Force shared deps imported by @root/ files to resolve from merchant's
        // node_modules, not root's. Without this, App.tsx (merchant) and
        // RestaurantAuth.tsx (@root/pages) get different module instances of
        // react-router — HashRouter provides context on one copy while
        // useNavigate reads from another, causing the crash.
        "react-router-dom": path.resolve(__dirname, "node_modules/react-router-dom"),
        "react-router": path.resolve(__dirname, "node_modules/react-router"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react-router-dom",
        "react-router",
        "@tanstack/react-query",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/notifications",
      ],
    },

    build: {
      outDir: path.resolve(__dirname, "./dist-build"),
      emptyOutDir: true,
      sourcemap: mode === "development",
      commonjsOptions: { transformMixedEsModules: true },

      rollupOptions: {
        output: {
          // FIX: Split react-router-dom and @tanstack/react-query into SEPARATE
          // chunks. Previously they shared "router-query" — if either failed to
          // load, both hooks (useNavigate + useQuery) were unavailable, causing
          // the crash at RestaurantAuth line 1:463.
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("@mantine") || id.includes("@emotion")) return "mantine";
              if (id.includes("@supabase")) return "supabase";
              if (id.includes("react-router")) return "router";
              if (id.includes("@tanstack")) return "react-query";
              return "vendor";
            }
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          // FIX: Ensure asset filenames are also relative (needed for file:// WebView)
          assetFileNames: "assets/[name]-[hash][extname]",
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
