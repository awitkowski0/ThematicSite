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
  build: {
    rollupOptions: {
      output: {
        // The generated datasets are big (suits.generated.json alone is ~2.5 MB) and are
        // imported by several route modules, so Rollup hoists them into the entry chunk —
        // meaning /faq and /play were downloading every suit. Splitting them out lets only
        // the routes that actually read them pull them in.
        manualChunks: {
          'data-suits': ['./src/data/suits.generated.json', './src/data/recipes.generated.json'],
          'data-abilities': ['./src/data/abilities.generated.json'],
        },
      },
    },
  },
  // nitro() builds the standalone server in .output/ that `npm start` runs.
  plugins: [tailwindcss(), tanstackStart({ router: { autoCodeSplitting: true } }), nitro(), viteReact()],
})
