
import GraphQLJSON from 'graphql-type-json'
import { GraphQLDate, GraphQLTime, GraphQLDateTime } from 'graphql-iso-date'
import { GraphQLUrl, GraphQLAbsoluteUrl, GraphQLRelativeUrl } from 'graphql-url'
import { withFilter } from 'graphql-subscriptions'
import { isEmpty } from 'lodash/fp'

import {
  pubsub,
  USER_FRIEND_ADDED,
  USER_LAST_SEEN_AT_CHANGED,
} from '../../redis'

// function filtered(asyncIterator, filter) {
//   return withFilter(() => asyncIterator, filter)
// }

export default {
  JSON: GraphQLJSON,
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  URL: GraphQLUrl,
  AbsoluteURL: GraphQLAbsoluteUrl,
  RelativeURL: GraphQLRelativeUrl,
  Query: {
    user(obj, args, context) {
      const { loaders: { usersById } } = context
      const { id } = args

      if (!id) {
        return null
      }

      return usersById.load(id)
    },

    users(obj, args, context) {
      const { queries: { getAllUsers } } = context

      return getAllUsers()
    },

    currentUser(obj, args, context) {
      const { loaders: { user, usersById } } = context

      if (!user) {
        return null
      }

      return usersById.load(user.id)
    },

    logins(obj, args, context) {
      const { queries: { getUserLogins } } = context

      return getUserLogins()
    },

    async gamesPlayed(obj, args, context) {
      const { queries: { camelKeys, getAllGamesPlayed } } = context

      const gamesPlayed = await getAllGamesPlayed()

      return gamesPlayed.map(camelKeys)
    },
  },
  Mutation: {
    async bumpUserLastSeenAt(obj, args, context) {
      const { id } = args
      const { queries: { bumpUserLastSeenAt } } = context

      const result = await bumpUserLastSeenAt(id)

      pubsub.publish(USER_LAST_SEEN_AT_CHANGED, {
        userLastSeenAtChanged: { userId: id, result },
      })

      return result
    },

    async addFriendToUser(obj, args, context) {
      const { input: { userId, friendId } } = args
      const { queries: { addFriendToUser } } = context

      const result = await addFriendToUser(userId, friendId)

      console.log(result)

      pubsub.publish(USER_FRIEND_ADDED, {
        userFriendAdded: result,
      })

      return result
    },

    async createFriendForUser(obj, args, context) {
      const { id } = args
      const { queries: { createFakeUser, addFriendToUser } } = context

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
      const { queries: { camelKeys, addUserGamePlayed } } = context

      const newGame = await addUserGamePlayed(input)

      return camelKeys(newGame)
    },

    async editGamePlayed(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, editUserGamePlayed } } = context

      const updatedGame = await editUserGamePlayed(input)

      return camelKeys(updatedGame)
    },

    async deleteGamePlayed(obj, args, context) {
      const { id } = args
      const { queries: { deleteUserGamePlayed } } = context

      await deleteUserGamePlayed(id)

      return id
    },
  },
  Subscription: {
    userLastSeenAtChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(USER_LAST_SEEN_AT_CHANGED),
        (payload, variables) => {
          const { userIds } = variables

          if (!userIds || isEmpty(userIds)) {
            return true
          }

          const { userLastSeenAtChanged: { userId } } = payload

          return userIds.includes(userId)
        },
      ),
    },
  },
}
