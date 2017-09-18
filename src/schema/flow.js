
export type Date = string
export type Time = string
export type DateTime = string

export type LoginProvider =
  | 'facebook'
  | 'twitter'
  | 'google'

export type LoginProfile = {
  id: string,
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

// A game that has been played by a user
export type GamePlayed = {
  // The title of the game
  title: ?string,

  // The platform of the game
  platform: ?string,

  // The user's Steam username, Xbox gamer tag, PSN name, etc. for this game
  gamerTag: ?string,
}

// Input when adding or editing a played game
export type AddGamePlayedInput = {
  userId: string,
  gameTitle: string,
  gamePlatform: string,
  gamerTag?: string,
}

export type EditGamePlayedInput = {
  id: string,
  userId?: string,
  gameTitle?: string,
  gamePlatform?: string,
  gamerTag?: string,
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
  id: string,

  //  Timestamp of when the user was created
  createdAt: DateTime,

  //  Timestamp of when the user was last updated
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
