
import { makeExecutableSchema } from 'graphql-tools'

import rootDef from './root/def.graphql'
import userDef from './user/def.graphql'
import emailDef from './email/def.graphql'

import rootResolvers from './root/resolvers'
import userResolvers from './user/resolvers'

export default makeExecutableSchema({
  typeDefs: [
    rootDef,
    userDef,
    emailDef,
  ],
  resolvers: {
    ...rootResolvers,
    ...userResolvers,
  },
})
