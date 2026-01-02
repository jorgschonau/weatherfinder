/**
 * User Domain Model
 * Minimales Modell für zukünftige Social Features
 */
export class User {
  constructor({
    id,
    username,
    displayName,
    avatarUrl = null,
  }) {
    this.id = id;
    this.username = username;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
  }
}




