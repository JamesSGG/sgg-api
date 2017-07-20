
module.exports.up = async (db) => {
  await db.schema.createTable('user_friends', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table
      .uuid('friend_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table.timestamps(false, true)
    table.primary(['user_id', 'friend_id'])
  })
}

module.exports.down = async (db) => {
  await db.schema.dropTableIfExists('user_friends')
}

module.exports.configuration = {
  transaction: true,
}
