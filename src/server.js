// @flow

import { partial } from 'lodash/fp'

import app from './app'
import db from './db'
import redis from './redis'

const {
  PORT = 8080,
  HOSTNAME = '0.0.0.0',
} = process.env

// Launch Node.js server
const server = app.listen(PORT, HOSTNAME, () => {
  console.log(`API server is listening on http://${HOSTNAME}:${PORT}`)
})

// Shutdown Node.js app gracefully
function handleExit(options, error) {
  const { cleanup, exit } = options

  if (cleanup) {
    const actions = [server.close, db.destroy, redis.quit]

    actions.forEach((close, i) => {
      try {
        close(() => {
          if (i === actions.length - 1) {
            process.exit()
          }
        })
      }
      catch (_error) {
        if (i === actions.length - 1) {
          process.exit()
        }
      }
    })
  }

  if (error) {
    console.log(error.stack)
  }

  if (exit) {
    process.exit()
  }
}

const exitGracefully = partial(handleExit, [{ cleanup: true }])
const exitImmediately = partial(handleExit, [{ exit: true }])

process.on('exit', exitGracefully)
process.on('SIGINT', exitImmediately)
process.on('SIGTERM', exitImmediately)
process.on('uncaughtException', exitImmediately)
