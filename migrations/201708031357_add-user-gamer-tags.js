
module.exports.up = async (db) => {
  await db.schema.createTable('user_gamer_tags', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
      .primary()

    table
      .string('tag')
      .notNullable()

    table.timestamps(false, true)
  })
}

module.exports.down = async (db) => {
  await db.schema.dropTableIfExists('user_gamer_tags')
}

module.exports.configuration = {
  transaction: true,
}
