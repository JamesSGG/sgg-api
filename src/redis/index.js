import redis from 'redis'
import bluebird from 'bluebird'
import { RedisPubSub } from 'graphql-redis-subscriptions'

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

const { REDIS_URL } = process.env

const client = redis.createClient({
  url: REDIS_URL,
})

client.on('error', console.log)

export const pubsub = new RedisPubSub({
  connection: {
    url: REDIS_URL,
  },
})

export default client
