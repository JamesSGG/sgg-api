// @flow
/* eslint-disable global-require */

import { nodeDefinitions, fromGlobalId } from 'graphql-relay'

const { nodeInterface, nodeField: node, nodesField: nodes } = nodeDefinitions(
  (globalId, context) => {
    const { type, id } = fromGlobalId(globalId)

    switch (type) {
      case 'User': {
        return context.users.load(id)
      }

      case 'Story': {
        return context.stories.load(id)
      }

      case 'Comment': {
        return context.comments.load(id)
      }

      default: {
        return null
      }
    }
  },
  (obj) => {
    switch (obj.__type) {
      case 'User': {
        return require('./UserType').default
      }

      case 'Story': {
        return require('./StoryType').default
      }

      case 'Comment': {
        return require('./CommentType').default
      }

      default: {
        return null
      }
    }
  },
)

export { nodeInterface, node, nodes }
