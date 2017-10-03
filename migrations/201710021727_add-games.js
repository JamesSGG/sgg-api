
module.exports.up = async (db) => {
  await db.schema.createTable('games', (table) => {
    table
      .uuid('id')
      .notNullable()
      .defaultTo(db.raw('uuid_generate_v1mc()'))
      .primary()

    table
      .string('game_title')
      .notNullable()

    table.timestamps(false, true)
  })
}

module.exports.down = async (db) => {
  await db.schema.dropTableIfExists('games')
}

module.exports.configuration = {
  transaction: true,
}
