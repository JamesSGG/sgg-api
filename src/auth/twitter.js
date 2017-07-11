/* eslint-disable no-param-reassign */

/**
 * Twitter auth strategy for Passport.js
 *
 * @see https://github.com/jaredhanson/passport-twitter
 */

import { Strategy as TwitterStrategy } from 'passport-twitter'
import { isEmpty } from 'lodash/fp'

import login from './login'


const { TWITTER_KEY, TWITTER_SECRET } = process.env

export default new TwitterStrategy({
  consumerKey: TWITTER_KEY,
  consumerSecret: TWITTER_SECRET,
  callbackURL: '/login/twitter/return',
  includeEmail: true,
  includeStatus: false,
  passReqToCallback: true,
}, async (req, token, tokenSecret, profile, done) => {
  try {
    if (!isEmpty(profile.emails)) {
      profile.emails[0].verified = true
    }

    const user = await login(req, 'twitter', profile, { token, tokenSecret })
    done(null, user)
  }
  catch (err) {
    done(err)
  }
})