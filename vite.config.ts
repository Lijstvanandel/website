import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Inlines the small main stylesheet into index.html during production builds
 * so CSS never blocks First Contentful Paint / Largest Contentful Paint.
 */
function inlineMainCssPlugin(): Plugin {
  return {
    name: "inline-main-css",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      return html.replace(
        /<link\s+rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/gi,
        (fullTag, hrefPath: string) => {
          const assetKey = hrefPath.replace(/^\//, "");
          const chunk = ctx.bundle?.[assetKey];
          if (chunk && chunk.type === "asset" && typeof chunk.source === "string") {
            // Only inline stylesheets without relative url() font/image assets (e.g. main index.css, not katex.min.css)
            if (!chunk.source.includes("url(") && chunk.source.length < 300_000) {
              return `<style>${chunk.source}</style>`;
            }
          }
          return fullTag;
        }
      );
    },
  };
}

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
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "inline",
      manifest: false,
      injectManifest: {
        globPatterns: ["index.html"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
    inlineMainCssPlugin(),
  ],
  esbuild: {
    legalComments: "none",
    drop: mode === "production" ? ["console", "debugger"] : [],
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
      "react-dom/client",
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
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
      "katex",
      "dompurify",
    ],
    exclude: ["pdfjs-dist"],
  },
  build: {
    target: ["es2022", "chrome100", "safari15", "firefox100", "edge100"],
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    emptyOutDir: false,
    copyPublicDir: false,
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: false,
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/") ||
              id.includes("/node_modules/scheduler/")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("/node_modules/react-router") ||
              id.includes("/node_modules/@remix-run/router")
            ) {
              return "vendor-router";
            }
            if (id.includes("/node_modules/@tanstack/react-query")) {
              return "vendor-query";
            }
            if (id.includes("/node_modules/@radix-ui/")) {
              return "vendor-radix";
            }
            if (id.includes("/node_modules/lucide-react/")) {
              return "vendor-icons";
            }
            if (id.includes("/node_modules/date-fns")) {
              return "vendor-date";
            }
          }
        },
      },
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" || warning.message?.includes("use client")) return;
        warn(warning);
      },
    },
  },
}));
