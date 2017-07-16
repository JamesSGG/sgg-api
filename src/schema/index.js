
import { makeExecutableSchema } from 'graphql-tools'

import queryDef from './query/def.graphql'
import nodeDef from './node/def.graphql'
import userDef from './user/def.graphql'
import emailDef from './email/def.graphql'

import queryResolvers from './query/resolvers'
import userResolvers from './user/resolvers'

export default makeExecutableSchema({
  typeDefs: [
    queryDef,
    nodeDef,
    userDef,
    emailDef,
  ],
  resolvers: {
    Query: queryResolvers,
    User: userResolvers,
  },
})
