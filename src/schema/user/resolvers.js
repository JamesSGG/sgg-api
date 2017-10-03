
import { property, isEmpty } from 'lodash/fp'

export default {
  GamePlayed: {
    id(obj) {
      return obj.id
    },
    createdAt(obj) {
      return obj.created_at
    },
    updatedAt(obj) {
      return obj.updated_at
    },
    userId(obj) {
      return obj.user_id
    },
    gamerTag(obj) {
      return obj.gamer_tag
    },
    game(obj) {
      const { game_id: id, game_title } = obj

      return {
        __typename: 'Game',
        id,
        game_title,
      }
    },
    gamePlatform(obj) {
      const { platform_id: id, platform_name } = obj

      return {
        __typename: 'GamePlatform',
        id,
        platform_name,
      }
    },
  },

  User: {
    id(obj) {
      return obj.id
    },
    createdAt(obj) {
      return obj.created_at
    },
    updatedAt(obj) {
      return obj.updated_at
    },
    lastSeenAt(obj) {
      return obj.last_seen_at
    },
    displayName(obj) {
      return obj.display_name
    },
    imageUrl(obj) {
      return obj.image_url
    },
    emails(obj, args, context) {
      const { user } = context

      if (user && user.id === obj.id) {
        return obj.emails
      }

      return null
    },
    async gamesPlayed(obj, args, context) {
      const { queries: { getUserGamesPlayed } } = context

      const gamesPlayed = await getUserGamesPlayed(obj.id)

      return gamesPlayed
    },
    async friends(obj, args, context) {
      const { id } = obj
      const { loaders: { usersById, friendsOfUser } } = context

      if (!id) {
        return null
      }

      const userFriendRows = await friendsOfUser.load(id)
      const friendIds = userFriendRows.map(property('friend_id'))

      if (!friendIds || isEmpty(friendIds)) {
        return null
      }

      return usersById.loadMany(friendIds)
    },
    async nonFriends(obj, args, context) {
      const { id } = obj
      const { queries: { getNonFriendsOfUser } } = context

      if (!id) {
        return null
      }

      return getNonFriendsOfUser(id)
    },
  },
}
