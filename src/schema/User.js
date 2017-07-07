// @flow
/* eslint-disable import/prefer-default-export */

import UserType from './UserType'

export const me = {
  type: UserType,
  resolve(root, args, { user, users }) {
    return user && users.load(user.id)
  },
}
