// @flow

/*
 * Data loaders to be used with GraphQL resolve() functions. For example:
 *
 *   resolve(post, args, { users }) {
 *     return users.load(post.author_id);
 *   }
 *
 * For more information visit https://github.com/facebook/dataloader
 */

import DataLoader from 'dataloader'
import faker from 'faker'
import {
  compose,
  curry,
  property,
  map,
  first,
  toNumber,
} from 'lodash/fp'

import db from './db'

// Appends type information to an object.
// e.g. { id: 1 } => { __type: 'User', id: 1 }
export function assignType(
  obj: Object,
  type: string,
): Object {
  return {
    __type: type,
    ...obj,
  }
}

export function _mapTo(
  keys: Array<*>,
  getRowKey: (row: *) => *,
  type: string,
  rows: Array<*>,
): Array<*> {
  const pairs = keys.map((key) => [key, null])
  const group = new Map(pairs)

  rows.forEach((row) => {
    const key = getRowKey(row)
    const value = assignType(row, type)

    group.set(key, value)
  })

  return Array.from(group.values())
}

export function _mapToMany(
  keys: Array<*>,
  getRowKey: (row: *) => *,
  type: string,
  rows: Array<*>,
): Array<*> {
  const pairs = keys.map((key) => [key, []])
  const group = new Map(pairs)

  rows.forEach((row) => {
    const key = getRowKey(row)
    const newValue = assignType(row, type)
    const currentValue = group.get(key) || []

    group.set(key, [...currentValue, newValue])
  })

  return Array.from(group.values())
}

function _mapToValues(
  keys: Array<*>,
  getRowKey: (row: *) => *,
  getRowValue: (row: *) => *,
  rows: Array<*>,
): Array<*> {
  const pairs = keys.map((key) => [key, null])
  const group = new Map(pairs)

  rows.forEach((row) => {
    const key = getRowKey(row)
    const value = getRowValue(row)

    group.set(key, value)
  })

  return Array.from(group.values())
}

export const mapTo = curry(_mapTo)
export const mapToMany = curry(_mapToMany)
export const mapToValues = curry(_mapToValues)

const getQueryCount = compose(toNumber, property('count'))

async function createUser() {
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

  return first(newUserResults)
}

async function addFriendToUser(userId: string, friendId: string) {
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

export default {
  create: () => ({
    allUsers() {
      const parseUsers = map((row) => assignType(row, 'User'))

      return db
        .select('*')
        .from('users')
        .then(parseUsers)
    },
    createUser,
    addFriendToUser,
    setUserOnlineStatus,
    friendsOfUser: new DataLoader(function resolve(keys) {
      const parseUsers = mapToMany(keys, property('user_id'), 'UserFriend')

      return db
        .select('user_id', 'friend_id')
        .from('user_friends')
        .whereIn('user_id', keys)
        .then(parseUsers)
    }),
    userGamesPlayed(userId: string) {
      return db
        .select('game_title', 'game_platform', 'gamer_tag')
        .from('user_games_played')
        .where('user_id', userId)
    },
    nonFriendsOfUser(userId: string) {
      const parseUsers = map((row) => assignType(row, 'User'))

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
            .then(parseUsers)
        })
    },
    usersById: new DataLoader(function resolve(keys: Array<*>) {
      const parseUsers = mapTo(keys, property('id'), 'User')

      return db
        .select('*')
        .from('users')
        .whereIn('id', keys)
        .then(parseUsers)
    }),
    usersByNotId: new DataLoader(function resolve(keys: Array<*>) {
      const parseUsers = mapToMany(keys, property('id'), 'User')

      return db
        .select('*')
        .from('users')
        .whereNotIn('id', keys)
        .then(parseUsers)
    }),
  }),
}
