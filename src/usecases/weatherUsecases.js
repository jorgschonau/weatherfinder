import { fetchWeatherDestinationsForRadius } from '../providers/weatherProvider';
import { filterDestinationsByCondition } from '../domain/weatherFilter';
import { getWeatherIcon, getWeatherColor } from '../domain/weatherPresentation';

/**
 * Use-case: get destinations for a radius, optionally filtered by desiredCondition.
 * Signature preserved from old `services/weatherService.js` to avoid behavior changes.
 */
export const getWeatherForRadius = async (userLat, userLon, radiusKm, desiredCondition = null) => {
  // Pass filter to provider so it can fetch more cities when filtering is active
  const destinations = await fetchWeatherDestinationsForRadius(userLat, userLon, radiusKm, desiredCondition);
  return filterDestinationsByCondition(destinations, desiredCondition);
};

// Re-export presentation helpers so UI imports only from usecases
export { getWeatherIcon, getWeatherColor };



