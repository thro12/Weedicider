import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/.venv/**',
        '**/__pycache__/**',
        '**/detect/**',
        '**/train/**',
        '**/valid/**',
        '**/test/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5004',
        changeOrigin: true,
      },
    },
  },
})
