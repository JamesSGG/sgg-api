
export type GamePlayed = {
  //  The title of the game
  title: ?string,

  //  The platform of the game
  platform: ?string,

  //  The user's Steam username, Xbox gamer tag, PSN name, etc. for this game
  gamerTag: ?string,
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
