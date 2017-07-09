// @flow

import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLString,
} from 'graphql'

import { globalIdField } from 'graphql-relay'

import EmailType from './EmailType'
import { nodeInterface } from './Node'

export default new GraphQLObjectType({
  name: 'User',
  interfaces: [nodeInterface],
  fields: {
    id: globalIdField(),

    displayName: {
      type: GraphQLString,
      resolve(parent) {
        return parent.display_name
      },
    },

    imageUrl: {
      type: GraphQLString,
      resolve(parent) {
        return parent.image_url
      },
    },

    emails: {
      type: new GraphQLList(EmailType),
      resolve(parent, args, { user }) {
        if (user && user.id === parent.id) {
          return parent.emails
        }

        return null
      },
    },
  },
})
