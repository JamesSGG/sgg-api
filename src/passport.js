// @flow
/* eslint-disable no-param-reassign */

import passport from 'passport'
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { Strategy as TwitterStrategy } from 'passport-twitter'
import { pick, first, isEmpty } from 'lodash/fp'

import db from './db'

passport.serializeUser((user, done) => {
  const getUserData = pick(['id', 'displayName', 'imageUrl', 'emails'])

  done(null, getUserData(user))
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

// Creates or updates the external login credentials
// and returns the currently authenticated user.
async function login(req, provider, profile, tokens) {
  let user

  if (req.user) {
    user = await db
      .table('users')
      .where({ id: req.user.id })
      .first()
  }

  if (!user) {
    user = await db
      .table('logins')
      .innerJoin('users', 'users.id', 'logins.user_id')
      .where({ 'logins.provider': provider, 'logins.id': profile.id })
      .first('users.*')
    if (!user && profile.emails && profile.emails.length && profile.emails[0].verified === true) {
      user = await db
        .table('users')
        .where('emails', '@>', JSON.stringify([{ email: profile.emails[0].value, verified: true }]))
        .first()
    }
  }

  if (!user) {
    const users = await db
      .table('users')
      .insert({
        display_name: profile.displayName,
        emails: JSON.stringify((profile.emails || []).map((x) => ({
          email: x.value,
          verified: x.verified || false,
        }))),
        image_url: profile.photos && profile.photos.length ? profile.photos[0].value : null,
      })
      .returning('*')

    user = first(users)
  }

  const loginKeys = { user_id: user.id, provider, id: profile.id }
  const { count } = await db.table('logins').where(loginKeys).count('id').first()

  if (count === '0') {
    await db
      .table('logins')
      .insert({
        ...loginKeys,
        username: profile.username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profile._json),
      })
  }
  else {
    await db
      .table('logins')
      .where(loginKeys)
      .update({
        username: profile.username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profile._json),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      })
  }

  return {
    id: user.id,
    displayName: user.display_name,
    imageUrl: user.image_url,
    emails: user.emails,
  }
}

// https://github.com/jaredhanson/passport-google-oauth2
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: '/login/google/return',
  passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const user = await login(req, 'google', profile, { accessToken, refreshToken })
    done(null, user)
  }
  catch (err) {
    done(err)
  }
}))

// https://github.com/jaredhanson/passport-facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  profileFields: ['name', 'email', 'picture', 'link', 'locale', 'timezone', 'verified'],
  callbackURL: '/login/facebook/return',
  passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    if (!isEmpty(profile.emails)) {
      profile.emails[0].verified = Boolean(profile._json.verified)
    }

    const { givenName, familyName } = profile.name
    profile.displayName = profile.displayName || `${givenName} ${familyName}`

    const user = await login(req, 'facebook', profile, { accessToken, refreshToken })
    done(null, user)
  }
  catch (err) {
    done(err)
  }
}))

// https://github.com/jaredhanson/passport-twitter
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_KEY,
  consumerSecret: process.env.TWITTER_SECRET,
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
}))

export default passport
