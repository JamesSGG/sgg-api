// @flow
/* eslint-disable global-require */

import { nodeDefinitions, fromGlobalId } from 'graphql-relay'

const { nodeInterface, nodeField: node, nodesField: nodes } = nodeDefinitions(
  (globalId, context) => {
    const { type, id } = fromGlobalId(globalId)

    if (type === 'User') return context.users.load(id)
    if (type === 'Story') return context.stories.load(id)
    if (type === 'Comment') return context.comments.load(id)

    return null
  },
  (obj) => {
    if (obj.__type === 'User') return require('./UserType').default
    if (obj.__type === 'Story') return require('./StoryType').default
    if (obj.__type === 'Comment') return require('./CommentType').default

    return null
  },
)

export { nodeInterface, node, nodes }
