// @flow

import { head } from 'lodash/fp'

import type { $Request } from 'express'

import type {
  LoginProvider,
  LoginProfile,
  LoginTokens,
} from '../schema/flow'

import { findUser, saveLogin } from '../db'

import { addUserToList } from '../adapters/mailchimp'

// Creates or updates the external login credentials
// and returns the currently authenticated user.
export default async function login(
  req: $Request,
  provider: LoginProvider,
  profile: LoginProfile,
  tokens: LoginTokens,
) {
  const user = await findUser(req, provider, profile)

  await saveLogin({ provider, profile, tokens, user })

  // Add user to MailChimp list if not already subscribed.
  const listId = '908a975f19'
  const { emails } = user
  const { email } = head(emails)

  addUserToList(listId, email)

  return user
}
