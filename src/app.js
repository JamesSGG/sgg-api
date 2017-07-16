// @flow

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import session from 'express-session'
import connectRedis from 'connect-redis'
import flash from 'express-flash'
import PrettyError from 'pretty-error'
import { printSchema } from 'graphql'
import {
  graphqlExpress,
  graphiqlExpress,
} from 'graphql-server-express'

import redis from './redis'
import passport from './auth'
import schema from './schema'
import DataLoaders from './DataLoaders'
import accountRoutes from './routes/account'

const RedisStore = connectRedis(session)

const {
  NODE_ENV,
  CORS_ORIGIN,
  SESSION_SECRET,
} = process.env

const isDev = NODE_ENV !== 'production'

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
