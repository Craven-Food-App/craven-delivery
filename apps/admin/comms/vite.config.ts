import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rootSrc = path.resolve(__dirname, "../../..", "src");
const rootNodeModules = path.resolve(__dirname, "../../..", "node_modules");

export default defineConfig(({ mode }) => {
  // This app is deployed under https://cravenusa.com/hub/internal-comms
  // so production assets must be rooted at /hub/internal-comms/.
  const base = mode === "production" ? "/hub/internal-comms/" : "/";

  return {
    base,
    root: __dirname,
    publicDir: path.resolve(__dirname, "./public"),
    server: {
      host: "0.0.0.0",
      port: 8097,
      strictPort: false,
      open: false,
      cors: true,
      fs: {
        allow: [
          __dirname,
          rootSrc,
          path.resolve(__dirname, "../../.."),
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
        "@comms": path.resolve(__dirname, "./src"),
        "@remix-run/router": path.resolve(
          rootNodeModules,
          "@remix-run",
          "router",
          "dist",
          "router.js",
        ),
      },
      dedupe: ["react", "react-dom"],
      conditions: ["import", "module", "browser", "default"],
    },
    build: {
      outDir: path.resolve(__dirname, "./dist"),
      emptyOutDir: true,
      sourcemap: mode === "development",
      commonjsOptions: { transformMixedEsModules: true },
    },
  };
});

