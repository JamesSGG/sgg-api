
const MY_USER_ID = '6e6fd66c-6315-11e7-909f-078e1c0c96b7'

module.exports.up = async (db) => {
  const newFriendIds = [
    '1cad6ca6-6cc3-11e7-8516-9397b8ff3931',
    '1cad7106-6cc3-11e7-b28e-5f14784b7b9e',
    '1cad84a2-6cc3-11e7-a91e-e73872cac983',
    '1cad8b64-6cc3-11e7-9b07-93d6045ed624',
    '1cad7124-6cc3-11e7-8909-9f5396d7cd2e',
    '1cad6ed6-6cc3-11e7-9b0a-db5713986420',
    '1cad6e72-6cc3-11e7-baa1-e783c67da5c8',
    '1cad7386-6cc3-11e7-b25f-7b0c806cacc1',
    '1cad96ea-6cc3-11e7-8600-7ba5c7b7c1b4',
    '1cad9bae-6cc3-11e7-9ddd-cbb87447874d',
  ]

  await db
    .table('users')
    .where('id', MY_USER_ID)
    .update({
      friends: newFriendIds,
    })
}

module.exports.down = async (db) => {
  await db
    .table('users')
    .where('id', MY_USER_ID)
    .update({
      friends: [],
    })
}

module.exports.configuration = {
  transaction: true,
}
