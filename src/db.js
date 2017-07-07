// @flow

import knex from 'knex'

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
