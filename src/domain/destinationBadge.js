/**
 * Badge types that can be awarded to destinations
 * based on various criteria
 */
export const DestinationBadge = {
  WORTH_THE_DRIVE: 'WORTH_THE_DRIVE', // Best weather gain per km/hour
  WARM_AND_DRY: 'WARM_AND_DRY', // Max warm with acceptable weather/wind/night conditions
  BEST_STOP: 'BEST_STOP', // Camper Stop Score: weather + surroundings + amenities
};

/**
 * Badge metadata for display
 */
export const BadgeMetadata = {
  [DestinationBadge.WORTH_THE_DRIVE]: {
    icon: '🚗',
    color: '#FFD700', // Gold
    priority: 1,
  },
  [DestinationBadge.WARM_AND_DRY]: {
    icon: '☀️',
    color: '#FF6B35', // Orange-red
    priority: 2,
  },
  [DestinationBadge.BEST_STOP]: {
    icon: '🏕️',
    color: '#4CAF50', // Green
    priority: 3,
  },
};

/**
 * Calculate badge eligibility for a destination
 * 
 * @param {Object} destination - The destination to evaluate
 * @param {Object} userLocation - Current user location
 * @param {Array} allDestinations - All destinations for comparison
 * @returns {Array<string>} - Array of badge types this destination earned
 * 
 * TODO: Implement calculation logic when weather + amenity data is available
 */
export function calculateBadges(destination, userLocation, allDestinations) {
  const badges = [];

  // TODO: Implement "Worth the drive" calculation
  // - Calculate: (temp_diff / distance_km) or (temp_diff / drive_time_hours)
  // - Award to top destination

  // TODO: Implement "Warm & dry" calculation
  // - Find warmest destination
  // - Check: condition is not rainy, wind < threshold, etc.

  // TODO: Implement "Best stop" calculation
  // - Combine: weather score + nearby amenities + services
  // - Requires: Places API integration (supermarkets, parking, etc.)

  return badges;
}

