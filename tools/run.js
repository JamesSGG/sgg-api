#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const pkg = require('../package.json')
const task = require('./task')

let build
let server

const serverQueue = []
const isDebug = process.execArgv.includes('--inspect')

// Gracefull shutdown
process.once('cleanup', () => {
  if (server) {
    server.addListener('exit', () => process.exit())
    server.kill('SIGTERM')
    serverQueue.forEach((x) => x.kill())
  }
  else {
    process.exit()
  }
})
process.on('SIGINT', () => process.emit('cleanup'))
process.on('SIGTERM', () => process.emit('cleanup'))

// Ensure that Node.js modules were installed,
// at least those required to build the app
try {
  build = require('./build')
}
catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err
  }

  // Install Node.js modules with Yarn
  cp.spawnSync('yarn', ['install', '--no-progress'], { stdio: 'inherit' })

  // Clear Module's internal cache
  try {
    const Module = require('module')
    const m = new Module()
    m._compile(fs.readFileSync('./tools/build.js', 'utf8'), path.resolve('./tools/build.js'))
  }
  catch (error) {
    // Do nothing
  }

  // Reload dependencies
  build = require('./build')
}

// Launch `node build/server.js` on a background thread
function spawnServer() {
  const getAppDepsArgs = () => {
    const defaultValue = []
    const reducer = (args, dep) => args.concat(['--require', dep])

    return Object.keys(pkg.dependencies).reduce(reducer, defaultValue)
  }

  const getDebugArgs = () => {
    const defaultValue = isDebug ? ['--inspect-port=9229'] : ['--inspect-port=9229']
    const reducer = (result, arg) => {
      const match = arg.match(/^--(?:inspect|debug)-port=(\S+:|)(\d+)$/)
      return match ? [`--inspect-port=${match[1]}${Number(match[2]) + 1}`] : result
    }

    return process.execArgv.reduce(reducer, defaultValue)
  }

  const getHotReloadArgs = () => {
    if (isDebug) {
      return ['./server.js']
    }

    return [
      '--eval',
      'process.stdin.on("data", data => { if (data.toString() === "load") require("./server.js"); });',
    ]
  }

  const args = [
    // Pre-load application dependencies to improve "hot reload" restart time
    ...getAppDepsArgs(),
    // If the parent Node.js process is running in debug (inspect) mode,
    // launch a debugger for Express.js app on the next port
    ...process.execArgv,
    ...getDebugArgs(),
    '--no-lazy',
    // Enable "hot reload", it only works when debugger is off
    ...getHotReloadArgs(),
  ]

  const spawnOptions = {
    cwd: './build',
    stdio: ['pipe', 'inherit', 'inherit'],
    timeout: 3000,
  }

  return cp.spawn('node', args, spawnOptions)
}

module.exports = task('run', function runTask() {
  // Migrate database schema to the latest version
  function dbMigrate() {
    cp.spawnSync('node', ['tools/db.js', 'migrate'], { stdio: 'inherit' })
  }

  // Compile and launch the app in watch mode, restart it after each rebuild
  function compileAndLaunchApp() {
    return build({
      watch: true,
      onComplete() {
        if (server) {
          server.kill('SIGTERM')
        }

        if (isDebug) {
          server = spawnServer()
        }
        else {
          server = serverQueue.splice(0, 1)[0] || spawnServer()
          server.stdin.write('load') // this works faster than IPC
          serverQueue.push(spawnServer())
        }
      },
    })
  }

  // Resolve the promise on exit
  function handleExit() {
    return new Promise((resolve) => {
      process.once('exit', () => {
        if (server) {
          server.kill()
        }

        resolve()
      })
    })
  }

  return Promise
    .resolve()
    .then(dbMigrate)
    .then(compileAndLaunchApp)
    .then(handleExit)
})
