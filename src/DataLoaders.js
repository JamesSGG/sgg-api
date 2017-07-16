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
import { curry, property } from 'lodash/fp'

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

export default {
  create: () => ({
    users: new DataLoader(function resolve(keys) {
      return db
        .table('users')
        .whereIn('id', keys)
        .select('*')
        .then(mapTo(keys, property('id'), 'User'))
    }),
  }),
}
