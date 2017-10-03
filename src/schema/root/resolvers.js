
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
      const { queries: { getAllUsers } } = context

      return getAllUsers()
    },

    logins(obj, args, context) {
      const { queries: { getUserLogins } } = context

      return getUserLogins()
    },

    games(obj, args, context) {
      const { queries: { getAllGames } } = context

      return getAllGames()
    },

    gamePlatforms(obj, args, context) {
      const { queries: { getAllGamePlatforms } } = context

      return getAllGamePlatforms()
    },

    async gamesPlayed(obj, args, context) {
      const { queries: { camelKeys, getAllGamesPlayed } } = context

      const gamesPlayed = await getAllGamesPlayed()

      return gamesPlayed.map(camelKeys)
    },

    user(obj, args, context) {
      const { loaders: { usersById } } = context
      const { id } = args

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
        userLastSeenAtChanged: result,
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

    async addGame(obj, args, context) {
      const { input } = args
      const { queries: { addGame } } = context

      const newGame = await addGame(input)

      return newGame
    },

    async addGamePlatform(obj, args, context) {
      const { input } = args
      const { queries: { addGamePlatform } } = context

      const newGamePlatform = await addGamePlatform(input)

      return newGamePlatform
    },

    async addGamePlayed(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, addUserGamePlayed } } = context

      const newGame = await addUserGamePlayed(input)

      return camelKeys(newGame)
    },

    async editGame(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, editGame } } = context

      const updatedGame = await editGame(input)

      return camelKeys(updatedGame)
    },

    async editGamePlatform(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, editGame } } = context

      const updatedGame = await editGame(input)

      return camelKeys(updatedGame)
    },

    // TODO: Add resolver for root-level game played queries.
    async editGamePlayed(obj, args, context) {
      const { input } = args
      const { queries: { camelKeys, editUserGamePlayed, getGamePlayed } } = context

      await editUserGamePlayed(input)

      const gamePlayed = await getGamePlayed(input.id)

      const {
        game_id,
        game_title,
        platform_id,
        platform_name,
        ...remaining
      } = gamePlayed

      const result = {
        ...camelKeys(remaining),
        game: {
          id: game_id,
          game_title,
        },
        gamePlatform: {
          id: platform_id,
          platform_name,
        },
      }

      console.log('---------- editGamePlayed ----------')
      console.log(result)

      return result
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
        () => pubsub.asyncIterator(USER_LAST_SEEN_AT_UPDATED),
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
