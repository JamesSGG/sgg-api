
module.exports.up = async (db) => {
  await db.schema.table('users', (table) => {
    table
      .enum('online_status', ['online', 'offline'])
      .notNullable()
      .defaultTo('offline')
  })
}

module.exports.down = async (db) => {
  await db.schema.table('users', (table) => {
    table.dropColumn('online_status')
  })
}

module.exports.configuration = {
  transaction: true,
}
