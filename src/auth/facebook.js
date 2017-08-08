/**
 * Facebook auth strategy for Passport.js
 *
 * @see https://github.com/jaredhanson/passport-facebook
 */

import { Strategy as FacebookStrategy } from 'passport-facebook'
import { isEmpty } from 'lodash/fp'

import login from './login'

const { FACEBOOK_ID, FACEBOOK_SECRET } = process.env

export default new FacebookStrategy({
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
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    if (!isEmpty(profile.emails)) {
      profile.emails[0].verified = Boolean(profile._json.verified)
    }

    console.log(profile)

    const { givenName, familyName } = profile.name
    profile.displayName = profile.displayName || `${givenName} ${familyName}`

    const user = await login(req, 'facebook', profile, { accessToken, refreshToken })
    done(null, user)
  }
  catch (err) {
    done(err)
  }
})
