import reactRefresh from '@vitejs/plugin-react-refresh'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import reactJsx from 'vite-react-jsx'

export default defineConfig({
  plugins: [reactJsx(), reactRefresh()],
  resolve: {
    alias: {
      // Resolve symlink ourselves
      '@react-three/fiber': resolve('..', '..', 'node_modules', '@react-three', 'fiber'),
      three: resolve('..', '..', 'node_modules', 'three'),
    },
  },
})
