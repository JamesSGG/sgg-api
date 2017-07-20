#!/usr/bin/env node

const fs = require('fs')
const knex = require('knex')

const task = require('./task')

// The list of available commands, e.g. node tools/db.js rollback
const commands = ['version', 'migrate', 'rollback', 'migration', 'seed']
const command = process.argv[2]

const { DATABASE_URL } = process.env

const config = {
  client: 'pg',
  connection: DATABASE_URL,
  migrations: {
    tableName: 'migrations',
  },
}

// The template for database migration files (see templates/*.js)
const version = new Date().toISOString().substr(0, 16).replace(/\D/g, '')
const template = `
module.exports.up = async (db) => {

}

module.exports.down = async (db) => {

}

module.exports.configuration = {
  transaction: true,
}
`

module.exports = task('db', async () => {
  let db

  if (!commands.includes(command)) {
    throw new Error(`Unknown command: ${command}`)
  }

  try {
    switch (command) {
      case 'version': {
        db = knex(config)
        await db.migrate.currentVersion(config).then(console.log)
        break
      }
      case 'migration': {
        fs.writeFileSync(`migrations/${version}_${process.argv[3] || 'new'}.js`, template, 'utf8')
        break
      }
      case 'rollback': {
        db = knex(config)
        await db.migrate.rollback(config)
        break
      }
      case 'seed': {
        db = knex(config)
        await db.seed.run(config)
        break
      }
      default: {
        db = knex(config)
        await db.migrate.latest(config)
      }
    }
  }
  finally {
    if (db) {
      await db.destroy()
    }
  }
})
