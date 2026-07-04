import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/echo-chamber/' : '/',
  server: process.env.MOBILE_DEV
    ? { allowedHosts: true }
    : undefined,
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})