import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    watch: {
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
      injectRegister: "auto",
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon.png",
        "icon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png",
      ],
      injectManifest: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globIgnores: ["**/node_modules/**/*", "**/uploads/**", "**/data/**", "sw.js", "sw.mjs"],
      },
      manifest: {
        id: "/",
        name: "Lijst van Andel",
        short_name: "van Andel",
        description: "Officiële website en ledenportaal van Lijst van Andel Steenwijkerland",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/login",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "react-router-dom",
      "react-router",
      "@tanstack/react-query",
      "lucide-react",
      "sonner",
      "date-fns",
      "date-fns/locale",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "motion/react",
      "framer-motion",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-tabs",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "embla-carousel-react",
      "input-otp",
      "cmdk",
      "vaul",
      "react-day-picker",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "zod",
      "next-themes",
      "react-resizable-panels",
      "leaflet",
      "react-leaflet",
      "qrcode",
      "jsqr",
    ],
    exclude: ["pdfjs-dist"],
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("/react/")) {
              return "vendor-react";
            }
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("motion")) {
              return "vendor-motion";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            if (id.includes("pdfjs-dist") || id.includes("pdf-lib")) {
              return "vendor-pdf";
            }
            if (id.includes("leaflet")) {
              return "vendor-map";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "vendor-charts";
            }
            if (id.includes("qrcode") || id.includes("canvas-confetti") || id.includes("jsqr")) {
              return "vendor-utils";
            }
          }
        },
      },
    },
  },
}));
