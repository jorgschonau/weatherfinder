/**
 * Country Code → Name Lookup (Localized)
 */

// German country names
const COUNTRY_NAMES_DE = {
  'DE': 'Deutschland', 'FR': 'Frankreich', 'ES': 'Spanien', 'PT': 'Portugal',
  'IT': 'Italien', 'GB': 'Vereinigtes Königreich', 'NL': 'Niederlande', 'BE': 'Belgien',
  'AT': 'Österreich', 'CH': 'Schweiz', 'SE': 'Schweden', 'NO': 'Norwegen',
  'DK': 'Dänemark', 'FI': 'Finnland', 'PL': 'Polen', 'CZ': 'Tschechien',
  'GR': 'Griechenland', 'IE': 'Irland', 'US': 'Vereinigte Staaten', 'CA': 'Kanada',
  'MX': 'Mexiko', 'HR': 'Kroatien', 'SI': 'Slowenien', 'HU': 'Ungarn',
  'SK': 'Slowakei', 'RO': 'Rumänien', 'BG': 'Bulgarien', 'TR': 'Türkei',
  'MA': 'Marokko', 'EG': 'Ägypten', 'TN': 'Tunesien', 'CY': 'Zypern',
  'MT': 'Malta', 'IS': 'Island', 'LU': 'Luxemburg', 'MC': 'Monaco',
  'AL': 'Albanien', 'ME': 'Montenegro', 'RS': 'Serbien', 'BA': 'Bosnien-Herzegowina',
  'MK': 'Nordmazedonien', 'XK': 'Kosovo', 'LV': 'Lettland', 'LT': 'Litauen',
  'EE': 'Estland', 'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldawien',
  'GT': 'Guatemala', 'BZ': 'Belize', 'SV': 'El Salvador', 'HN': 'Honduras',
  'NI': 'Nicaragua', 'CR': 'Costa Rica', 'PA': 'Panama', 'CU': 'Kuba',
  'JM': 'Jamaika', 'HT': 'Haiti', 'DO': 'Dominikanische Republik', 'PR': 'Puerto Rico',
};

// French country names
const COUNTRY_NAMES_FR = {
  'DE': 'Allemagne', 'FR': 'France', 'ES': 'Espagne', 'PT': 'Portugal',
  'IT': 'Italie', 'GB': 'Royaume-Uni', 'NL': 'Pays-Bas', 'BE': 'Belgique',
  'AT': 'Autriche', 'CH': 'Suisse', 'SE': 'Suède', 'NO': 'Norvège',
  'DK': 'Danemark', 'FI': 'Finlande', 'PL': 'Pologne', 'CZ': 'Tchéquie',
  'GR': 'Grèce', 'IE': 'Irlande', 'US': 'États-Unis', 'CA': 'Canada',
  'MX': 'Mexique', 'HR': 'Croatie', 'SI': 'Slovénie', 'HU': 'Hongrie',
};

// English country names (fallback)
export const COUNTRY_NAMES = {
  'DE': 'Germany', 'FR': 'France', 'ES': 'Spain', 'PT': 'Portugal',
  'IT': 'Italy', 'GB': 'United Kingdom', 'NL': 'Netherlands', 'BE': 'Belgium',
  'AT': 'Austria', 'CH': 'Switzerland', 'SE': 'Sweden', 'NO': 'Norway',
  'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'CZ': 'Czech Republic',
  'GR': 'Greece', 'IE': 'Ireland', 'US': 'United States', 'CA': 'Canada',
  'MX': 'Mexico', 'HR': 'Croatia', 'SI': 'Slovenia', 'HU': 'Hungary',
  'SK': 'Slovakia', 'RO': 'Romania', 'BG': 'Bulgaria', 'TR': 'Turkey',
  'MA': 'Morocco', 'EG': 'Egypt', 'TN': 'Tunisia', 'CY': 'Cyprus',
  'MT': 'Malta', 'IS': 'Iceland', 'LU': 'Luxembourg', 'MC': 'Monaco',
  'AL': 'Albania', 'ME': 'Montenegro', 'RS': 'Serbia', 'BA': 'Bosnia and Herzegovina',
  'MK': 'North Macedonia', 'XK': 'Kosovo', 'LV': 'Latvia', 'LT': 'Lithuania',
  'EE': 'Estonia', 'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldova',
  'GT': 'Guatemala', 'BZ': 'Belize', 'SV': 'El Salvador', 'HN': 'Honduras',
  'NI': 'Nicaragua', 'CR': 'Costa Rica', 'PA': 'Panama', 'CU': 'Cuba',
  'JM': 'Jamaica', 'HT': 'Haiti', 'DO': 'Dominican Republic', 'PR': 'Puerto Rico',
};

/**
 * Get country name from code (localized)
 * @param {string} code - ISO 3166-1 alpha-2 code (e.g. 'DE')
 * @param {string} locale - Locale for translation (e.g. 'de', 'en', 'fr')
 * @returns {string} - Country name (e.g. 'Deutschland' for locale='de')
 */
export const getCountryName = (code, locale = 'en') => {
  if (!code) return '';
  const upperCode = code.toUpperCase();
  
  // Get locale prefix (e.g., 'de-DE' -> 'de')
  const lang = (locale || 'en').split('-')[0].toLowerCase();
  
  // Select the right map based on language
  if (lang === 'de') {
    return COUNTRY_NAMES_DE[upperCode] || COUNTRY_NAMES[upperCode] || upperCode;
  }
  if (lang === 'fr') {
    return COUNTRY_NAMES_FR[upperCode] || COUNTRY_NAMES[upperCode] || upperCode;
  }
  
  // Default: English
  return COUNTRY_NAMES[upperCode] || upperCode;
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

