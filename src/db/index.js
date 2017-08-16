// @flow

import knex from 'knex'
import { pick, mapKeys, camelCase } from 'lodash/fp'

const { DATABASE_URL, DATABASE_DEBUG } = process.env

const db = knex({
  client: 'pg',
  connection: DATABASE_URL,
  migrations: {
    tableName: 'migrations',
  },
  debug: DATABASE_DEBUG === 'true',
})

export function parseRecord(record: *, fields?: Array<string>): Object {
  const data = fields ? pick(fields, record) : record

  return mapKeys(camelCase, data)
}

export default db
