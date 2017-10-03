
module.exports.up = async (db) => {
  await db.schema.table('user_games_played', (table) => {
    table.dropPrimary()

    table
      .uuid('id')
      .notNullable()
      .defaultTo(db.raw('uuid_generate_v1mc()'))
      .primary()
  })
}

module.exports.down = async (db) => {
  await db.schema.table('user_games_played', (table) => {
    table.dropPrimary()
    table.dropColumn('id')

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .primary()
      .alter()
  })
}

module.exports.configuration = {
  transaction: true,
}
