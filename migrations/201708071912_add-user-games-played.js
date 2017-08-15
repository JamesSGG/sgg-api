
module.exports.up = async (db) => {
  await db.schema.createTable('user_games_played', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .primary()

    table
      .string('game_title')
      .notNullable()

    table
      .enum('game_platform', ['pc', 'xbox', 'playstation'])
      .notNullable()

    table
      .string('gamer_tag')
      .notNullable()
      .defaultTo('')

    table.timestamps(false, true)
  })
}

module.exports.down = async (db) => {
  await db.schema.dropTableIfExists('user_games_played')
}

module.exports.configuration = {
  transaction: true,
}
