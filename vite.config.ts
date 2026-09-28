import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  publicDir: "public",
  json: {
    stringify: true,
  },
  server: {
    host: "0.0.0.0",
    watch: {
      followSymlinks: false,
      ignored: [
        "**/uploads/**",
        "**/public/uploads/**",
        "**/dist/uploads/**",
        "**/data/**",
        "**/.text-index.json",
        "**/*.zip",
        "**/*.pdf",
        "**/*.docx",
        "**/*.xlsx",
        "**/*.csv",
        "**/node_modules/**",
        "**/.git/**",
        "**/database.sqlite*",
        "**/vault_crm_sensitive.sqlite*",
      ],
    },
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
  ],
  esbuild: {
    legalComments: "none",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-router": path.resolve(__dirname, "./node_modules/react-router"),
      "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "react-router",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
    ],
    exclude: ["pdfjs-dist"],
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 2000,
    emptyOutDir: false,
    copyPublicDir: false,
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: false,
    rollupOptions: {
      maxParallelFileOps: 8,
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" || warning.message?.includes("use client")) return;
        warn(warning);
      },
    },
  },
}));
