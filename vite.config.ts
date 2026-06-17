import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { webcrypto } from 'node:crypto'

// Node 18以下向けのグローバル crypto ポリフィル (Rollupの依存モジュール対策)
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = webcrypto
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'sasage baby calendar',
        short_name: 'sasage baby',
        description: '港南区笹下周辺 子育てイベント情報カレンダー',
        theme_color: '#ff8a75',
        background_color: '#FAF9F6',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })),
  }
})
