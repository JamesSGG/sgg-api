// @flow

import { createServer } from 'http'
import { execute, subscribe } from 'graphql'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { partial } from 'lodash/fp'

import app, { pubsub } from './app'
import db from './db'
import redis from './redis'
import schema from './schema'
import { setUserOnlineStatus } from './data-loaders'

const {
  PORT,
  HOSTNAME,
} = process.env

const hostName = HOSTNAME || '0.0.0.0'
const port = PORT || 8880

const ws = createServer(app)

function setUserStatus(userId, status) {
  setUserOnlineStatus(userId, status)

  pubsub.publish('USER_ONLINE_STATUS_CHANGED', {
    userOnlineStatusChanged: { userId, status },
  })
}

// Launch Node.js server
const server = ws.listen(port, hostName, () => {
  console.log(`API server is listening on http://${hostName}:${port}`)

  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect(connectionParams) {
        const { userId } = connectionParams

        if (userId) {
          return Promise
            .resolve()
            .then(() => ({
              activeUserId: userId,
            }))
        }
      },
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
      try {
        close(() => {
          if (i === lastIndex) {
            process.exit()
          }
        })
      }
      catch (_error) {
        if (i === lastIndex) {
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
