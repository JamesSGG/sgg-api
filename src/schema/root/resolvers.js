
import { withFilter } from 'graphql-subscriptions'
import { property, isEmpty } from 'lodash/fp'

import { pubsub } from '../../app'

const USER_ONLINE_STATUS_CHANGED = 'USER_ONLINE_STATUS_CHANGED'
const USER_FRIEND_ADDED = 'USER_FRIEND_ADDED'

// function filtered(asyncIterator, filter) {
//   return withFilter(() => asyncIterator, filter)
// }

function getFriendsOfUser(obj, args, context) {
  const { usersById, friendsOfUser } = context
  const { id } = args

  if (!id) {
    return null
  }

  return friendsOfUser
    .load(id)
    .then((rows) => {
      const friendIds = rows.map(property('friend_id'))

      if (!friendIds || isEmpty(friendIds)) {
        return null
      }

      return usersById.loadMany(friendIds)
    })
}

export default {
  Query: {
    user(obj, args, context) {
      const { usersById } = context
      const { id } = args

      if (!id) {
        return null
      }

      return usersById.load(id)
    },

    /**
     * Dataloader doesn't support loading entire collections so in this case
     * we just query the DB directly.
     */
    users(obj, args, context) {
      const { allUsers } = context

      return allUsers()
    },

    me(obj, args, context) {
      const { user, usersById } = context

      if (!user) {
        return null
      }

      return usersById.load(user.id)
    },

    friendsOfUser: getFriendsOfUser,

    myFriends(obj, args, context) {
      const { user } = context

      if (!user) {
        return null
      }

      return getFriendsOfUser(obj, args, context)
    },
  },
  Mutation: {
    setUserOnlineStatus(obj, args) {
      const { input: { userId, status } } = args

      pubsub.publish(USER_ONLINE_STATUS_CHANGED, {
        userOnlineStatusChanged: { userId, status },
      })

      return { userId, status }
    },
    addFriendToUser(obj, args, context) {
      const { input: { userId, friendId } } = args
      const { addFriendToUser } = context

      addFriendToUser(userId, friendId)

      pubsub.publish(USER_FRIEND_ADDED, {
        userFriendAdded: { userId, friendId },
      })

      return { userId, friendId }
    },
  },
  Subscription: {
    userOnlineStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(USER_ONLINE_STATUS_CHANGED),
        () => true,
      ),
    },
  },
}
