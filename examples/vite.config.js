import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import reactJsx from 'vite-react-jsx'

export default defineConfig({
  plugins: [reactJsx(), reactRefresh()],
})
