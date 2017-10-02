// @flow

import { createServer } from 'http'
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { partial, ary, noop } from 'lodash/fp'

import app from './app'
import db from './db'
import redis from './redis'
import schema from './schema'

const {
  PORT,
  HOSTNAME,
} = process.env

const hostName = HOSTNAME || '0.0.0.0'
const port = Number(PORT) || 8880

const ws = createServer(app)

// Launch Node.js server
const server = ws.listen(port, hostName, () => {
  console.log(`API server is listening on http://${hostName}:${port}`)

  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server: ws,
      path: '/subscriptions',
    },
  )
})

// Shutdown Node.js app gracefully
function handleExit(options, error) {
  const { cleanup, exit } = options

  console.log('Shutting down API server')

  if (cleanup) {
    const actions = [server.close, db.destroy, redis.quit]
    const lastIndex = actions.length - 1

    actions.forEach((close, i) => {
      // Don't allow any arguments to `process.exit()`
      // (the first / only argument is the exit code)
      const maybeExit = ary(0, i === lastIndex ? process.exit : noop)

      try {
        close(maybeExit)
      }
      catch (_unused) {
        maybeExit()
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
