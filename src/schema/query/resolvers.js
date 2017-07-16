
export default {
  user(obj, args, context) {
    const { users } = context
    const { id } = args

    return id && users.load(id)
  },
  me(obj, args, context) {
    const { user, users } = context

    return user && users.load(user.id)
  },
}
