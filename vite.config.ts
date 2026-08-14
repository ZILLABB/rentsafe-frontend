import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// PWA + offline strategy from Section XVI: precache the app shell, runtime-cache
// property/agent reads (stale-while-revalidate), cache-first for tiles & images.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "RentSafe Lagos",
        short_name: "RentSafe",
        description: "Lagos rental transparency & intelligence.",
        theme_color: "#1A7A8A",
        background_color: "#0B2027",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Fonts are bundled, so they're precached by the glob rather than
        // fetched from a CDN the service worker never saw.
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"],
        // Push and notification-click handling. Imported rather than moving to
        // injectManifest, which would mean hand-maintaining the precache and
        // runtime-caching rules generateSW produces below — all of which matter
        // for offline use on a patchy connection.
        importScripts: ["/push-sw.js"],
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/(properties|agents|neighbourhoods)/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-reads" },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/,
            handler: "CacheFirst",
            options: { cacheName: "images" },
          },
          {
            // Map tiles. Cache-first and long-lived: tiles are immutable for a
            // given z/x/y, Lagos connections are patchy, and every miss is a
            // request to a donation-funded service we are asked not to hammer.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles",
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:woff2?)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Local FastAPI backend (see backend/README.md).
      "/api": { target: "http://localhost:8001", changeOrigin: true },
    },
  },
  build: {
    // Section XVI performance budget: code-split heavy libs off the initial bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
