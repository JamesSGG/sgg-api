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
import expressGraphQL from 'express-graphql'
import PrettyError from 'pretty-error'
import { printSchema } from 'graphql'
import email from './email'
import redis from './redis'
import passport from './passport'
import schema from './schema'
import DataLoaders from './DataLoaders'
import accountRoutes from './routes/account'

i18next
  .use(LanguageDetector)
  .use(i18nextBackend)
  .init({
    preload: ['en', 'de'],
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
  origin(origin, cb) {
    const whitelist = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []
    cb(null, whitelist.includes(origin))
  },
  credentials: true,
}))

app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({
  store: new (connectRedis(session))({ client: redis }),
  name: 'sid',
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
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
  graphiql: process.env.NODE_ENV !== 'production',
  pretty: process.env.NODE_ENV !== 'production',
  formatError: (error) => ({
    message: error.message,
    state: error.originalError && error.originalError.state,
    locations: error.locations,
    path: error.path,
  }),
})))

// The following routes are intended to be used in development mode only
if (process.env.NODE_ENV !== 'production') {
  // A route for testing email templates
  app.get('/:email(email|emails)/:template', (req, res) => {
    const message = email.render(req.params.template, { t: req.t, v: 123 })
    res.send(message.html)
  })

  // A route for testing authentication/authorization
  app.get('/', (req, res) => {
    if (req.user) {
      res.send(`<p>${req.t('Welcome, {{user}}!', { user: req.user.displayName })} (<a href="javascript:fetch('/login/clear', { method: 'POST', credentials: 'include' }).then(() => window.location = '/')">${req.t('log out')}</a>)</p>`)
    }
    else {
      res.send(`<p>${req.t('Welcome, guest!')} (<a href="/login/facebook">${req.t('sign in')}</a>)</p>`)
    }
  })
}

const pe = new PrettyError()
pe.skipNodeFiles()
pe.skipPackage('express')

app.use((err, req, res, next) => {
  process.stderr.write(pe.render(err))
  next()
})

export default app
