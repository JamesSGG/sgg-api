// @flow

import MailChimp from 'mailchimp-api-v3'
import { curry, any, matchesProperty } from 'lodash/fp'

export type MailChimpAdapter = {
  request(options: *): Promise<*>,
  get(options: *, query: *): Promise<*>,
  post(options: *, body: *): Promise<*>,
  patch(options: *, body: *): Promise<*>,
  put(options: *, body: *): Promise<*>,
  delete(options: *): Promise<*>,
  batch(operations: Array<Function>): Promise<*>,
  batchWait(batch_id: *): Promise<*>,
}

export function getMailChimpInstance(): ?MailChimpAdapter {
  const { MAILCHIMP_API_KEY } = process.env

  if (!MAILCHIMP_API_KEY) {
    return null
  }

  try {
    return new MailChimp(MAILCHIMP_API_KEY)
  }
  catch (error) {
    console.error(error)
    return null
  }
}

const mailChimp = getMailChimpInstance()

export default mailChimp

async function _isUserSubscribedToList(
  listId: string,
  email: string,
): Promise<boolean> {
  if (!mailChimp) {
    throw new Error('There was an error with the MailChimp API.')
  }

  const { members } = await mailChimp.get({
    path: `/lists/${listId}/members`,
  })

  return any(matchesProperty('email_address', email), members)
}

export const isUserSubscribedToList = curry(_isUserSubscribedToList)

async function _addUserToList(listId, email) {
  if (!mailChimp) {
    throw new Error('There was an error with the MailChimp API.')
  }

  return mailChimp.post(`/lists/${listId}/members`, {
    email_address: email,
  })
}

export const addUserToList = curry(_addUserToList)
