import babel from '@rollup/plugin-babel'
import pluginNodeResolve from '@rollup/plugin-node-resolve'

const external = ['react', 'react/jsx-runtime', '@react-three/fiber', 'three']
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelHelpers: 'runtime',
  babelrc: false,
  extensions,
  include: ['src/**/*', '**/node_modules/**'],
  plugins: [['@babel/transform-runtime', { regenerator: false, useESModules }]],
  presets: [
    ['@babel/preset-env', { loose: true, modules: false, targets }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
})

export default [
  {
    external,
    input: `./src/index.tsx`,
    output: { dir: 'dist', format: 'esm' },
    plugins: [
      pluginNodeResolve({ extensions }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
    ],
  },
  {
    external,
    input: `./src/index.tsx`,
    output: { dir: 'dist/debug', format: 'esm' },
    plugins: [
      pluginNodeResolve({ extensions }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
    ],
  },
]
