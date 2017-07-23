// @flow

import { createServer } from 'http'
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { partial } from 'lodash/fp'

import app from './app'
import db from './db'
import redis from './redis'
import schema from './schema'

const {
  PORT,
  HOSTNAME,
} = process.env

const hostName = HOSTNAME || '0.0.0.0'
const port = PORT || 8880

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
