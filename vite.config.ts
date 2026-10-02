import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative Pfade, damit die App auch in einem Unterordner läuft (z. B. GitHub Pages)
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      // Auch die Schriftdateien offline verfügbar machen
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: 'CrewGalley',
        short_name: 'CrewGalley',
        description: 'Essen und Kosten für Gruppenwochenenden planen',
        lang: 'de',
        dir: 'ltr',
        id: 'crewgalley',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['food', 'travel', 'productivity'],
        theme_color: '#F2F5EC',
        background_color: '#F2F5EC',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    // Die App wird als Ganzes offline gespeichert; eine einzelne größere Datei ist dafür in Ordnung
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
