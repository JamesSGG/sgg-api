
import { property, isEmpty } from 'lodash/fp'

export default {
  User: {
    id(obj) {
      return obj.id
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
    onlineStatus(obj) {
      return obj.online_status
    },
    // TODO: Implement this.
    gamerTags() {
      return []
    },
    async friends(obj, args, context) {
      const { id } = obj
      const { usersById, friendsOfUser } = context

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
      const { nonFriendsOfUser } = context

      if (!id) {
        return null
      }

      return nonFriendsOfUser(id)
    },
  },
}
