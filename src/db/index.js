// @flow

import knex from 'knex'
import faker from 'faker'
import {
  compose,
  property,
  pick,
  head,
  mapKeys,
  camelCase,
  toNumber,
} from 'lodash/fp'

import type { $Request } from 'express'

import type {
  User,
  LoginProvider,
  LoginProfile,
  LoginTokens,
} from '../schema/flow'

const { DATABASE_URL, DATABASE_DEBUG } = process.env

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
  migrations: {
    tableName: 'migrations',
  },
  debug: DATABASE_DEBUG === 'true',
})

export default db

export const getQueryCount = compose(toNumber, property('count'))

export function parseRecord(record: *, fields?: Array<string>): Object {
  const data = fields ? pick(fields, record) : record

  return mapKeys(camelCase, data)
}

type FindUserArgs = {
  req?: $Request,
  provider?: LoginProvider,
  profile?: LoginProfile,
}

export async function findUserById(userId: string) {
  return db
    .table('users')
    .where({ id: userId })
    .first()
}

export async function findUserByLogin(loginProvider: LoginProvider, loginId: string) {
  return db
    .table('logins')
    .innerJoin('users', 'users.id', 'logins.user_id')
    .where({ 'logins.provider': loginProvider, 'logins.id': loginId })
    .first('users.*')
}

export async function findUserByEmail(email: string) {
  const emailData = [{
    email,
    verified: true,
  }]

  return db
    .table('users')
    .where('emails', '@>', JSON.stringify(emailData))
    .first()
}

export async function findUser(args: FindUserArgs): Promise<?User> {
  const { req, provider, profile } = args
  const {
    id,
    emails = [],
    photos = [],
  } = profile || {}

  const {
    value: email,
    verified: isEmailVerified,
  } = head(emails) || {}

  const { value: imageUrl } = head(photos) || {}

  let user

  if (req && req.user) {
    user = await findUserById(req.user.id)
  }

  if (!user && provider && id) {
    user = await findUserByLogin(provider, id)
  }

  if (!user && isEmailVerified) {
    user = await findUserByEmail(email)
  }

  if (!user) {
    return null
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

export async function createUser(profile: LoginProfile): Promise<User> {
  const {
    emails = [],
    photos = [],
    displayName = '',
  } = profile || {}

  const { value: imageUrl } = head(photos) || {}

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

  return head(users)
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

export async function createFakeUser() {
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


export async function getAllUsers(): Promise<Array<User>> {
  return db
    .select('*')
    .from('users')
}

export async function getUserGamesPlayed(userId: string) {
  return db
    .select('game_title', 'game_platform', 'gamer_tag')
    .from('user_games_played')
    .where('user_id', userId)
}

export async function getFriendsOfUser(userId: string): Promise<Array<User>> {
  return db
    .select('user_id', 'friend_id')
    .from('user_friends')
    .whereIn('user_id', userId)
}

export async function getNonFriendsOfUser(userId: string): Promise<Array<User>> {
  return db
    .select('user_id', 'friend_id')
    .from('user_friends')
    .where('user_id', userId)
    .then((results) => {
      const friendIds = results.map(property('friend_id'))
      const excludedUserIds = friendIds.concat([userId])

      return db
        .select('*')
        .from('users')
        .whereNotIn('id', excludedUserIds)
    })
}
