import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })),
  }
})
