// @flow

import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

import { globalIdField } from 'graphql-relay'

import { nodeInterface } from './Node'

import StoryType from './StoryType'
import UserType from './UserType'

const CommentType = new GraphQLObjectType({
  name: 'Comment',
  interfaces: [nodeInterface],

  fields: () => ({
    id: globalIdField(),

    story: {
      type: new GraphQLNonNull(StoryType),
      resolve(parent, args, { stories }) {
        return stories.load(parent.story_id)
      },
    },

    parent: {
      type: new GraphQLNonNull(CommentType),
      resolve(parent, args, { comments }) {
        return comments.load(parent.parent_id)
      },
    },

    author: {
      type: new GraphQLNonNull(UserType),
      resolve(parent, args, { users }) {
        return users.load(parent.author_id)
      },
    },

    comments: {
      type: new GraphQLList(CommentType),
      resolve(parent, args, { commentsByParent }) {
        return commentsByParent.load(parent.id)
      },
    },

    text: {
      type: GraphQLString,
    },

    pointsCount: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(parent, args, { commentPointsCount }) {
        return commentPointsCount.load(parent.id)
      },
    },

    createdAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(parent) {
        return parent.created_at
      },
    },

    updatedAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve(parent) {
        return parent.updated_at
      },
    },
  }),
})

export default CommentType
