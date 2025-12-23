// External data source: Weather API provider
// Note: You'll need to get a free API key from OpenWeatherMap or similar service
// For demo purposes, we'll use mock data structure

const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Mock weather data for demonstration
const generateMockWeatherData = (lat, lon, index) => {
  const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
  const condition = conditions[index % conditions.length];

  const baseTemp = condition === 'snowy' ? -5 : condition === 'sunny' ? 25 : 15;
  const temp = baseTemp + (Math.random() * 10 - 5);

  return {
    lat,
    lon,
    name: `Destination ${index + 1}`,
    condition,
    temperature: Math.round(temp),
    humidity: Math.round(50 + Math.random() * 30),
    windSpeed: Math.round(5 + Math.random() * 20),
    stability: Math.round(70 + Math.random() * 25), // Weather stability score
    forecast: {
      today: { condition, temp: Math.round(temp), high: Math.round(temp + 5), low: Math.round(temp - 5) },
      tomorrow: { condition: conditions[(index + 1) % conditions.length], temp: Math.round(temp + 2), high: Math.round(temp + 7), low: Math.round(temp - 3) },
      day3: { condition: conditions[(index + 2) % conditions.length], temp: Math.round(temp - 1), high: Math.round(temp + 4), low: Math.round(temp - 6) },
    },
    description: `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions`,
  };
};

/**
 * Provider method: returns weather-enriched destinations in a radius (no domain filtering)
 */
export const fetchWeatherDestinationsForRadius = async (userLat, userLon, radiusKm) => {
  // In production, this would call a real weather API
  // For now, we'll generate mock destinations within the radius

  const destinations = [];
  const numDestinations = Math.min(20, Math.floor(radiusKm / 50)); // More destinations for larger radius

  for (let i = 0; i < numDestinations; i++) {
    // Generate random points within the radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm * 1000; // Convert to meters
    const latOffset = (distance * Math.cos(angle)) / 111000; // Rough conversion
    const lonOffset = (distance * Math.sin(angle)) / (111000 * Math.cos(userLat * Math.PI / 180));

    const destLat = userLat + latOffset;
    const destLon = userLon + lonOffset;

    const weather = generateMockWeatherData(destLat, destLon, i);
    destinations.push(weather);
  }

  return destinations;
};


