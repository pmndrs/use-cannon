import path from 'path'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import webWorkerLoader from 'rollup-plugin-web-worker-loader'

const external = ['react', 'react-three-fiber', 'three']
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  include: ['src/**/*', '**/node_modules/**'],
  runtimeHelpers: true,
  presets: [['@babel/preset-env', { loose: true, modules: false, targets }], '@babel/preset-react'],
  plugins: [
    ['transform-react-remove-prop-types', { removeImport: true }],
    ['@babel/transform-runtime', { regenerator: false, useESModules }],
  ],
})

export default [
  {
    input: `./src/index`,
    output: { file: `dist/index.js`, format: 'esm' },
    external,
    plugins: [
      resolve({ extensions }),
      webWorkerLoader(),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
    ],
  },
]
