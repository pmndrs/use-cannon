import path from 'path'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import OMT from "@surma/rollup-plugin-off-main-thread";


const external = ['react', 'react-three-fiber', 'three']
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  include: ['src/**/*', '**/node_modules/**'],
  externalHelpers: true,
  presets: [['@babel/preset-env', { loose: true, modules: false, targets }], '@babel/preset-react'],
  plugins: [
    ['transform-react-remove-prop-types', { removeImport: true }]
  ],
})

export default {
  input: './src/index',
  output: {
    dir: 'dist',
    format: 'esm'
  },
  external,
  plugins: [
    resolve({ extensions }),
    OMT(),
    babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
  ],
}
