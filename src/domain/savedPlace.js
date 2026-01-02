/**
 * SavedPlace Domain Model
 * Repräsentiert einen von einem User gespeicherten Ort
 */
export class SavedPlace {
  constructor({
    id,
    userId,
    name,
    latitude,
    longitude,
    description = null,
    savedAt = new Date(),
  }) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.description = description;
    this.savedAt = savedAt;
  }
}




