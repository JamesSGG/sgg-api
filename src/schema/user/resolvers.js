
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
  },
}
