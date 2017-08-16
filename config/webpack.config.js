
const nodeExternals = require('webpack-node-externals')

const paths = require('./paths')

module.exports = {
  entry: paths.entry,
  output: {
    path: paths.build,
    filename: '[name].js',
    chunkFilename: '[name].js',
  },
  resolve: {
    modules: [
      'node_modules',
      paths.source,
    ],
  },
  target: 'node',
  externals: [nodeExternals()],
  module: {
    strictExportPresence: true,
    rules: [
      {
        test: /\.js$/,
        include: paths.source,
        loader: require.resolve('babel-loader'),
      },
      {
        test: /\.(graphql|gql)$/,
        include: paths.source,
        loader: 'graphql-tag/loader',
      },
    ],
  },
  performance: {
    hints: false,
  },
}
