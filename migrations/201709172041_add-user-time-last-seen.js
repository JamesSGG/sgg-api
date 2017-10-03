
module.exports.up = async (db) => {
  await db.schema.table('users', (table) => {
    table.dropColumn('online_status')

    table
      .dateTime('last_seen_at')
      .notNullable()
      .defaultTo(db.fn.now())
  })
}

module.exports.down = async (db) => {
  await db.schema.table('users', (table) => {
    table.dropColumn('last_seen_at')

    table
      .enum('online_status', ['online', 'offline'])
      .notNullable()
      .defaultTo('offline')
  })
}

module.exports.configuration = {
  transaction: true,
}
