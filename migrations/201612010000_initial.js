
// Create database schema for storing user accounts, logins and authentication claims/tokens
// Source https://github.com/membership/membership.db
module.exports.up = async (db) => {
  await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
  await db.raw('CREATE EXTENSION IF NOT EXISTS "hstore";')

  // User accounts
  await db.schema.createTable('users', (table) => {
    // UUID v1mc reduces the negative side effect of using random primary keys
    // with respect to keyspace fragmentation on disk for the tables because it's time based
    // https://www.postgresql.org/docs/current/static/uuid-ossp.html
    table
      .uuid('id')
      .notNullable()
      .defaultTo(db.raw('uuid_generate_v1mc()'))
      .primary()

    table.string('display_name', 100)
    table.string('image_url', 200)

    table
      .jsonb('emails')
      .notNullable()
      .defaultTo('[]')

    table.timestamps(false, true)
  })

  // External logins with security tokens (e.g. Google, Facebook, Twitter)
  await db.schema.createTable('logins', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table.string('provider', 16).notNullable()
    table.string('id', 36).notNullable()
    table.string('username', 100)
    table.jsonb('tokens').notNullable()
    table.jsonb('profile').notNullable()
    table.timestamps(false, true)
    table.primary(['provider', 'id'])
  })
}

module.exports.down = async (db) => {
  await db.schema.dropTableIfExists('logins')
  await db.schema.dropTableIfExists('users')
}

module.exports.configuration = {
  transaction: true,
}
