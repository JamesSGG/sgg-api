
import { RedisPubSub } from 'graphql-redis-subscriptions'

export const USER_LAST_SEEN_AT_CHANGED = 'USER_LAST_SEEN_AT_CHANGED'
export const USER_FRIEND_ADDED = 'USER_FRIEND_ADDED'

const { REDIS_URL } = process.env

export const pubsub = new RedisPubSub({
  connection: {
    url: REDIS_URL,
  },
})
