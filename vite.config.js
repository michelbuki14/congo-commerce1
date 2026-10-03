import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Vite's native config loader does not provide `__dirname`; use the ESM
// equivalent so the alias resolves under both loaders.
const SRC = path.resolve(import.meta.dirname, 'src')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  resolve: {
    alias: {
      // Override Base44's URL-style @/ alias with file-path aliases so it
      // resolves on Windows, where "/src/" matches no file on disk.
      '@/': SRC + '/',
      '@': SRC,
    },
  },
});
