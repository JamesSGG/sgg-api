
export default {
  id(parent) {
    return parent.id
  },
  displayName(parent) {
    return parent.display_name
  },
  imageUrl(parent) {
    return parent.image_url
  },
  emails(parent, args, { user }) {
    if (user && user.id === parent.id) {
      return parent.emails
    }

    return null
  },
}
