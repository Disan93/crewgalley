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
      manifest: {
        name: 'CrewGalley',
        short_name: 'CrewGalley',
        description: 'Essen und Kosten für Gruppenwochenenden planen',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#12355b',
        background_color: '#12355b',
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
