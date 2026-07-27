import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  // nitro() is required for Vercel's zero-config TanStack Start detection/build output.
  plugins: [tailwindcss(), tanstackStart({ router: { autoCodeSplitting: true } }), nitro(), viteReact()],
})
