// @flow

import { head } from 'lodash/fp'

import type { $Request } from 'express'

import type {
  LoginProvider,
  LoginProfile,
  LoginTokens,
} from '../schema/flow'

import {
  findUser,
  findUserByLogin,
  createUser,
  saveLogin,
  addFriendToUser,
} from '../db'

import { addUserToList } from '../adapters/mailchimp'

// Creates or updates the external login credentials
// and returns the currently authenticated user.
export default async function login(
  req: $Request,
  provider: LoginProvider,
  profile: LoginProfile,
  tokens: LoginTokens,
) {
  // Get logged-in user
  const existingUser = await findUser({ req, provider, profile })

  // Create a new user if this is their first login
  const user = existingUser || await createUser(profile)

  // Save the user login to the DB for future reference
  await saveLogin({ provider, profile, tokens, user })

  // See if the user has any Facebook friends that have also joined SGG;
  // if so, add them to the user's friends list
  const { data: friendsList = [] } = JSON.parse(profile._json).friends
  const findFriend = (friend) => findUserByLogin(provider, friend.id)
  const friends = await Promise.all(friendsList.map(findFriend))

  friends.forEach((friend) => {
    addFriendToUser(user.id, friend.id)
  })

  // Add user to MailChimp list if not already subscribed.
  const listId = '908a975f19'
  const { emails } = user
  const { email } = head(emails)

  addUserToList(listId, email)

  return user
}
