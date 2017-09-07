import redis from 'redis'
import bluebird from 'bluebird'

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

const { REDIS_URL } = process.env

const client = redis.createClient({
  url: REDIS_URL,
})

client.on('error', console.log)

export default client

export * from './subscriptions'
