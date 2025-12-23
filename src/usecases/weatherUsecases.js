import { fetchWeatherDestinationsForRadius } from '../providers/weatherProvider';
import { filterDestinationsByCondition } from '../domain/weatherFilter';
import { getWeatherIcon, getWeatherColor } from '../domain/weatherPresentation';

/**
 * Use-case: get destinations for a radius, optionally filtered by desiredCondition.
 * Signature preserved from old `services/weatherService.js` to avoid behavior changes.
 */
export const getWeatherForRadius = async (userLat, userLon, radiusKm, desiredCondition = null) => {
  const destinations = await fetchWeatherDestinationsForRadius(userLat, userLon, radiusKm);
  return filterDestinationsByCondition(destinations, desiredCondition);
};

// Re-export presentation helpers so UI imports only from usecases
export { getWeatherIcon, getWeatherColor };



