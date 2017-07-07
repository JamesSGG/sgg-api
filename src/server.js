// @flow

import { partial } from 'lodash/fp'

import app from './app'
import db from './db'
import redis from './redis'

const { PORT, HOSTNAME } = process.env

const port = PORT || 8080
const host = HOSTNAME || '0.0.0.0'

// Launch Node.js server
const server = app.listen(port, host, () => {
  console.log(`API server is listening on http://${host}:${port}`)
})

// Shutdown Node.js app gracefully
function handleExit(options, err) {
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
      catch (_err) {
        if (i === actions.length - 1) {
          process.exit()
        }
      }
    })
  }

  if (err) {
    console.log(err.stack)
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
