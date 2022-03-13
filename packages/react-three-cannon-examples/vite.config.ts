import reactRefresh from '@vitejs/plugin-react-refresh'
import { defineConfig } from 'vite'
import reactJsx from 'vite-react-jsx'

export default defineConfig({ plugins: [reactJsx(), reactRefresh()] })
