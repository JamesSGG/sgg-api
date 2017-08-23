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
  curry,
  property,
  map,
} from 'lodash/fp'

import db from './db'

// Appends type information to an object.
// e.g. { id: 1 } => { __type: 'User', id: 1 }
function _assignType(type: string, obj: Object): Object {
  return {
    __type: type,
    ...obj,
  }
}

const assignType = curry(_assignType)

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
    const value = assignType(type, row)

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
    const newValue = assignType(type, row)
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


export default {
  create: () => ({
    allUsers() {
      const parseUsers = map(assignType('User'))

      return db
        .select('*')
        .from('users')
        .then(parseUsers)
    },
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
      const parseUsers = map(assignType('User'))

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
