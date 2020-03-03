import path from 'path'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import webWorkerLoader from 'rollup-plugin-web-worker-loader'
import { terser } from 'rollup-plugin-terser'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'

const root = process.platform === 'win32' ? path.resolve('/') : '/'
const external = id => !id.startsWith('.') && !id.startsWith(root)
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  include: ['src/**/*', '**/node_modules/**'],
  //exclude: '**/node_modules/**',
  runtimeHelpers: true,
  presets: [['@babel/preset-env', { loose: true, modules: false, targets }], '@babel/preset-react'],
  plugins: [
    ['transform-react-remove-prop-types', { removeImport: true }],
    ['@babel/transform-runtime', { regenerator: false, useESModules }],
  ],
})

export default [
  /*{
    input: `./src/worker.js`,
    output: { file: `dist/worker.js`, format: 'esm' },
    external: [],
    plugins: [
      resolve({ extensions }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
      terser(),
      sizeSnapshot(),
    ],
  },*/
  {
    input: `./src/index`,
    output: { dir: `dist`, format: 'esm' },
    external,
    plugins: [
      resolve({ extensions }),
      webWorkerLoader(),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
      //sizeSnapshot(),
    ],
  },
  /*{
    input: `./src/index`,
    output: { file: `dist/index.cjs.js`, format: 'cjs' },
    external,
    plugins: [
      webWorkerLoader(),
      babel(getBabelOptions({ useESModules: false })),
      sizeSnapshot(),
      resolve({ extensions }),
    ],
  },*/
]
