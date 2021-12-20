import { resolve } from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import reactJsx from 'vite-react-jsx'

// eslint-disable-next-line no-undef
const codespaceName = process.env['CODESPACE_NAME']

const server: any = {}
if (codespaceName) {
  const hmrPort = 3000
  // https://vitejs.dev/config/#server-hmr
  server.hmr = {
    host: `${codespaceName}-${hmrPort}.githubpreview.dev`,
    port: hmrPort,
    clientPort: 443,
  }
}

export default defineConfig({
  plugins: [reactJsx(), reactRefresh()],
  resolve: {
    alias: {
      // Resolve symlink ourselves
      '@react-three/fiber': resolve('node_modules', '@react-three', 'fiber'),
      three: resolve('node_modules', 'three'),
    },
  },
  server,
})
