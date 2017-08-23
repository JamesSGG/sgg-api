// @flow

import knex from 'knex'
import faker from 'faker'
import {
  compose,
  complement,
  property,
  pick,
  head,
  mapKeys,
  camelCase,
  toNumber,
  isEmpty,
} from 'lodash/fp'

import type { $Request } from 'express'

import type {
  User,
  LoginProvider,
  LoginProfile,
  LoginTokens,
} from '../schema/flow'

const notEmpty = complement(isEmpty)

const { DATABASE_URL, DATABASE_DEBUG } = process.env

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
  migrations: {
    tableName: 'migrations',
  },
  debug: DATABASE_DEBUG === 'true',
})

export const getQueryCount = compose(toNumber, property('count'))

export function parseRecord(record: *, fields?: Array<string>): Object {
  const data = fields ? pick(fields, record) : record

  return mapKeys(camelCase, data)
}

export async function findUser(
  req: $Request,
  provider: LoginProvider,
  profile: LoginProfile,
): Promise<User> {
  const {
    id,
    emails = [],
    photos = [],
    displayName = '',
  } = profile

  const imageUrl = notEmpty(photos) ? head(photos).value : null

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

    if (!user && emails && emails.length && head(emails).verified === true) {
      const emailData = [{
        email: head(emails).value,
        verified: true,
      }]

      user = await db
        .table('users')
        .where('emails', '@>', JSON.stringify(emailData))
        .first()
    }
  }

  if (!user) {
    const emailData = emails.map((email) => ({
      email: email.value,
      verified: Boolean(email.verified),
    }))

    const users = await db
      .table('users')
      .insert({
        display_name: displayName,
        emails: JSON.stringify(emailData),
        image_url: imageUrl,
      })
      .returning('*')

    user = head(users)
  }

  if (!user) {
    return {}
  }

  // Fix tiny Facebook profile photo
  if (user.image_url.includes('50x50')) {
    user = {
      ...user,
      imageUrl,
    }

    await db
      .table('users')
      .where('id', user.id)
      .update({
        image_url: imageUrl,
      })
  }

  return parseRecord(user, [
    'id',
    'display_name',
    'image_url',
    'emails',
  ])
}

export async function getUserLogins(userId?: string) {
  const query = db
    .select('*')
    .from('logins')

  if (!userId) {
    return query
  }

  return query.where({ user_id: userId })
}

type SaveLoginArgs = {
  provider: LoginProvider,
  profile: LoginProfile,
  tokens: LoginTokens,
  user: User,
}

export async function saveLogin(args: SaveLoginArgs) {
  const { provider, profile, tokens, user } = args
  const { id, username, _json: profileRaw } = profile
  const { id: userId } = user

  const loginKeys = {
    id,
    provider,
    user_id: userId,
  }

  const loginQuery = await db
    .table('logins')
    .where(loginKeys)
    .count('id')
    .first()

  const loginCount = getQueryCount(loginQuery)

  if (loginCount === 0) {
    await db
      .table('logins')
      .insert({
        ...loginKeys,
        username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profileRaw),
      })
  }
  else {
    await db
      .table('logins')
      .where(loginKeys)
      .update({
        username,
        tokens: JSON.stringify(tokens),
        profile: JSON.stringify(profileRaw),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      })
  }
}

export async function createUser() {
  const record = {
    display_name: faker.name.findName(),
    image_url: faker.internet.avatar(),
    online_status: 'offline',
    emails: JSON.stringify([{
      email: faker.internet.email().toLowerCase(),
      verified: false,
    }]),
  }

  const newUserResults = await db
    .table('users')
    .insert(record)
    .returning('*')

  return head(newUserResults)
}

export async function addFriendToUser(userId: string, friendId: string) {
  if (!userId || !friendId) {
    return null
  }

  const hasFriendResult = await db
    .table('user_friends')
    .count('user_id')
    .where('user_id', userId)
    .andWhere('friend_id', friendId)
    .first()

  const hasFriend = getQueryCount(hasFriendResult) > 0

  if (hasFriend) {
    console.log(`User ${userId} is already friends with ${friendId}`)

    return { userId, friendId }
  }

  const record = {
    user_id: userId,
    friend_id: friendId,
  }

  await db
    .table('user_friends')
    .insert(record)

  return { userId, friendId }
}

export async function setUserOnlineStatus(userId: string, status: 'online' | 'offline') {
  const validStatusValues = [
    'online',
    'offline',
  ]

  if (!userId || !status) {
    console.log('The `userId` and `status` arguments are both required')
    return null
  }

  if (!validStatusValues.includes(status)) {
    console.log('Expected `status` to be either "online" or "offline", got: %s', status)
    return null
  }

  await db
    .table('users')
    .where('id', userId)
    .update('online_status', status)

  return { userId, status }
}


export default db
