
module.exports.up = async (db) => {
  await db.schema.createTable('game_platforms', (table) => {
    table
      .uuid('id')
      .notNullable()
      .defaultTo(db.raw('uuid_generate_v1mc()'))
      .primary()

    table
      .string('platform_name')
      .notNullable()
  })
}

module.exports.down = async (db) => {
  await db.schema.dropTableIfExists('game_platforms')
}

module.exports.configuration = {
  transaction: true,
}
