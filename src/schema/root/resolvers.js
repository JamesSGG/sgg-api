
import { withFilter } from 'graphql-subscriptions'

import { pubsub } from '../../app'

const USER_ONLINE_STATUS_CHANGED = 'USER_ONLINE_STATUS_CHANGED'
const USER_FRIEND_ADDED = 'USER_FRIEND_ADDED'

// function filtered(asyncIterator, filter) {
//   return withFilter(() => asyncIterator, filter)
// }

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

    currentUser(obj, args, context) {
      const { user, usersById } = context

      if (!user) {
        return null
      }

      return usersById.load(user.id)
    },
  },
  Mutation: {
    setUserOnlineStatus(obj, args, context) {
      const { input: { userId, status } } = args
      const { setUserOnlineStatus } = context

      setUserOnlineStatus(userId, status)

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
