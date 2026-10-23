import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Activate new service workers immediately so an installed app never stays on a stale or broken one
      registerType: "autoUpdate",
      // Registered from main.tsx so the Capacitor app (which ships its files locally) never gets a service worker
      injectRegister: false,
      includeManifestIcons: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,webmanifest,webp,jpg,png,svg,woff2}"],
        globIgnores: ["**/_redirects"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        scope: "/",
        start_url: "/",
        short_name: "summit",
        description: "Personal budget and task tracker",
        name: "summit",
        icons: [
          {
            src: "assets/icons/icon-192.webp",
            sizes: "192x192",
            type: "image/webp",
            purpose: "any maskable",
          },
          {
            src: "assets/icons/icon-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
