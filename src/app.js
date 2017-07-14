// @flow

import path from 'path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import session from 'express-session'
import connectRedis from 'connect-redis'
import flash from 'express-flash'
import i18next from 'i18next'
import i18nextMiddleware, { LanguageDetector } from 'i18next-express-middleware'
import i18nextBackend from 'i18next-node-fs-backend'
import PrettyError from 'pretty-error'
import expressGraphQL from 'express-graphql'
import { printSchema } from 'graphql'

import email from './email'
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

i18next
  .use(LanguageDetector)
  .use(i18nextBackend)
  .init({
    preload: ['en'],
    ns: ['common', 'email'],
    fallbackNS: 'common',
    detection: {
      lookupCookie: 'lng',
    },
    backend: {
      loadPath: path.resolve(__dirname, '../locales/{{lng}}/{{ns}}.json'),
      addPath: path.resolve(__dirname, '../locales/{{lng}}/{{ns}}.missing.json'),
    },
  })

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
app.use(i18nextMiddleware.handle(i18next))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

app.use(accountRoutes)

app.get('/graphql/schema', (req, res) => {
  res.type('text/plain').send(printSchema(schema))
})

app.use('/graphql', expressGraphQL((req) => ({
  schema,
  context: {
    t: req.t,
    user: req.user,
    ...DataLoaders.create(),
  },
  graphiql: isDev,
  pretty: isDev,
  formatError(error) {
    const { message, originalError, locations, path: errorPath } = error
    const { state } = (originalError || {})


    return {
      message,
      state,
      locations,
      path: errorPath,
    }
  },
})))

// The following routes are intended to be used in development mode only
if (isDev) {
  // A route for testing email templates
  app.get('/:email(email|emails)/:template', (req, res) => {
    const message = email.render(req.params.template, { t: req.t, v: 123 })
    res.send(message.html)
  })

  // A route for testing authentication/authorization
  app.get('/', (req, res) => {
    if (req.user) {
      const { displayName } = req.user
      res.send(`<p>${req.t('Welcome, {{user}}!', { user: displayName })} (<a href="javascript:fetch('/login/clear', { method: 'POST', credentials: 'include' }).then(() => window.location = '/')">${req.t('log out')}</a>)</p>`)
    }
    else {
      res.send(`<p>${req.t('Welcome, guest!')} (<a href="/login/facebook">${req.t('sign in')}</a>)</p>`)
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
