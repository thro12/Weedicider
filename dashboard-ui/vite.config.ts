import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/predict': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/model-info': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/history': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/stats': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/sample-images': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/test-image': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/export-report': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/backend-status': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
      '/analytics': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
      },
    },
  },
})
