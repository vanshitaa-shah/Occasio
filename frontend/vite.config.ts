import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // @occasio/shared is a linked CommonJS workspace package. Vite skips
  // pre-bundling linked deps by default, which breaks named ESM imports
  // (e.g. THEMES) in dev. Force it so its named exports resolve.
  optimizeDeps: {
    include: ['@occasio/shared'],
  },
})
