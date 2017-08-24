
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
export type GamePlayedInput = {
  id?: string,
  userId: string,
  gameTitle: string,
  gamerTag?: string,
}

// User email object
export type UserEmail = {
  // Email address
  email: string,

  // Is email verified? (pulled from Facebook profile data)
  verified: boolean,
}

// User online / offline status
export type UserStatus = 'online' | 'offline'

// User record
export type User = {
  // User ID
  id: string,

  // Display name
  displayName: ?string,

  // Avatar image URL
  imageUrl: ?string,

  // Emails
  emails: ?Array<UserEmail>,

  // Online status
  onlineStatus: ?UserStatus,

  // Games played
  gamesPlayed: ?Array<GamePlayed>,

  // Friends
  friends: ?Array<User>,

  // All other users besides friends
  nonFriends: ?Array<User>,
}
