
export default {
  UserLogin: {
    id(obj) {
      return obj.id
    },
    userId(obj) {
      return obj.user_id
    },
    provider(obj) {
      return obj.provider
    },
    username(obj) {
      return obj.username
    },
    tokens(obj) {
      return obj.tokens
    },
    profile(obj) {
      return obj.profile
    },
  },
}
