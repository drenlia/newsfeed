import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3072,
    // Dynamically allow hosts from environment variable (for dev mode)
    // ALLOWED_HOSTS can be a comma-separated list of hosts
    // If HOST is set, it will be used as a single allowed host
    // If neither is set, all hosts are allowed (useful behind trusted proxy)
    allowedHosts: process.env.ALLOWED_HOSTS
      ? process.env.ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
      : process.env.HOST
      ? [process.env.HOST]
      : undefined, // undefined means all hosts allowed
    // Proxy API requests to backend server during development
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || 3073}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3072,
    // Dynamically allow hosts from environment variable
    // ALLOWED_HOSTS can be a comma-separated list of hosts
    // If HOST is set, it will be used as a single allowed host
    // If neither is set, all hosts are allowed (useful behind trusted proxy)
    allowedHosts: process.env.ALLOWED_HOSTS
      ? process.env.ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
      : process.env.HOST
      ? [process.env.HOST]
      : undefined, // undefined means all hosts allowed
  },
})
