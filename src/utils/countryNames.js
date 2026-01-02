/**
 * Country Code → Name Lookup
 * Simple, fast, no DB needed!
 */

export const COUNTRY_NAMES = {
  // Europe
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'PT': 'Portugal',
  'IT': 'Italy',
  'GB': 'United Kingdom',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'GR': 'Greece',
  'IE': 'Ireland',
  
  // North America
  'US': 'United States',
  'CA': 'Canada',
  'MX': 'Mexico',
};

/**
 * Get country name from code
 * @param {string} code - ISO 3166-1 alpha-2 code (e.g. 'DE')
 * @returns {string} - Country name (e.g. 'Germany')
 */
export const getCountryName = (code) => {
  return COUNTRY_NAMES[code] || code;
};

/**
 * Get country flag emoji from code
 * @param {string} code - ISO 3166-1 alpha-2 code
 * @returns {string} - Flag emoji (e.g. '🇩🇪')
 */
export const getCountryFlag = (code) => {
  if (!code || code.length !== 2) return '';
  
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
};

export default {
  COUNTRY_NAMES,
  getCountryName,
  getCountryFlag,
};

