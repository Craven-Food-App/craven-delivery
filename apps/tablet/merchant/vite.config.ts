import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const rootSrc = path.resolve(__dirname, "../../..", "src");

export default defineConfig(({ mode }) => {
  // Merchant app is only used as Capacitor/mobile; production build must use relative base so assets load in WebView
  const base = mode === "production" ? "./" : "/";

  return {
    base,
    root: __dirname,
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
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("@mantine") || id.includes("@emotion")) return "mantine";
              if (id.includes("react-dom")) return "react-dom";
              if (id.includes("react")) return "react";
              return "vendor";
            }
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
      target: "esnext",
      minify: "esbuild",
    },
    optimizeDeps: {
      entries: ["index.html"],
      include: ["react", "react-dom"],
      force: true,
    },
  };
});
