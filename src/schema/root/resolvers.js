
import GraphQLJSON from 'graphql-type-json'
import { withFilter } from 'graphql-subscriptions'
import { isEmpty } from 'lodash/fp'

import { pubsub } from '../../redis'

const USER_ONLINE_STATUS_CHANGED = 'USER_ONLINE_STATUS_CHANGED'
const USER_FRIEND_ADDED = 'USER_FRIEND_ADDED'

// function filtered(asyncIterator, filter) {
//   return withFilter(() => asyncIterator, filter)
// }

export default {
  JSON: GraphQLJSON,
  Query: {
    user(obj, args, context) {
      const { usersById } = context.loaders
      const { id } = args

      if (!id) {
        return null
      }

      return usersById.load(id)
    },

    users(obj, args, context) {
      const { getAllUsers } = context.queries

      return getAllUsers()
    },

    currentUser(obj, args, context) {
      const { user, usersById } = context.loaders

      if (!user) {
        return null
      }

      return usersById.load(user.id)
    },

    logins(obj, args, context) {
      const { getUserLogins } = context.queries

      return getUserLogins()
    },
  },
  Mutation: {
    setUserOnlineStatus(obj, args, context) {
      const { input: { userId, status } } = args
      const { setUserOnlineStatus } = context.queries

      setUserOnlineStatus(userId, status)

      pubsub.publish(USER_ONLINE_STATUS_CHANGED, {
        userOnlineStatusChanged: { userId, status },
      })

      return { userId, status }
    },

    addFriendToUser(obj, args, context) {
      const { input: { userId, friendId } } = args
      const { addFriendToUser } = context.queries

      addFriendToUser(userId, friendId)

      pubsub.publish(USER_FRIEND_ADDED, {
        userFriendAdded: { userId, friendId },
      })

      return { userId, friendId }
    },

    async createFriendForUser(obj, args, context) {
      const { id } = args
      const { createFakeUser, addFriendToUser } = context.queries

      const newUser = await createFakeUser()

      addFriendToUser(id, newUser.id)

      pubsub.publish(USER_FRIEND_ADDED, {
        userFriendAdded: {
          userId: id,
          friendId: newUser.id,
        },
      })

      return newUser
    },
  },
  Subscription: {
    userOnlineStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(USER_ONLINE_STATUS_CHANGED),
        (payload, variables) => {
          const { userIds } = variables

          if (!userIds || isEmpty(userIds)) {
            return true
          }

          const { userFriendAdded: { userId } } = payload

          return userIds.includes(userId)
        },
      ),
    },
  },
}
