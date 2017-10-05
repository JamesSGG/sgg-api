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
    options: { scope: ['email', 'public_profile', 'user_friends'] },
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

  const { CORS_ORIGIN, NODE_ENV } = process.env
  const whitelist = CORS_ORIGIN ? CORS_ORIGIN.split(',') : []

  const isValidUrl = validator.isURL(url, {
    require_tld: NODE_ENV === 'production',
    require_protocol: true,
    protocols: ['http', 'https'],
  })

  const urlOrigin = getOrigin(url)
  const isAllowedOrigin = whitelist && whitelist.includes(urlOrigin)

  return isValidUrl && isAllowedOrigin
}

// Generates a URL for redirecting a user to upon successfull authentication.
// It is intended to support cross-domain authentication in development mode.
// For example, a user goes to http://localhost:3200/login (frontend) to sign in,
// then he's being redirected to http://localhost:8880/login/facebook (backend),
// Passport.js redirects the user to Facebook, which redirects the user back to
// http://localhost:8880/login/facebook/return and finally, user is being redirected
// to http://localhost:3200/?sessionId=xxx where front-end middleware can save that
// session ID into cookie (res.cookie.sid = req.query.sessionId).
function getBaseRedirectUrl(req) {
  const url = req.query.return || req.body.return || '/'

  if (!isValidReturnURL(url)) {
    return '/'
  }

  return url
}

const setBaseReturnUrl = (req, res, next) => {
  req.session.returnUrl = getBaseRedirectUrl(req)
  next()
}

const getSuccessReturnUrl = (req) => {
  const { user = {}, session = {} } = req
  const { returnUrl } = session

  if (!getOrigin(returnUrl)) {
    return returnUrl
  }

  const queryString = compact([
    user.id && `userId=${user.id}`,
    // sessionId && `sessionId=${sessionId}`,
    // originalMaxAge && `maxAge=${originalMaxAge}`,
  ]).join('&')

  const separator = (returnUrl || '').includes('?') ? '&' : '?'

  return `${returnUrl}${separator}${queryString}`
}

const handleError = (error, req, res, next) => {
  console.log(error.message)

  res.send({
    error: true,
    message: error.message,
  })

  next()
}

// Registers route handlers for the external login providers
loginProviders.forEach(({ provider, options }) => {
  const handleLogin = passport.authenticate(provider, {
    failureFlash: true,
    ...options,
  })

  const handleAuth = (req, res, next) => {
    const returnUrl = getSuccessReturnUrl(req)

    const authenticate = passport.authenticate(provider, {
      failureFlash: true,
      failureRedirect: `${getOrigin(returnUrl)}/login`,
    })

    return authenticate(req, res, next)
  }

  const handleReturn = (req, res) => {
    const returnUrl = getSuccessReturnUrl(req)

    res.redirect(returnUrl)
  }

  router.get(`/login/${provider}`, setBaseReturnUrl, handleLogin, handleError)
  router.get(`/login/${provider}/return`, handleAuth, handleReturn, handleError)
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
