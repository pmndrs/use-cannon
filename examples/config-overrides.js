const {
  removeModuleScopePlugin,
  addWebpackAlias,
  override,
} = require('customize-cra')
const path = require('path')

module.exports = override(
  removeModuleScopePlugin(),
  addWebpackAlias({
    three: path.resolve('node_modules/three'),
    react: path.resolve('node_modules/react'),
    'react-scheduler': path.resolve('node_modules/react-scheduler'),
    '@react-three/fiber': path.resolve('node_modules/@react-three/fiber'),
    '@react-three/cannon': path.resolve('../dist/debug/index.js'),
  }),
)
