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
import {
  compose,
  curry,
  property,
  map,
  uniq,
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

const getQueryCount = compose(
  toNumber,
  property('count'),
  first,
)

export default {
  create: () => ({
    allUsers() {
      const parseUsers = map((row) => assignType(row, 'User'))

      return db
        .select('*')
        .from('users')
        .then(parseUsers)
    },
    async addFriendToUser(userId: string, friendId: string) {
      if (!userId || !friendId) {
        return null
      }

      const hasFriendResult = await db
        .table('user_friends')
        .count('user_id')
        .where('user_id', userId)
        .andWhere('friend_id', friendId)

      const hasFriend = getQueryCount(hasFriendResult) > 0

      if (hasFriend) {
        console.log(`User ${userId} is already friends with ${friendId}`)

        return { userId, friendId }
      }

      await db
        .table('user_friends')
        .insert({ user_id: userId, friend_id: friendId })

      return { userId, friendId }
    },
    updateUser(userId: *, data: *) {
      db
        .select('*')
        .from('users')
        .where('id', userId)
        .then((rows) => {
          const user = rows[0]

          const newEmails = uniq([
            ...(user.emails || []),
            ...(data.emails || []),
          ])

          const newFriends = uniq([
            ...(user.friends || []),
            ...(data.friends || []),
          ])

          const newUserData = {
            ...user,
            emails: JSON.stringify(newEmails),
            friends: JSON.stringify(newFriends),
          }

          return db('users')
            .where('id', userId)
            .update(newUserData)
        })
    },
    friendsOfUser: new DataLoader(function resolve(keys) {
      const parseUsers = mapToMany(keys, property('user_id'), 'UserFriend')

      return db
        .select('user_id', 'friend_id')
        .from('user_friends')
        .whereIn('user_id', keys)
        .then(parseUsers)
    }),
    usersById: new DataLoader(function resolve(keys: Array<*>) {
      const parseUsers = mapTo(keys, property('id'), 'User')

      return db
        .select('*')
        .from('users')
        .whereIn('id', keys)
        .then(parseUsers)
    }),
  }),
}
