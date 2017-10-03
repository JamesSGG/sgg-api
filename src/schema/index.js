
import { makeExecutableSchema } from 'graphql-tools'

import rootDef from './root/def.graphql'
import emailDef from './email/def.graphql'
import gameDef from './game/def.graphql'
import userDef from './user/def.graphql'
import loginDef from './login/def.graphql'

import rootResolvers from './root/resolvers'
import gameResolvers from './game/resolvers'
import userResolvers from './user/resolvers'
import loginResolvers from './login/resolvers'

export default makeExecutableSchema({
  typeDefs: [
    rootDef,
    emailDef,
    gameDef,
    userDef,
    loginDef,
  ],
  resolvers: {
    ...rootResolvers,
    ...gameResolvers,
    ...userResolvers,
    ...loginResolvers,
  },
})
