
import GraphQLJSON from 'graphql-type-json'
import { withFilter } from 'graphql-subscriptions'
import { isEmpty } from 'lodash/fp'

import {
  pubsub,
  USER_FRIEND_ADDED,
  USER_ONLINE_STATUS_CHANGED,
} from '../../redis'

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

    async gamesPlayed(obj, args, context) {
      const { camelKeys, getAllGamesPlayed } = context.queries

      const gamesPlayed = await getAllGamesPlayed()

      return gamesPlayed.map(camelKeys)
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

    async addGamePlayed(obj, args, context) {
      const { input } = args
      const { camelKeys, addUserGamePlayed } = context.queries

      const newGame = await addUserGamePlayed(input)

      return camelKeys(newGame)
    },

    async editGamePlayed(obj, args, context) {
      const { input } = args
      const { camelKeys, editUserGamePlayed } = context.queries

      const updatedGame = await editUserGamePlayed(input)

      return camelKeys(updatedGame)
    },

    async deleteGamePlayed(obj, args, context) {
      const { id } = args
      const { deleteUserGamePlayed } = context.queries

      await deleteUserGamePlayed(id)

      return id
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
