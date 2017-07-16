
const faker = require('faker')
const { range } = require('lodash/fp')

module.exports.seed = async (db) => {
  // Create 10 random website users (as an example)
  const users = range(10).map(function createUser() {
    return {
      display_name: faker.name.findName(),
      image_url: faker.internet.avatar(),
      emails: JSON.stringify([{ email: faker.internet.email().toLowerCase(), verified: false }]),
    }
  })

  await Promise.all(users.map(function insertUser(user) {
    return db
      .table('users')
      .insert(user)
      .returning('id')
      .then((rows) => db.table('users').where('id', '=', rows[0]).first('*'))
      .then((row) => Object.assign(user, row))
  }))
}
