// @flow

import URL from 'url'
import passport from 'passport'
import validator from 'validator'
import { Router } from 'express'
import { compose, compact } from 'lodash/fp'

const router = new Router()

// External login providers. Also see src/passport.js.
const loginProviders = [
  {
    provider: 'facebook',
    options: { scope: ['email', 'user_location'] },
  },
  {
    provider: 'google',
    options: { scope: 'profile email' },
  },
  {
    provider: 'twitter',
    options: {},
  },
]

// '/about' => ''
// http://localhost:3000/some/page => http://localhost:3000
function getOrigin(url: string) {
  if (!url || url.startsWith('/')) {
    return ''
  }

  const parseUrl = compose(
    ({ protocol, host }) => `${String(protocol)}//${String(host)}`,
    URL.parse,
  )

  return parseUrl(url)
}

// '/about' => `true` (all relative URL paths are allowed)
// 'http://localhost:3000/about' => `true` (but only if its origin is whitelisted)
function isValidReturnURL(url: string) {
  if (url.startsWith('/')) {
    return true
  }

  const { CORS_ORIGIN } = process.env
  const whitelist = CORS_ORIGIN ? CORS_ORIGIN.split(',') : []

  const isValidUrl = validator.isURL(url, {
    require_protocol: true,
    protocols: ['http', 'https'],
  })

  const isAllowedOrigin = whitelist.includes(getOrigin(url))

  return isValidUrl && isAllowedOrigin
}

// Generates a URL for redirecting a user to upon successfull authentication.
// It is intended to support cross-domain authentication in development mode.
// For example, a user goes to http://localhost:3000/login (frontend) to sign in,
// then he's being redirected to http://localhost:8080/login/facebook (backend),
// Passport.js redirects the user to Facebook, which redirects the user back to
// http://localhost:8080/login/facebook/return and finally, user is being redirected
// to http://localhost:3000/?sessionID=xxx where front-end middleware can save that
// session ID into cookie (res.cookie.sid = req.query.sessionID).
function getSuccessRedirect(req) {
  const url = req.query.return || req.body.return || '/'

  if (!isValidReturnURL(url)) {
    return '/'
  }

  if (!getOrigin(url)) {
    return url
  }

  const { cookies, session } = req
  const { originalMaxAge } = session.cookie

  const queryString = compact([
    cookies.sid && `sessionID=${cookies.sid}`,
    originalMaxAge && `maxAge=${originalMaxAge}`,
  ]).join('&')

  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}${queryString}`
}

// Registers route handlers for the external login providers
loginProviders.forEach(({ provider, options }) => {
  router.get(
    `/login/${provider}`,
    function handleSucces(req, res, next) {
      req.session.returnTo = getSuccessRedirect(req); next()
    },
    passport.authenticate(provider, { failureFlash: true, ...options }),
  )

  router.get(`/login/${provider}/return`, function handleReturn(req, res, next) {
    return passport.authenticate(provider, {
      successReturnToOrRedirect: true,
      failureFlash: true,
      failureRedirect: `${getOrigin(req.session.returnTo)}/login`,
    })(req, res, next)
  })
})

// Remove the `user` object from the session. Example:
//   fetch('/login/clear', { method: 'POST', credentials: 'include' })
//     .then(() => window.location = '/')
router.post('/login/clear', (req, res) => {
  req.logout()
  res.status(200).send('OK')
})

// Allows to fetch the last login error(s) (which is usefull for single-page apps)
router.post('/login/error', (req, res) => {
  res.send({ errors: req.flash('error') })
})

export default router
