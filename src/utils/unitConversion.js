/**
 * Unit conversion utilities for distance and temperature
 */

/**
 * Convert kilometers to miles
 * @param {number} km - Distance in kilometers
 * @returns {number} - Distance in miles
 */
export const kmToMiles = (km) => {
  return km * 0.621371;
};

/**
 * Convert miles to kilometers
 * @param {number} miles - Distance in miles
 * @returns {number} - Distance in kilometers
 */
export const milesToKm = (miles) => {
  return miles * 1.60934;
};

/**
 * Convert Celsius to Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} - Temperature in Fahrenheit
 */
export const celsiusToFahrenheit = (celsius) => {
  return (celsius * 9/5) + 32;
};

/**
 * Convert Fahrenheit to Celsius
 * @param {number} fahrenheit - Temperature in Fahrenheit
 * @returns {number} - Temperature in Celsius
 */
export const fahrenheitToCelsius = (fahrenheit) => {
  return (fahrenheit - 32) * 5/9;
};

/**
 * Format distance based on unit preference
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} unit - 'km' or 'miles'
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} - Formatted distance with unit
 */
export const formatDistance = (distanceKm, unit = 'km', decimals = 0) => {
  if (unit === 'miles') {
    const miles = kmToMiles(distanceKm);
    return `${miles.toFixed(decimals)} mi`;
  }
  return `${distanceKm.toFixed(decimals)} km`;
};

/**
 * Format temperature based on unit preference
 * @param {number} tempCelsius - Temperature in Celsius
 * @param {string} unit - 'celsius' or 'fahrenheit'
 * @param {boolean} includeSymbol - Include degree symbol (default: true)
 * @returns {string} - Formatted temperature with unit
 */
export const formatTemperature = (tempCelsius, unit = 'celsius', includeSymbol = true) => {
  if (unit === 'fahrenheit') {
    const fahrenheit = celsiusToFahrenheit(tempCelsius);
    return includeSymbol ? `${Math.round(fahrenheit)}°F` : `${Math.round(fahrenheit)}°`;
  }
  return includeSymbol ? `${Math.round(tempCelsius)}°C` : `${Math.round(tempCelsius)}°`;
};

/**
 * Get numeric temperature value based on unit preference (for calculations)
 * @param {number} tempCelsius - Temperature in Celsius
 * @param {string} unit - 'celsius' or 'fahrenheit'
 * @returns {number} - Temperature in selected unit
 */
export const getTemperatureValue = (tempCelsius, unit = 'celsius') => {
  if (unit === 'fahrenheit') {
    return Math.round(celsiusToFahrenheit(tempCelsius));
  }
  return Math.round(tempCelsius);
};

/**
 * Get numeric distance value based on unit preference (for calculations)
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} unit - 'km' or 'miles'
 * @returns {number} - Distance in selected unit
 */
export const getDistanceValue = (distanceKm, unit = 'km') => {
  if (unit === 'miles') {
    return kmToMiles(distanceKm);
  }
  return distanceKm;
};

/**
 * Format wind speed based on unit preference
 * @param {number} speedKmh - Wind speed in km/h
 * @param {string} unit - 'km' or 'miles'
 * @returns {string} - Formatted wind speed with unit
 */
export const formatWindSpeed = (speedKmh, unit = 'km') => {
  if (unit === 'miles') {
    const mph = kmToMiles(speedKmh);
    return `${Math.round(mph)} mph`;
  }
  return `${Math.round(speedKmh)} km/h`;
};

/**
 * Get temperature unit symbol
 * @param {string} unit - 'celsius' or 'fahrenheit'
 * @returns {string} - '°C' or '°F'
 */
export const getTemperatureSymbol = (unit = 'celsius') => {
  return unit === 'fahrenheit' ? '°F' : '°C';
};

/**
 * Get distance unit symbol
 * @param {string} unit - 'km' or 'miles'
 * @returns {string} - 'km' or 'mi'
 */
export const getDistanceSymbol = (unit = 'km') => {
  return unit === 'miles' ? 'mi' : 'km';
};
