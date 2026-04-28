import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const url = new URL(req.url, 'http://localhost')
            const key = url.searchParams.get('key')
            if (key) {
              const currentPath = proxyReq.path
              const separator = currentPath.includes('?') ? '&' : '?'
              proxyReq.path = `${currentPath}${separator}key=${key}`
            }
          })
        }
      }
    }
  }
})
