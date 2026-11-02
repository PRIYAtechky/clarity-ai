import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allows LAN access
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.warn(`[Vite Proxy] Could not connect to backend at ${process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000'} for ${req.url}: ${err.message}`);
          });
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
