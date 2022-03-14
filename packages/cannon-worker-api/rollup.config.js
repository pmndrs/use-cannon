import babel from '@rollup/plugin-babel'
import pluginCommonjs from '@rollup/plugin-commonjs'
import pluginNodeResolve from '@rollup/plugin-node-resolve'
import pluginWebWorker from 'rollup-plugin-web-worker-loader'

const external = ['three']
const extensions = ['.js', '.ts', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelHelpers: 'runtime',
  babelrc: false,
  extensions,
  include: ['src/**/*', '**/node_modules/**'],
  plugins: [['@babel/transform-runtime', { regenerator: false, useESModules }]],
  presets: [['@babel/preset-env', { loose: true, modules: false, targets }], '@babel/preset-typescript'],
})

export default [
  {
    external,
    input: `./src/index.ts`,
    output: { dir: 'dist', format: 'esm' },
    plugins: [
      pluginCommonjs({ esmExternals: ['events'] }),
      pluginNodeResolve({ extensions, preferBuiltins: false }),
      pluginWebWorker({ platform: 'base64', sourcemap: false, targetPlatform: 'browser' }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
    ],
  },
  {
    external,
    input: `./src/index.ts`,
    output: { dir: 'dist/debug', format: 'esm' },
    plugins: [
      pluginCommonjs({ esmExternals: ['events'] }),
      pluginNodeResolve({ extensions, preferBuiltins: false }),
      pluginWebWorker({ platform: 'base64', sourcemap: true, targetPlatform: 'browser' }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
    ],
  },
]
