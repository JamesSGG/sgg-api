// @flow

import { GraphQLError } from 'graphql'
import { has } from 'lodash/fp'

type StateError = {
  key: string,
  message: string,
}

export default class ValidationError extends GraphQLError {
  state: any

  constructor(errors: Array<StateError>) {
    super('The request is invalid.')

    const errorReducer = (result, error) => {
      if (has(result, error.key)) {
        result[error.key].push(error.message)
      }
      else {
        Object.defineProperty(result, error.key, {
          value: [error.message],
          enumerable: true,
        })
      }

      return result
    }

    this.state = errors.reduce(errorReducer, {})
  }
}
