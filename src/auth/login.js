
import { complement, first, isEmpty } from 'lodash/fp'

import db, { parseRecord } from '../db'
import { isUserSubscribedToList, addUserToList } from '../adapters/mailchimp'

const notEmpty = complement(isEmpty)

// Creates or updates the external login credentials
// and returns the currently authenticated user.
export default async function login(req, provider, profile, tokens) {
  const {
    id,
    username,
    displayName,
    emails,
    photos,
  } = profile

  const imageUrl = notEmpty(photos) ? first(photos).value : null

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
      .where({ 'logins.provider': provider, 'logins.id': id })
      .first('users.*')

    if (!user && emails && emails.length && first(emails).verified === true) {
      const emailData = [{
        email: first(emails).value,
        verified: true,
      }]

      user = await db
        .table('users')
        .where('emails', '@>', JSON.stringify(emailData))
        .first()
    }
  }

  if (!user) {
    const emailData = (emails || []).map((x) => ({
      email: x.value,
      verified: Boolean(x.verified),
    }))

    const users = await db
      .table('users')
      .insert({
        display_name: displayName,
        emails: JSON.stringify(emailData),
        image_url: imageUrl,
      })
      .returning('*')

    user = first(users)
  }

  const loginKeys = {
    id,
    provider,
    user_id: user.id,
  }

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
        username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profile._json),
      })
  }
  else {
    await db
      .table('logins')
      .where(loginKeys)
      .update({
        username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profile._json),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      })
  }

  // Fix tiny Facebook profile photo
  if (user.image_url.includes('50x50')) {
    await db
      .table('users')
      .where('id', user.id)
      .update({
        image_url: imageUrl,
      })
  }

  // Add user to MailChimp list if not already subscribed.
  const listId = '1acb1a7282'
  const userEmail = first(user.emails).email

  if (!isUserSubscribedToList(listId, userEmail)) {
    addUserToList(listId, userEmail)
  }

  return parseRecord(user, [
    'id',
    'display_name',
    'image_url',
    'emails',
  ])
}
