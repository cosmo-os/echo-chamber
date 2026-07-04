import { defineConfig } from 'vite'

export default defineConfig({
  server: process.env.MOBILE_DEV
    ? { allowedHosts: true }
    : undefined,
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})