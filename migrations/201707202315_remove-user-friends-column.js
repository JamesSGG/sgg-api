
module.exports.up = async (db) => {
  await db.schema.table('users', (table) => {
    table.dropColumn('friends')
  })
}

module.exports.down = async (db) => {
  await db.schema.table('users', (table) => {
    table
      .jsonb('friends')
      .notNullable()
      .defaultsTo('[]')
  })
}

module.exports.configuration = {
  transaction: true,
}
