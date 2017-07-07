
const faker = require('faker')
const { range, random, truncate } = require('lodash/fp')

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

  // Create 500 stories
  const stories = range(500).map(function createStory() {
    const createdDate = faker.date.past()
    const userId = random(0, users.length - 1)
    const title = faker.lorem.sentence(random(4, 7))
    const truncateTitle = truncate({
      length: 80,
      separator: /(,.)? +/,
      omission: '',
    })

    const includeText = (Math.random() > 0.3)

    return {
      created_at: createdDate,
      updated_at: createdDate,
      author_id: users[userId].id,
      title: truncateTitle(title),
      text: includeText ? faker.lorem.text() : '',
      url: includeText ? '' : faker.internet.url(),
    }
  })

  await Promise.all(stories.map(function insertStore(story) {
    return db
      .table('stories')
      .insert(story)
      .returning('id')
      .then((rows) => db.table('stories').where('id', '=', rows[0]).first('*'))
      .then((row) => Object.assign(story, row))
  }))

  // Create some user comments
  const comments = range(2000).map(function createComment() {
    const createdDate = faker.date.past()
    const storyId = random(0, stories.length - 1)
    const userId = random(0, users.length - 1)

    return {
      created_at: createdDate,
      updated_at: createdDate,
      story_id: stories[storyId].id,
      author_id: users[userId].id,
      text: faker.lorem.sentences(random(1, 10)),
    }
  })

  await Promise.all(comments.map(function insertComment(comment) {
    return db
      .table('comments')
      .insert(comment)
      .returning('id')
      .then((rows) => db.table('comments').where('id', '=', rows[0]).first('*'))
      .then((row) => Object.assign(comment, row))
  }))
}
