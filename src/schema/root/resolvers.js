
import GraphQLJSON from 'graphql-type-json'
import { GraphQLDate, GraphQLTime, GraphQLDateTime } from 'graphql-iso-date'
import { GraphQLUrl, GraphQLAbsoluteUrl, GraphQLRelativeUrl } from 'graphql-url'
import { withFilter } from 'graphql-subscriptions'
import { isEmpty } from 'lodash/fp'

import {
  pubsub,
  USER_FRIEND_ADDED,
  USER_LAST_SEEN_AT_UPDATED,
} from '../../redis'

export default {
  JSON: GraphQLJSON,
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  URL: GraphQLUrl,
  AbsoluteURL: GraphQLAbsoluteUrl,
  RelativeURL: GraphQLRelativeUrl,
  Query: {
    users(obj, args, context) {
      const { queries: { findAllUsers } } = context

      return findAllUsers()
    },

    logins(obj, args, context) {
      const { queries: { findUserLogins } } = context

      return findUserLogins()
    },

    games(obj, args, context) {
      const { queries: { findAllGames } } = context

      return findAllGames()
    },

    gamePlatforms(obj, args, context) {
      const { queries: { findAllGamePlatforms } } = context

      return findAllGamePlatforms()
    },

    async gamesPlayed(obj, args, context) {
      const { queries: { camelKeys, findAllGamesPlayed } } = context

      const gamesPlayed = await findAllGamesPlayed()

      return gamesPlayed.map(camelKeys)
    },

    user(obj, args, context) {
      const { id } = args
      const { loaders: { usersById } } = context

      if (!id) {
        return null
      }

      return usersById.load(id)
    },

    currentUser(obj, args, context) {
      const { user, loaders: { usersById } } = context

      if (!user) {
        return null
      }

      return usersById.load(user.id)
    },
  },
  Mutation: {
    async bumpUserLastSeenAt(obj, args, context) {
      const { id } = args
      const { queries: { bumpUserLastSeenAt } } = context

      const lastSeenAt = await bumpUserLastSeenAt(id)

      const result = {
        userId: id,
        lastSeenAt,
      }

      pubsub.publish(USER_LAST_SEEN_AT_UPDATED, {
        userLastSeenAtUpdated: result,
      })

      return result
    },

    async addFriendToUser(obj, args, context) {
      const { input: { userId, friendId } } = args
      const { queries: { addFriendToUser } } = context

      const resultA = await addFriendToUser(userId, friendId)
      const resultB = await addFriendToUser(friendId, userId)

      pubsub.publish(USER_FRIEND_ADDED, {
        userFriendAdded: resultA,
      })

      pubsub.publish(USER_FRIEND_ADDED, {
        userFriendAdded: resultB,
      })

      return resultA
    },

    async deleteUser(obj, args, context) {
      const { id } = args
      const { queries: { deleteUser } } = context

      await deleteUser(id)

      return id
    },

    async createGame(obj, args, context) {
      const { input } = args
      const { queries: { createGame } } = context

      const newGame = await createGame(input)

      return newGame
    },

    async updateGame(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, updateGame } } = context

      const updatedGame = await updateGame(input)

      return camelKeys(updatedGame)
    },

    async deleteGame(obj, args, context) {
      const { id } = args
      const { queries: { deleteGame } } = context

      await deleteGame(id)

      return id
    },

    async createGamePlatform(obj, args, context) {
      const { input } = args
      const { queries: { createGamePlatform } } = context

      const newGamePlatform = await createGamePlatform(input)

      return newGamePlatform
    },

    async updateGamePlatform(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, updateGamePlatform } } = context

      const updatedGamePlatform = await updateGamePlatform(input)

      return camelKeys(updatedGamePlatform)
    },

    async deleteGamePlatform(obj, args, context) {
      const { id } = args
      const { queries: { deleteGamePlatform } } = context

      await deleteGamePlatform(id)

      return id
    },

    async createGamePlayed(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, createGamePlayed } } = context

      const newGame = await createGamePlayed(input)

      return camelKeys(newGame)
    },

    async updateGamePlayed(obj, args, context) {
      const { input } = args
      const { queries: { updateUserGamePlayed, getGamePlayed } } = context

      await updateUserGamePlayed(input)

      const gamePlayed = await getGamePlayed(input.id)

      return gamePlayed
    },

    async deleteGamePlayed(obj, args, context) {
      const { id } = args
      const { queries: { deleteUserGamePlayed } } = context

      await deleteUserGamePlayed(id)

      return id
    },
  },
  Subscription: {
    userLastSeenAtUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(USER_LAST_SEEN_AT_UPDATED),
        (payload, variables) => {
          const { userIds } = variables

          if (!userIds || isEmpty(userIds)) {
            return true
          }

          const { userLastSeenAtUpdated: { userId } } = payload

          return userIds.includes(userId)
        },
      ),
    },
  },
}
