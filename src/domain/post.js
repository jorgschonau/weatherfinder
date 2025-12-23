/**
 * Post Domain Model
 * Optionales Modell für zukünftige Community Posts
 */
export class Post {
  constructor({
    id,
    userId,
    content,
    placeId = null,
    createdAt = new Date(),
    likes = 0,
  }) {
    this.id = id;
    this.userId = userId;
    this.content = content;
    this.placeId = placeId;
    this.createdAt = createdAt;
    this.likes = likes;
  }
}

