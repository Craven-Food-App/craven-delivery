import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { existsSync, readFileSync } from "fs";

const rootSrc = path.resolve(__dirname, "../../..", "src");
const repoRoot = path.resolve(__dirname, "../../..");
const repoNodeModules = path.resolve(repoRoot, "node_modules");
const ordersNodeModules = path.resolve(__dirname, "../orders/node_modules");

const resolvePackagePath = (pkgName: string): string => {
  for (const base of [ordersNodeModules, repoNodeModules, path.resolve(__dirname, "node_modules")]) {
    const candidate = path.resolve(base, pkgName);
    if (existsSync(candidate)) return candidate;
  }
  return path.resolve(repoNodeModules, pkgName);
};

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "package.json"), "utf-8")
) as { version?: string };

export default defineConfig(({ mode }) => {
  const base = mode === "production" ? "./" : "/";

  return {
    base,
    root: __dirname,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version ?? "1.0.0"),
      __APP_BUILD__: JSON.stringify(process.env.BUILD_NUMBER ?? process.env.CI ?? "1")
    },
    envDir: repoRoot,
    publicDir: path.resolve(__dirname, "./public"),
    server: {
      host: "0.0.0.0",
      port: 8094,
      strictPort: false,
      open: false,
      cors: true,
      fs: {
        allow: [
          __dirname,
          path.resolve(__dirname, "../../..", "src"),
          path.resolve(__dirname, "../.."),
          repoRoot
        ]
      },
      hmr: { protocol: "ws", reconnect: true },
      watch: { usePolling: false }
    },
    plugins: [react()],
    css: { postcss: "./postcss.config.js" },
    resolve: {
      alias: {
        "@": rootSrc,
        "@root": rootSrc,
        "@tablet": path.resolve(__dirname, "./src"),
        react: resolvePackagePath("react"),
        "react-dom": resolvePackagePath("react-dom"),
        "react-router-dom": resolvePackagePath("react-router-dom"),
        "react-router": resolvePackagePath("react-router"),
        "lucide-react": resolvePackagePath("lucide-react"),
        sonner: resolvePackagePath("sonner"),
        "@mantine/core": resolvePackagePath("@mantine/core"),
        "@mantine/hooks": resolvePackagePath("@mantine/hooks"),
        "@mantine/notifications": resolvePackagePath("@mantine/notifications"),
        "@mantine/modals": resolvePackagePath("@mantine/modals"),
        "@supabase/supabase-js": resolvePackagePath("@supabase/supabase-js"),
        "@tanstack/react-query": resolvePackagePath("@tanstack/react-query")
      },
      dedupe: [
        "react",
        "react-dom",
        "react-router-dom",
        "react-router",
        "@tanstack/react-query",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/notifications"
      ]
    },
    build: {
      outDir: path.resolve(__dirname, "./dist-build"),
      emptyOutDir: true,
      sourcemap: mode === "development",
      commonjsOptions: { transformMixedEsModules: true },
      rollupOptions: {
        output: {
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
          assetFileNames: "assets/[name]-[hash][extname]"
        }
      },
      target: "es2020",
      minify: "esbuild"
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
        "@supabase/supabase-js"
      ],
      force: false
    }
  };
});
