import { resolve } from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import reactJsx from 'vite-react-jsx'

export default defineConfig({
  plugins: [reactJsx(), reactRefresh()],
  resolve: {
    alias: {
      // Resolve symlink ourselves
      '@react-three/fiber': resolve('node_modules', '@react-three', 'fiber'),
      '@react-three/cannon': resolve('../'),
      three: resolve('node_modules', 'three'),
    },
  },
})
