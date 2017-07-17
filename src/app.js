// @flow

import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import session from 'express-session'
import connectRedis from 'connect-redis'
import flash from 'express-flash'
import PrettyError from 'pretty-error'
import { execute, subscribe, printSchema } from 'graphql'
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { castArray } from 'lodash/fp'

import redis from './redis'
import passport from './auth'
import schema from './schema'
import DataLoaders from './DataLoaders'
import accountRoutes from './routes/account'

const {
  NODE_ENV,
  HOSTNAME,
  WS_PORT,
  REDIS_URL,
  CORS_ORIGIN,
  SESSION_SECRET,
} = process.env

const hostName = HOSTNAME || 'localhost'
const wsPort = WS_PORT || 5000

const isDev = NODE_ENV !== 'production'

const RedisStore = connectRedis(session)

type TransformArgs = {
  path: string | Array<String>,
}

const pubsub = new RedisPubSub({
  connection: {
    url: REDIS_URL,
  },
  // Create unique names for each subscription channel using dot-notation
  triggerTransform(trigger: string, { path }: TransformArgs) {
    const pathList = castArray(path)
    const parts = [trigger, ...pathList]

    return parts.join('.')
  },
})

const websocketServer = createServer((request, response) => {
  response.writeHead(404)
  response.end()
})

websocketServer.listen(wsPort, () => {
  console.log(`Websocket Server is now running on http://${hostName}:${wsPort}`)
})

const subscriptionServer = SubscriptionServer.create(
  {
    schema,
    execute,
    subscribe,
  },
  {
    server: websocketServer,
    path: '/graphql',
  },
)

const app = express()

app.set('trust proxy', 'loopback')

app.use(cors({
  credentials: true,
  origin(origin, cb) {
    const whitelist = CORS_ORIGIN ? CORS_ORIGIN.split(',') : []
    cb(null, whitelist.includes(origin))
  },
}))

app.use(cookieParser(SESSION_SECRET))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({
  store: new RedisStore({ client: redis }),
  name: 'sid',
  resave: true,
  saveUninitialized: true,
  secret: SESSION_SECRET,
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

app.use(accountRoutes)

const graphqlMiddleware = graphqlExpress((request) => ({
  schema,
  context: {
    user: request.user,
    ...DataLoaders.create(),
  },
  debug: isDev,
  formatError(error) {
    const { message, originalError, locations, path } = error
    const { state } = (originalError || {})


    return {
      message,
      state,
      locations,
      path,
    }
  },
}))

const graphqlUiMiddleware = graphiqlExpress({
  endpointURL: '/graphql',
})

app.use('/graphql', bodyParser.json(), graphqlMiddleware)
app.use('/graphiql', graphqlUiMiddleware)

app.get('/graphql/schema', (req, res) => {
  res.type('text/plain').send(printSchema(schema))
})

// The following routes are intended to be used in development mode only
if (isDev) {
  // A route for testing authentication/authorization
  app.get('/', (req, res) => {
    if (req.user) {
      const { displayName } = req.user
      res.send(`<p>Welcome, ${displayName}! (<a href="javascript:fetch('/login/clear', { method: 'POST', credentials: 'include' }).then(() => window.location = '/')">Log Out</a>)</p>`)
    }
    else {
      res.send('<p>Welcome, guest! (<a href="/login/facebook">Sign In</a>)</p>')
    }
  })
}

const prettyError = new PrettyError()
prettyError.skipNodeFiles()
prettyError.skipPackage('express')

app.use((err, req, res, next) => {
  process.stderr.write(prettyError.render(err))
  next()
})

export default app
