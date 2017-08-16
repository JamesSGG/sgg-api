
const path = require('path')
const fs = require('fs')
const { partial } = require('lodash/fp')

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = partial(path.resolve, [appDirectory])

// config after eject: we're in ./config/
module.exports = {
  root: resolveApp(),
  source: resolveApp('src'),
  build: resolveApp('build'),
  nodeModules: resolveApp('node_modules'),
  entry: [
    resolveApp('src/server.js'),
  ],
}
