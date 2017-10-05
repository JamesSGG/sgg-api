// @flow

import knex from 'knex'
import faker from 'faker'
import {
  curry,
  compose,
  property,
  map,
  head,
  mapKeys,
  camelCase,
  snakeCase,
  toNumber,
} from 'lodash/fp'

import type { $Request } from 'express'

import type {
  User,
  LoginProvider,
  LoginProfile,
  LoginTokens,
  GamePlayed,
  AddFriendResult,
  // AddGameInput,
  // AddGamePlatformInput,
  // AddGamePlayedInput,
  // EditGameInput,
  // EditGamePlatformInput,
  // EditGamePlayedInput,
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

export const camelKeys = mapKeys(camelCase)
export const snakeKeys = mapKeys(snakeCase)

export const getQueryCount = compose(toNumber, property('count'))

async function _findRecord(tableName: string, id: string) {
  return db
    .select('*')
    .from(tableName)
    .where('id', id)
    .then(head)
}

async function _createRecord(tableName: string, input: *) {
  const record = snakeKeys(input)

  return db
    .table(tableName)
    .insert(record)
    .returning('*')
    .then(head)
}

async function _updateRecord(tableName: string, input: *) {
  const { id, ...fields } = input
  const record = snakeKeys(fields)

  return db
    .table(tableName)
    .where('id', id)
    .update(record)
    .returning('*')
    .then(head)
}

async function _deleteRecord(tableName: string, id: string) {
  return db
    .table(tableName)
    .where('id', id)
    .del()
}

export function findAllRecords(tableName: string) {
  return async () => db.select('*').from(tableName)
}

export const findRecord = curry(_findRecord)
export const createRecord = curry(_createRecord)
export const updateRecord = curry(_updateRecord)
export const deleteRecord = curry(_deleteRecord)

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

  const dbRecord = snakeKeys({
    displayName,
    imageUrl,
    emails: JSON.stringify(emailData),
  })

  return db
    .table('users')
    .insert(dbRecord)
    .returning('*')
    .then(head)
}

export const deleteUser = deleteRecord('users')

export async function findUserById(userId: string) {
  return findRecord('users', userId)
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

type FindUserArgs = {
  req?: $Request,
  provider?: LoginProvider,
  profile?: LoginProfile,
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
  if (user.image_url && user.image_url.includes('50x50')) {
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

  return camelKeys(user)
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

  console.log('---------- saveLogin ----------')
  console.log(`ID: ${id}`)
  console.log(`userId: ${userId}`)
  console.log(`Provider: ${provider}`)
  console.log('profile:')
  console.log(profile)
  console.log('-------------------------------')

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
    emails: JSON.stringify([{
      email: faker.internet.email().toLowerCase(),
      verified: false,
    }]),
  }

  return db
    .table('users')
    .insert(record)
    .returning('*')
    .then(head)
}

export const findAllUsers = findAllRecords('users')
export const findAllGames = findAllRecords('games')
export const findAllGamePlatforms = findAllRecords('game_platforms')
export const findAllGamesPlayed = findAllRecords('user_games_played')

export async function getGamePlayed(id: string): Promise<Array<GamePlayed>> {
  return db
    .select(
      'user_games_played.*',
      'games.game_title',
      'game_platforms.platform_name',
    )
    .from('user_games_played')
    .where('user_games_played.id', id)
    .leftOuterJoin('games', {
      'user_games_played.game_id': 'games.id',
    })
    .leftOuterJoin('game_platforms', {
      'user_games_played.platform_id': 'game_platforms.id',
    })
    .then(head)
}

export async function getUserGamesPlayed(userId: string): Promise<Array<GamePlayed>> {
  return db
    .select(
      'user_games_played.*',
      'games.game_title',
      'game_platforms.platform_name',
    )
    .from('user_games_played')
    .where('user_games_played.user_id', userId)
    .leftOuterJoin('games', {
      'user_games_played.game_id': 'games.id',
    })
    .leftOuterJoin('game_platforms', {
      'user_games_played.platform_id': 'game_platforms.id',
    })
}

export async function getFriendsOfUser(userId: string): Promise<Array<User>> {
  return db
    .select('*')
    .from('user_friends')
    .whereIn('user_id', userId)
}

export async function getNonFriendsOfUser(userId: string): Promise<Array<User>> {
  return db
    .select('friend_id')
    .from('user_friends')
    .where('user_id', userId)
    .then(map(property('friend_id')))
    .then((friendIds) => {
      const excludedUserIds = friendIds.concat([userId])

      return db
        .select('*')
        .from('users')
        .whereNotIn('id', excludedUserIds)
    })
}

export async function bumpUserLastSeenAt(userId: string): Promise<String> {
  return db
    .table('users')
    .where('id', userId)
    .update('last_seen_at', db.fn.now())
    .returning('last_seen_at')
    .then(head)
}

export const createGame = createRecord('games')
export const updateGame = updateRecord('games')
export const deleteGame = deleteRecord('games')

export const createGamePlatform = createRecord('game_platforms')
export const updateGamePlatform = updateRecord('game_platforms')
export const deleteGamePlatform = deleteRecord('game_platforms')

export const createUserGamePlayed = createRecord('user_games_played')
export const updateUserGamePlayed = updateRecord('user_games_played')
export const deleteUserGamePlayed = deleteRecord('user_games_played')


export async function addFriendToUser(
  userId: string,
  friendId: string,
): Promise<?AddFriendResult> {
  // Bail if we don't have both the requesting and receiving user IDs.
  if (!userId || !friendId) {
    return null
  }

  // Log a warning and return successfully if the requesting user and the
  // receiving user are the same. This should never happen but ¯\_(ツ)_/¯
  if (userId === friendId) {
    console.log('You can’t add a user to its own friends list')
    console.log(`The user in question is: ${userId}`)

    return { userId, friendId }
  }

  // Check to see if the receiving user is already in the requesting user's
  // friends list.
  const hasFriendResult = await db
    .table('user_friends')
    .count('user_id')
    .where('user_id', userId)
    .andWhere('friend_id', friendId)
    .then(head)

  const hasFriend = getQueryCount(hasFriendResult) > 0

  if (hasFriend) {
    console.log(`User ${userId} is already friends with ${friendId}`)

    return { userId, friendId }
  }

  return createRecord('user_friends', { userId, friendId })
}
