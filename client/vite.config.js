import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 避免本机解析到 ::1
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // 如果你的后端不是以 /api 起始，这里可以按需 rewrite
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
})