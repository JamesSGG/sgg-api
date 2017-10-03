// @flow

export type ID = string
export type JSON = string
export type Date = string
export type Time = string
export type DateTime = string
export type URL = string
export type AbsoluteURL = string
export type RelativeURL = string

export type LoginProvider =
  | 'facebook'
  | 'twitter'
  | 'google'

export type LoginProfile = {
  id: ID,
  emails: Array<{| value: string, verified: boolean |}>,
  photos: Array<{| value: string |}>,
  displayName: string,
  username: string,
  _json: {},
}

export type LoginTokens = {
  accessToken?: string,
  refreshToken?: string,
}

// A game record
export type Game = {
  // Record ID
  id: ID,

  // The game title
  gameTitle?: String,
}

// A game platform record
export type GamePlatform = {
  // Record ID
  id: ID,

  // The platform name
  platformName?: String,
}

// A game that has been played by a user
export type GamePlayed = {
  // The title of the game
  title: ?string,

  // The platform of the game
  platform: ?string,

  // The user's Steam username, Xbox gamer tag, PSN name, etc. for this game
  gamerTag: ?string,
}

export type CreateGameInput = {
  gameTitle: string,
}

export type UpdateGameInput = {
  id: ID,
  gameTitle: string,
}

export type CreateGamePlatformInput = {
  gamePlatform: string,
}

export type UpdateGamePlatformInput = {
  id: ID,
  gamePlatform: string,
}

export type CreateGamePlayedInput = {
  userId: ID,
  gameTitle: string,
  gamePlatform: string,
  gamerTag?: string,
}

export type UpdateGamePlayedInput = {
  id: ID,
  userId?: ID,
  gameTitle?: string,
  gamePlatform?: string,
  gamerTag?: string,
}

export type AddFriendResult = {
  userId: ID,
  friendId: ID,
}

// User email object
export type UserEmail = {
  // Email address
  email: string,

  // Is email verified? (pulled from Facebook profile data)
  verified: boolean,
}

// User record
export type User = {
  // User ID
  id: ID,

  // Timestamp of when the user was created
  createdAt: DateTime,

  // Timestamp of when the user was last updated
  updatedAt: DateTime,

  // Timestamp of when the user was last active on the site
  lastSeenAt: DateTime,

  // Display name
  displayName: ?string,

  // Avatar image URL
  imageUrl: ?string,

  // Emails
  emails: ?Array<UserEmail>,

  // Games played
  gamesPlayed: ?Array<GamePlayed>,

  // Friends
  friends: ?Array<User>,

  // All other users besides friends
  nonFriends: ?Array<User>,
}
