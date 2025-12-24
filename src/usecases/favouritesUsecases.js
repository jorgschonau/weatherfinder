import {
  loadFavourites as loadFavouritesFromStorage,
  addFavourite as addFavouriteToStorage,
  removeFavourite as removeFavouriteFromStorage,
  isFavourite as checkIsFavourite,
  clearFavourites as clearAllFavourites,
} from '../providers/favouritesProvider';

/**
 * Favourites Use-Cases
 * Business logic for managing favourite destinations
 */

/**
 * Get all favourites sorted by most recently saved
 * @returns {Promise<Array>} Array of favourite destinations
 */
export const getFavourites = async () => {
  const favourites = await loadFavouritesFromStorage();
  // Sort by savedAt, newest first
  return favourites.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
};

/**
 * Add a destination to favourites
 * @param {Object} destination - Destination with lat, lon, name, condition, temperature, etc.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const addToFavourites = async (destination) => {
  if (!destination || !destination.lat || !destination.lon) {
    return { success: false, message: 'Invalid destination' };
  }
  
  const success = await addFavouriteToStorage(destination);
  
  return {
    success,
    message: success ? 'Added to favourites' : 'Already in favourites',
  };
};

/**
 * Remove a destination from favourites
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const removeFromFavourites = async (lat, lon) => {
  const success = await removeFavouriteFromStorage(lat, lon);
  
  return {
    success,
    message: success ? 'Removed from favourites' : 'Failed to remove',
  };
};

/**
 * Toggle favourite status of a destination
 * @param {Object} destination - Destination object
 * @returns {Promise<{isFavourite: boolean, message: string}>}
 */
export const toggleFavourite = async (destination) => {
  const isCurrentlyFavourite = await checkIsFavourite(destination.lat, destination.lon);
  
  if (isCurrentlyFavourite) {
    const result = await removeFromFavourites(destination.lat, destination.lon);
    return {
      isFavourite: false,
      message: result.message,
    };
  } else {
    const result = await addToFavourites(destination);
    return {
      isFavourite: result.success,
      message: result.message,
    };
  }
};

/**
 * Check if a destination is favourited
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<boolean>}
 */
export const isDestinationFavourite = async (lat, lon) => {
  return await checkIsFavourite(lat, lon);
};

/**
 * Clear all favourites (for settings/debugging)
 * @returns {Promise<boolean>}
 */
export const clearAllFavouritesUseCase = async () => {
  return await clearAllFavourites();
};

