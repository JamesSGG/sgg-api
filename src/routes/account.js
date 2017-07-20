// @flow

import URL from 'url'
import passport from 'passport'
import validator from 'validator'
import { Router } from 'express'
import { compose, compact } from 'lodash/fp'

const router = new Router()

// External login providers.
const loginProviders = [
  {
    provider: 'facebook',
    options: { scope: ['email', 'user_friends'] },
  },
  // {
  //   provider: 'google',
  //   options: { scope: 'profile email' },
  // },
  // {
  //   provider: 'twitter',
  //   options: {},
  // },
]

// '/about' => ''
// http://localhost:3200/some/page => http://localhost:3200
function getOrigin(url: string): string {
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
// 'http://localhost:3200/about' => `true` (but only if its origin is whitelisted)
function isValidReturnURL(url: string): boolean {
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
// For example, a user goes to http://localhost:3200/login (frontend) to sign in,
// then he's being redirected to http://localhost:8880/login/facebook (backend),
// Passport.js redirects the user to Facebook, which redirects the user back to
// http://localhost:8880/login/facebook/return and finally, user is being redirected
// to http://localhost:3200/?sessionID=xxx where front-end middleware can save that
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

const setReturnUrl = (req, res, next) => {
  req.session.returnTo = getSuccessRedirect(req)
  next()
}

// Registers route handlers for the external login providers
loginProviders.forEach(({ provider, options }) => {
  const handleLogin = passport.authenticate(provider, {
    failureFlash: true,
    ...options,
  })

  const handleReturn = (req, res, next) => {
    const { returnTo } = req.session

    const authenticate = passport.authenticate(provider, {
      successReturnToOrRedirect: true,
      failureFlash: true,
      failureRedirect: `${getOrigin(returnTo)}/login`,
    })

    return authenticate(req, res, next)
  }

  const handleError = (error, req, res, next) => {
    console.log(error.message)

    res.send({
      error: true,
      message: error.message,
    })

    next()
  }

  router.get(`/login/${provider}`, setReturnUrl, handleLogin, handleError)
  router.get(`/login/${provider}/return`, handleReturn, handleError)
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
