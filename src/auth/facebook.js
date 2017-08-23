/**
 * Facebook auth strategy for Passport.js
 *
 * @see https://github.com/jaredhanson/passport-facebook
 */

import { Strategy as FacebookStrategy } from 'passport-facebook'
import { isEmpty } from 'lodash/fp'

import login from './login'

const { FACEBOOK_ID, FACEBOOK_SECRET } = process.env

const config = {
  clientID: FACEBOOK_ID,
  clientSecret: FACEBOOK_SECRET,
  callbackURL: '/login/facebook/return',
  passReqToCallback: true,
  profileFields: [
    'name',
    'email',
    'picture.type(large)',
    'verified',
    'friends',
  ],
}

async function verify(req, accessToken, refreshToken, profile, done) {
  try {
    const { emails, name, displayName, _json } = profile
    const { givenName, familyName } = name

    profile.displayName = displayName || `${givenName} ${familyName}`

    if (!isEmpty(emails)) {
      profile.emails[0].verified = Boolean(_json.verified)
    }

    const tokens = { accessToken, refreshToken }
    const user = await login(req, 'facebook', profile, tokens)

    done(null, user)
  }
  catch (err) {
    done(err)
  }
}

export default new FacebookStrategy(config, verify)
