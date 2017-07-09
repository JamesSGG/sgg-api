// @flow
/* eslint-disable no-param-reassign */

import passport from 'passport'
import { pick } from 'lodash/fp'

import facebookStrategy from './facebook'

passport.serializeUser((user, done) => {
  const getUserData = pick(['id', 'displayName', 'imageUrl', 'emails'])

  done(null, getUserData(user))
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

passport.use(facebookStrategy)

export default passport
