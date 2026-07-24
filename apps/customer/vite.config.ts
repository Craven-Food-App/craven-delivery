import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const isCapacitorMode = mode === 'capacitor';
  const isCapacitorBuild =
    process.env.CAPACITOR === 'true' ||
    process.env.BUILD_TARGET === 'capacitor' ||
    isCapacitorMode;

  // Native shells must use relative base so asset URLs resolve from file://.
  const base =
    mode === 'production' || isCapacitorMode
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
      // Bind on all interfaces but keep HMR on localhost so the browser matches
      // http://localhost:8080 (avoids flaky ws when only IPv4/IPv6 differs on Windows).
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 8080,
        clientPort: 8080,
        reconnect: true,
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
        "@shared": path.resolve(__dirname, "../../src"),
        // Force a single copy — @shared (repo-root src) otherwise resolves
        // packages from root node_modules and breaks React/Mantine/Router
        // context in Capacitor production builds.
        react: path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
        "react-router": path.resolve(__dirname, "./node_modules/react-router"),
        "react-router-dom": path.resolve(
          __dirname,
          "./node_modules/react-router-dom"
        ),
        "@mantine/core": path.resolve(__dirname, "./node_modules/@mantine/core"),
        "@mantine/hooks": path.resolve(
          __dirname,
          "./node_modules/@mantine/hooks"
        ),
        "@mantine/notifications": path.resolve(
          __dirname,
          "./node_modules/@mantine/notifications"
        ),
        "@mantine/modals": path.resolve(
          __dirname,
          "./node_modules/@mantine/modals"
        ),
        "@mantine/dates": path.resolve(
          __dirname,
          "./node_modules/@mantine/dates"
        ),
        "@mantine/carousel": path.resolve(
          __dirname,
          "./node_modules/@mantine/carousel"
        ),
      },
      dedupe: [
        "react",
        "react-dom",
        "react-router",
        "react-router-dom",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/notifications",
        "@mantine/modals",
        "@mantine/dates",
        "@mantine/carousel",
      ],
    },
    build: {
      outDir: path.resolve(__dirname, "./dist"),
      emptyOutDir: true,
      sourcemap: mode === 'development' && !isCapacitorMode,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      entries: ["index.html"],
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@mantine/core",
        "@mantine/hooks",
      ],
    },
  };
});