
import { first } from 'lodash/fp'

import db from '../db'

// Creates or updates the external login credentials
// and returns the currently authenticated user.
export default async function login(req, provider, profile, tokens) {
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
  const { count } = await db
    .table('logins')
    .where(loginKeys)
    .count('id')
    .first()

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
