import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const componentTagger = (): any => ({
  name: "component-tagger",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;
    if (id.includes("node_modules") || id.includes(".d.ts")) return null;
    return null;
  },
});

const stripLovableAttributes = (): any => ({
  name: "strip-lovable-attributes",
  enforce: "post" as const,
  transform(code: string, id: string) {
    if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return null;
    if (!code.includes("data-lov-")) return null;

    return {
      code: code.replace(/\sdata-lov-[^=]*="[^"]*"/g, ""),
      map: null,
    };
  },
});

export default defineConfig(({ mode }) => {
  const isCapacitorBuild =
    process.env.CAPACITOR === "true" ||
    process.env.BUILD_TARGET === "capacitor";

  const base =
    mode === "production"
      ? isCapacitorBuild
        ? "./"
        : "/"
      : "/";

  return {
    base,

    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
      open: false,
      cors: true,
      hmr: {
        overlay: true,
        protocol: "ws",
        host: "localhost",
        reconnect: true,
      },
      watch: {
        ignored: ["**/node_modules/**", "**/.git/**"],
      },
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          secure: false,
        },
      },
      middlewareMode: false,
      fs: {
        strict: false,
        allow: [".."],
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
      },
      dedupe: ["react", "react-dom"],
    },

    optimizeDeps: {
      entries: ["index.html"],
      exclude: [
        "@mui/material",
        "@mui/system",
        "@mui/icons-material",
        "@mui/x-data-grid",
        "@mui/x-date-pickers",
        "@emotion/react",
        "@emotion/styled",
        "@huggingface/transformers",
        "onnxruntime-common",
        "onnxruntime-web",
      ],
    },

    build: {
      chunkSizeWarningLimit: 1000,
      sourcemap: mode === "development",
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
  };
});
