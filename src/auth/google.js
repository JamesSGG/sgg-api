/**
 * Google auth strategy for Passport.js
 *
 * @see https://github.com/jaredhanson/passport-google-oauth2
 */

import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth'

import login from './login'

const { GOOGLE_ID, GOOGLE_SECRET } = process.env

const config = {
  clientID: GOOGLE_ID,
  clientSecret: GOOGLE_SECRET,
  callbackURL: '/login/google/return',
  passReqToCallback: true,
}

async function verify(req, accessToken, refreshToken, profile, done) {
  try {
    const user = await login(req, 'google', profile, { accessToken, refreshToken })
    done(null, user)
  }
  catch (err) {
    done(err)
  }
}

export default new GoogleStrategy(config, verify)
