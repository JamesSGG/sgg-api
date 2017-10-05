// @flow

import { head, isEmpty } from 'lodash/fp'

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
  const { _json: profileRaw } = profile

  // Get logged-in user
  let user = await findUser({ req, provider, profile })

  console.log('---------- existing user ----------')
  console.log(user)

  // Create a new user if this is their first login
  if (!user.id) {
    user = await createUser(profile)

    console.log('---------- new user ----------')
    console.log(user)
  }

  // Save the user login to the DB for future reference
  await saveLogin({ provider, profile, tokens, user })

  // See if the user has any Facebook friends that have also joined SGG
  const { data: friendsList } = profileRaw.friends

  if (friendsList && !isEmpty(friendsList)) {
    const findFriend = (friend) => findUserByLogin(provider, friend.id)
    const friends = await Promise.all(friendsList.map(findFriend))

    // If so, add them to the user's friends list
    if (friends && !isEmpty(friends)) {
      friends.forEach((friend) => {
        addFriendToUser(user.id, friend.id)
      })
    }
  }

  // Add user to MailChimp list if not already subscribed.
  const listId = '908a975f19'
  const { emails } = user
  const { email } = head(emails)

  if (email) {
    addUserToList(listId, email)
  }

  return user
}
