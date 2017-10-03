
import { property, isEmpty } from 'lodash/fp'

export default {
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
      const { queries: { camelKeys, getUserGamesPlayed } } = context

      const gamesPlayed = await getUserGamesPlayed(obj.id)

      return gamesPlayed.map((item) => {
        const {
          game_id,
          game_title,
          platform_id,
          platform_name,
          ...remaining
        } = item

        return {
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
      })
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
