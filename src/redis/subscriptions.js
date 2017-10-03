
import { RedisPubSub } from 'graphql-redis-subscriptions'

export const GAME_ADDED = 'GAME_ADDED'
export const GAME_PLATFORM_ADDED = 'GAME_PLATFORM_ADDED'
export const USER_FRIEND_ADDED = 'USER_FRIEND_ADDED'

export const USER_LAST_SEEN_AT_CHANGED = 'USER_LAST_SEEN_AT_CHANGED'
export const USER_LAST_SEEN_AT_UPDATED = 'USER_LAST_SEEN_AT_UPDATED'

const { REDIS_URL } = process.env

export const pubsub = new RedisPubSub({
  connection: {
    url: REDIS_URL,
  },
})
