import Constants from 'expo-constants';

const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const SEARCH_URL = `${API_BASE_URL}/find`;
const FORECAST_URL = `${API_BASE_URL}/forecast`;

const CACHE_TTL_MS = 60 * 60 * 1000;
const forecastCache = new Map();

const isValidCoordinate = (value) => Number.isFinite(value);

const toRadians = (value) => (value * Math.PI) / 180;

const getBoundingBox = (lat, lon, radiusKm) => {
  const latDelta = Math.min(89.9, radiusKm / 111.32);
  const lonMultiplier = Math.max(Math.cos(lat * Math.PI / 180), 0.1);
  const lonDelta = Math.min(179.9, radiusKm / (111.32 * lonMultiplier));

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lonMin: lon - lonDelta,
    lonMax: lon + lonDelta,
  };
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isWithinRadius = (centerLat, centerLon, targetLat, targetLon, radiusKm) => {
  if (!radiusKm) return true;
  return getDistanceKm(centerLat, centerLon, targetLat, targetLon) <= radiusKm;
};

const mapWeatherCondition = (weatherMain = '', weatherDescription = '') => {
  const main = weatherMain.toLowerCase();
  const description = weatherDescription.toLowerCase();

  if (main === 'clear') return 'sunny';
  if (main === 'clouds') return 'cloudy';
  if (main === 'rain' || main === 'drizzle' || description.includes('shower')) {
    return 'rainy';
  }
  if (main === 'thunderstorm' || description.includes('storm')) return 'rainy';
  if (main === 'snow') return 'snowy';
  if (
    ['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'].includes(main) ||
    description.includes('wind')
  ) {
    return 'windy';
  }
  if (description.includes('sun') || description.includes('clear')) return 'sunny';

  return 'cloudy';
};

const normalizeCoordinate = (coordValue) =>
  Number.isFinite(coordValue) ? coordValue : 0;

const adaptDestination = (city) => {
  const { coord = {}, main = {}, weather = [], wind = {}, clouds = {} } = city;
  const [weatherInfo] = weather;

  return {
    lat: normalizeCoordinate(coord.Lat ?? coord.lat),
    lon: normalizeCoordinate(coord.Lon ?? coord.lon),
    name: city.name || 'Unknown destination',
    condition: mapWeatherCondition(weatherInfo?.main, weatherInfo?.description),
    temperature: Math.round(main.temp ?? 0),
    humidity: main.humidity ?? 0,
    windSpeed: Math.round((wind.speed ?? 0) * 3.6),
    stability: Math.max(
      0,
      Math.min(
        100,
        100 - (clouds.all ?? 0) - Math.round((wind.speed ?? 0) * 2)
      )
    ),
  };
};

const adaptDailyForecastEntry = (entry) => {
  if (!entry) {
    return {
      condition: 'sunny',
      temp: 0,
      high: 0,
      low: 0,
    };
  }

  const [weatherInfo] = entry.weather || [];
  const tempValue = entry.temp?.day ?? entry.temp ?? 0;

  return {
    condition: mapWeatherCondition(weatherInfo?.main, weatherInfo?.description),
    temp: Math.round(tempValue),
    high: Math.round(entry.temp?.max ?? tempValue),
    low: Math.round(entry.temp?.min ?? tempValue),
  };
};

const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const buildForecastFromResponse = (data, lat, lon, name) => {
  // The forecast API returns a list of 3-hour intervals for 5 days
  const forecastList = data.list || [];
  const cityName = data.city?.name || name || `Location at ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  
  if (forecastList.length === 0) {
    return buildMockForecast(lat, lon, cityName);
  }

  // Get current conditions from the first entry
  const current = forecastList[0];
  const [currentWeather] = current.weather || [];
  
  // Group forecast by day to calculate daily highs/lows
  const dailyGroups = {};
  forecastList.forEach((entry) => {
    const date = new Date(entry.dt * 1000);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!dailyGroups[dayKey]) {
      dailyGroups[dayKey] = [];
    }
    dailyGroups[dayKey].push(entry);
  });

  const dailyKeys = Object.keys(dailyGroups).slice(0, 3); // Today, tomorrow, day 3
  
  const buildDayForecast = (dayKey) => {
    const entries = dailyGroups[dayKey] || [];
    if (entries.length === 0) {
      return { condition: 'sunny', temp: 0, high: 0, low: 0 };
    }
    
    const temps = entries.map((e) => e.main?.temp ?? 0);
    const [weatherInfo] = entries[0].weather || [];
    
    return {
      condition: mapWeatherCondition(weatherInfo?.main, weatherInfo?.description),
      temp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
      high: Math.round(Math.max(...temps)),
      low: Math.round(Math.min(...temps)),
    };
  };

  return {
    lat,
    lon,
    name: cityName,
    condition: mapWeatherCondition(currentWeather?.main, currentWeather?.description),
    temperature: Math.round(current.main?.temp ?? 0),
    humidity: current.main?.humidity ?? 0,
    windSpeed: Math.round((current.wind?.speed ?? 0) * 3.6),
    stability: Math.max(
      0,
      Math.min(
        100,
        100 - (current.clouds?.all ?? 0) - Math.round((current.wind?.speed ?? 0) * 2)
      )
    ),
    forecast: {
      today: buildDayForecast(dailyKeys[0]),
      tomorrow: buildDayForecast(dailyKeys[1]),
      day3: buildDayForecast(dailyKeys[2]),
    },
    description: capitalize(currentWeather?.description || 'Weather data available'),
    fetchedAt: new Date().toISOString(),
  };
};

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
    stability: Math.round(70 + Math.random() * 25),
    forecast: {
      today: {
        condition,
        temp: Math.round(temp),
        high: Math.round(temp + 5),
        low: Math.round(temp - 5),
      },
      tomorrow: {
        condition: conditions[(index + 1) % conditions.length],
        temp: Math.round(temp + 2),
        high: Math.round(temp + 7),
        low: Math.round(temp - 3),
      },
      day3: {
        condition: conditions[(index + 2) % conditions.length],
        temp: Math.round(temp - 1),
        high: Math.round(temp + 4),
        low: Math.round(temp - 6),
      },
    },
    description: `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions`,
    fetchedAt: new Date().toISOString(),
  };
};

const generateMockDestinations = (lat, lon, radiusKm = 400, count = null) => {
  const destinations = [];
  const numDestinations = count ?? Math.max(5, Math.min(20, Math.floor(radiusKm / 50)));

  for (let i = 0; i < numDestinations; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm * 1000;
    const latOffset = (distance * Math.cos(angle)) / 111000;
    const lonOffset =
      (distance * Math.sin(angle)) / (111000 * Math.max(Math.cos(lat * Math.PI / 180), 0.1));

    destinations.push(generateMockWeatherData(lat + latOffset, lon + lonOffset, i));
  }

  return destinations;
};

const getOpenWeatherApiKey = () =>
  Constants.expoConfig?.extra?.openWeatherApiKey?.trim() ?? '';

export const fetchWeatherDestinationsForRadius = async (
  userLat,
  userLon,
  radiusKm = 400
) => {
  if (!isValidCoordinate(userLat) || !isValidCoordinate(userLon)) {
    return generateMockDestinations(0, 0, radiusKm);
  }

  const apiKey = getOpenWeatherApiKey();

  if (!apiKey) {
    console.warn(
      '⚠️ OpenWeatherMap API key is not configured, falling back to mock destinations'
    );
    return generateMockDestinations(userLat, userLon, radiusKm);
  }

  // OpenWeatherMap 'find' API: searches for cities within a radius
  // Request maximum cities (API limit is 50)
  const cnt = 50; // Always request max to get best coverage
  const url = `${SEARCH_URL}?lat=${userLat}&lon=${userLon}&cnt=${cnt}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap returned ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`📍 OpenWeatherMap returned ${data.list?.length || 0} cities`);
    
    let realCities = [];
    if (Array.isArray(data.list) && data.list.length > 0) {
      realCities = data.list
        .map(adaptDestination)
        .filter((dest) => dest.lat && dest.lon)
        .filter((dest) => isWithinRadius(userLat, userLon, dest.lat, dest.lon, radiusKm));
      
      console.log(`✅ After filtering: ${realCities.length} real cities within radius`);
    }

    // Hybrid mode: Add mock destinations to fill the radius nicely
    const desiredTotal = Math.max(15, Math.min(30, Math.floor(radiusKm / 30)));
    const mockCount = Math.max(0, desiredTotal - realCities.length);
    
    if (mockCount > 0) {
      console.log(`➕ Adding ${mockCount} mock destinations for better coverage`);
      const mockDestinations = generateMockDestinations(userLat, userLon, radiusKm, mockCount);
      return [...realCities, ...mockDestinations];
    }

    return realCities.length > 0 ? realCities : generateMockDestinations(userLat, userLon, radiusKm);
  } catch (error) {
    console.warn('Failed to load destinations from OpenWeatherMap', error);
    return generateMockDestinations(userLat, userLon, radiusKm);
  }
};

const buildMockForecast = (lat, lon, name) => {
  const index = Math.floor(Math.abs(lat * lon * 1000)) % 100;
  const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
  const condition = conditions[index % conditions.length];
  const baseTemp = condition === 'snowy' ? -5 : condition === 'sunny' ? 25 : 15;
  const temp = baseTemp + (Math.abs(lat) % 10);

  return {
    lat,
    lon,
    name: name || `Location at ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    condition,
    temperature: Math.round(temp),
    humidity: Math.round(50 + (Math.abs(lon) % 30)),
    windSpeed: Math.round(5 + (Math.abs(lat + lon) % 20)),
    stability: Math.round(70 + (Math.abs(lat * 10) % 25)),
    forecast: {
      today: {
        condition,
        temp: Math.round(temp),
        high: Math.round(temp + 5),
        low: Math.round(temp - 5),
      },
      tomorrow: {
        condition: conditions[(index + 1) % conditions.length],
        temp: Math.round(temp + 2),
        high: Math.round(temp + 7),
        low: Math.round(temp - 3),
      },
      day3: {
        condition: conditions[(index + 2) % conditions.length],
        temp: Math.round(temp - 1),
        high: Math.round(temp + 4),
        low: Math.round(temp - 6),
      },
    },
    description: `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions`,
    fetchedAt: new Date().toISOString(),
  };
};

export const fetchDetailedForecast = async (lat, lon, name = null) => {
  if (!isValidCoordinate(lat) || !isValidCoordinate(lon)) {
    const mockForecast = buildMockForecast(lat || 0, lon || 0, name);
    return mockForecast;
  }

  const cacheKey = getCacheKey(lat, lon);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  const apiKey = getOpenWeatherApiKey();

  if (!apiKey) {
    const mockForecast = buildMockForecast(lat, lon, name);
    setInCache(cacheKey, mockForecast);
    return mockForecast;
  }

  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap returned ${response.status}`);
    }

    const data = await response.json();
    const forecast = buildForecastFromResponse(data, lat, lon, name);
    setInCache(cacheKey, forecast);
    return forecast;
  } catch (error) {
    console.warn('Failed to fetch forecast from OpenWeatherMap', error);
    const mockForecast = buildMockForecast(lat, lon, name);
    setInCache(cacheKey, mockForecast);
    return mockForecast;
  }
};

const getCacheKey = (lat, lon) => `${lat}:${lon}`;

const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_TTL_MS;
};

const getFromCache = (key) => {
  const cacheEntry = forecastCache.get(key);
  if (isCacheValid(cacheEntry)) {
    return cacheEntry.data;
  }
  if (cacheEntry) {
    forecastCache.delete(key);
  }
  return null;
};

const setInCache = (key, data) => {
  forecastCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};


