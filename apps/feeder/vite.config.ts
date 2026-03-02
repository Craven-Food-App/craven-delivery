/**
 * Feeder app – runs from apps/feeder but shares root src/.
 *
 * CRITICAL: Every package that uses React context or provides/consumes
 * a React context MUST resolve to the SAME physical copy (root node_modules).
 * apps/feeder/node_modules has its own copies which creates duplicate
 * instances → providers from one copy are invisible to the other → crash.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const root = path.resolve(__dirname, "../..");
const rootNM = path.resolve(root, "node_modules");
const pin = (pkg: string) => path.resolve(rootNM, pkg);

// Auto-discover all @radix-ui packages from root node_modules
function radixAliases(): Record<string, string> {
  const radixDir = path.resolve(rootNM, "@radix-ui");
  if (!fs.existsSync(radixDir)) return {};
  const aliases: Record<string, string> = {};
  for (const entry of fs.readdirSync(radixDir)) {
    aliases[`@radix-ui/${entry}`] = path.resolve(radixDir, entry);
  }
  return aliases;
}

const pinnedPackages = [
  "react", "react-dom", "react-is",
  "react-router", "react-router-dom",
  "@mantine/core", "@mantine/hooks", "@mantine/notifications",
  "@mantine/modals", "@mantine/dates", "@mantine/carousel", "@mantine/form",
  "@emotion/react", "@emotion/styled",
  "@emotion/cache", "@emotion/serialize", "@emotion/utils", "@emotion/sheet",
  "@tanstack/react-query", "@tanstack/react-table",
  "@supabase/supabase-js",
  "@mui/material", "@mui/icons-material", "@mui/x-data-grid", "@mui/x-date-pickers",
  "sonner", "lucide-react", "@tabler/icons-react",
  "class-variance-authority", "clsx", "tailwind-merge",
];

const pinnedAliases: Record<string, string> = {};
for (const pkg of pinnedPackages) {
  pinnedAliases[pkg] = pin(pkg);
}

export default defineConfig({
  root: __dirname,
  base: "/",
  publicDir: path.resolve(root, "public"),

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
      "@": path.resolve(root, "src"),
      ...pinnedAliases,
      ...radixAliases(),
    },
    dedupe: [...pinnedPackages],
    conditions: ["import", "module", "browser", "default"],
  },

  optimizeDeps: {
    entries: ["index.html", "src/main.tsx"],
    include: [
      "react", "react-dom", "react-is",
      "@mantine/core", "@mantine/hooks", "@mantine/notifications",
      "@mantine/modals", "@mantine/dates", "@mantine/carousel", "@mantine/form",
      "@emotion/react", "@emotion/styled",
      "@tanstack/react-query",
      "sonner", "lucide-react", "@tabler/icons-react",
      "hoist-non-react-statics", "prop-types", "deepmerge",
      "barcode-detector", "barcode-detector/ponyfill",
    ],
    esbuildOptions: {
      target: "es2020",
    },
  },

  build: {
    outDir: path.resolve(__dirname, "../../dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
    sourcemap: "hidden",
    minify: "esbuild",
    target: "es2020",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          const n = id.replace(/\\/g, "/");

          if (!n.includes("node_modules")) return undefined;

          // Only split packages that are:
          // 1. Large
          // 2. Do NOT use React hooks internally
          // Everything React-dependent stays in the default chunk
          // to avoid the duplicate React instance problem entirely.

          // Mapbox — large, zero React deps
          if (n.includes("/mapbox-gl/") || n.includes("/@mapbox/")) {
            return "vendor-mapbox";
          }

          // Supabase — large, zero React deps
          if (n.includes("/@supabase/")) {
            return "vendor-supabase";
          }

          // Monaco editor — huge, zero React deps at runtime
          if (n.includes("/monaco-editor/") || n.includes("/@monaco-editor/")) {
            return "vendor-monaco";
          }

          // Everything else (React, MUI, Mantine, Radix, Antd, Tanstack, etc.)
          // stays bundled together to share one React instance.
          return undefined;
        },
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