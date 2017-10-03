
module.exports.up = async (db) => {
  await db.schema.table('user_games_played', (table) => {
    table.dropColumn('game_title')
    table.dropColumn('game_platform')
  })

  await db.schema.table('user_games_played', (table) => {
    table
      .uuid('game_id')
      .references('id')
      .inTable('games')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table
      .uuid('platform_id')
      .references('id')
      .inTable('game_platforms')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })
}

module.exports.down = async (db) => {
  await db.schema.table('user_games_played', (table) => {
    table.dropColumn('game_title')
    table.dropColumn('game_platform')
  })

  await db.schema.table('user_games_played', (table) => {
    table
      .string('game_title')
      .notNullable()

    table
      .enum('game_platform', ['pc', 'xbox', 'playstation'])
      .notNullable()
  })
}

module.exports.configuration = {
  transaction: true,
}
