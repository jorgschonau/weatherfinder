import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getWeatherForRadius, getWeatherIcon, getWeatherColor } from '../../usecases/weatherUsecases';
import { BadgeMetadata } from '../../domain/destinationBadge';
import { playTickSound, playDingSound } from '../../utils/soundUtils';
// Badges are now calculated in weatherUsecases.js, not here!
import WeatherFilter from '../components/WeatherFilter';
import DateFilter from '../components/DateFilter';
import OnboardingOverlay from '../components/OnboardingOverlay';
import AnimatedBadge from '../components/AnimatedBadge';
// import AnimatedMarker from '../components/AnimatedMarker'; // Temporarily disabled
import { SkeletonMapMarker } from '../components/SkeletonLoader';
// import MapSearchBar from '../components/MapSearchBar'; // TODO: Component doesn't exist yet

// Custom map style to hide POI Business and Transit
const customMapStyle = [
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
];

// Map boundaries - restrict visible area
const MAP_BOUNDS = {
  north: 75,   // Spitzbergen + Puffer
  south: 15,   // Südlich von Mexico City + Puffer
  west: -175,  // Alaska + Pazifik-Inseln
  east: 50     // Östlich Ural + Puffer
};

const MapScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [centerPoint, setCenterPoint] = useState(null); // Custom center point (if set)
  const [centerPointWeather, setCenterPointWeather] = useState(null); // Weather for custom center
  const [destinations, setDestinations] = useState([]);
  const [visibleMarkers, setVisibleMarkers] = useState([]); // Filtered markers based on zoom
  const [currentZoom, setCurrentZoom] = useState(5); // Track zoom level
  const [currentBounds, setCurrentBounds] = useState(null); // Track viewport bounds
  const radiusDebounceTimer = useRef(null); // Debounce timer for radius changes
  const boundsDebounceTimer = useRef(null); // Debounce timer for bounds changes
  const [radius, setRadius] = useState(500); // Default 500km
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedDate, setSelectedDate] = useState('today'); // Date filter (mock for now)
  const [loading, setLoading] = useState(true);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [mapType, setMapType] = useState('standard'); // standard, satellite, hybrid, terrain, mutedStandard
  const [controlsExpanded, setControlsExpanded] = useState(true); // Controls einklappbar
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMockData, setShowMockData] = useState(true); // Toggle for mock data (temp for testing)
  const [showOnlyBadges, setShowOnlyBadges] = useState(false); // Toggle to show only destinations with badges
  const [showRadiusMenu, setShowRadiusMenu] = useState(false); // Dropdown for radius selection
  const [reverseMode, setReverseMode] = useState('warm'); // 'warm' or 'cold' - which places to reward
  const [radiusShape, setRadiusShape] = useState('circle'); // 'circle', 'half', 'semi' - radius shape
  const [currentRegion, setCurrentRegion] = useState(null); // Track current map region
  // const [warnings, setWarnings] = useState([]); // Weather warnings - DISABLED
  // const [showWarnings, setShowWarnings] = useState(true); // Toggle for warnings display - DISABLED
  // const [showSearch, setShowSearch] = useState(false); // Toggle search bar - DISABLED (MapSearchBar component missing)
  const [cachedData, setCachedData] = useState(null); // Cache for destinations

  useEffect(() => {
    (async () => {
      // Check if first time user
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }

      // Load cached center point
      try {
        const savedCenter = await AsyncStorage.getItem('mapCenterPoint');
        if (savedCenter) {
          const center = JSON.parse(savedCenter);
          setCenterPoint(center);
        }
      } catch (error) {
        console.warn('Failed to load saved center point:', error);
      }

      // Load cached destinations
      try {
        const cached = await AsyncStorage.getItem('mapDestinationsCache');
        if (cached) {
          const cacheData = JSON.parse(cached);
          // Check if cache is less than 1 hour old
          if (Date.now() - cacheData.timestamp < 3600000) {
            setCachedData(cacheData.data);
          }
        }
      } catch (error) {
        console.warn('Failed to load cache:', error);
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast(t('map.locationNotAvailable'), 'error');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      const initialRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 2,
        longitudeDelta: 2,
      };
      setLocation(initialRegion);
      
      // Set initial bounds
      const initialBounds = {
        north: initialRegion.latitude + initialRegion.latitudeDelta / 2,
        south: initialRegion.latitude - initialRegion.latitudeDelta / 2,
        east: initialRegion.longitude + initialRegion.longitudeDelta / 2,
        west: initialRegion.longitude - initialRegion.longitudeDelta / 2,
      };
      setCurrentBounds(initialBounds);
      
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (location) {
      console.log('🔄 Trigger: location/radius/condition/centerPoint/centerPointWeather changed, reloading destinations...');
      
      // Debounce radius changes to prevent rapid re-fetching
      if (radiusDebounceTimer.current) {
        clearTimeout(radiusDebounceTimer.current);
      }
      
      radiusDebounceTimer.current = setTimeout(() => {
        loadDestinations();
      }, 500); // Wait 500ms after last radius change
      
      // Adjust map region immediately (no debounce for visual feedback)
      const effectiveCenter = centerPoint || location;
      if (mapRef.current && effectiveCenter) {
        mapRef.current.animateToRegion({
          latitude: effectiveCenter.latitude,
          longitude: effectiveCenter.longitude,
          latitudeDelta: (radius * 2) / 111,
          longitudeDelta: (radius * 2) / (111* Math.cos(effectiveCenter.latitude * Math.PI / 180)),
        }, 600); // Langsamere Animation (600ms statt 500ms)
      }
    }
    
    // Cleanup timer on unmount
    return () => {
      if (radiusDebounceTimer.current) {
        clearTimeout(radiusDebounceTimer.current);
      }
    };
  }, [location, radius, selectedCondition, centerPoint, centerPointWeather]);

  // Update visible markers when zoom, bounds, or destinations change
  useEffect(() => {
    if (destinations.length > 0 && currentBounds) {
      // Debounce bounds changes for performance
      if (boundsDebounceTimer.current) {
        clearTimeout(boundsDebounceTimer.current);
      }
      
      boundsDebounceTimer.current = setTimeout(() => {
        const visible = getVisibleMarkers(destinations, currentZoom, currentBounds);
        setVisibleMarkers(visible);
        
        const specialCount = visible.filter(v => v.isCurrentLocation || v.isCenterPoint).length;
        const badgeCount = visible.filter(v => v.badges && v.badges.length > 0 && !v.isCurrentLocation && !v.isCenterPoint).length;
        const regularCount = visible.length - specialCount - badgeCount;
        console.log(`🔍 Zoom ${currentZoom}: ${visible.length} markers (${specialCount} special + ${badgeCount} badges + ${regularCount} regular) of ${destinations.length}`);
      }, 300);
    }
    
    return () => {
      if (boundsDebounceTimer.current) {
        clearTimeout(boundsDebounceTimer.current);
      }
    };
  }, [destinations, currentZoom, currentBounds]);

  const loadDestinations = async () => {
    if (!location) return;
    
    setLoadingDestinations(true);
    try {
      // Use centerPoint if set, otherwise use user location
      const effectiveCenter = centerPoint || location;
      
      console.log(`🔄 Loading destinations for center: ${effectiveCenter.latitude.toFixed(2)}, ${effectiveCenter.longitude.toFixed(2)}, radius: ${radius}km`);
      
      const weatherData = await getWeatherForRadius(
        effectiveCenter.latitude,
        effectiveCenter.longitude,
        radius,
        selectedCondition
      );
      
      // ALWAYS add current location as first marker
      const currentLocationWeather = await getCurrentLocationWeather();
      
      // Build destinations array: current location + center point (if set) + other destinations
      let allDestinations = [];
      
      if (currentLocationWeather) {
        allDestinations.push(currentLocationWeather);
      }
      
      // Add center point weather if it exists
      if (centerPointWeather) {
        allDestinations.push(centerPointWeather);
      }
      
      // Add all other destinations
      allDestinations = [...allDestinations, ...weatherData];
      
      // Calculate badges (AFTER current location is added!)
      // Use centerPointWeather if available, otherwise use currentLocationWeather
      const originWeather = centerPointWeather || currentLocationWeather;
      const originLat = centerPoint ? centerPoint.latitude : location.latitude;
      const originLon = centerPoint ? centerPoint.longitude : location.longitude;
      
      console.log(`🏆 Badge origin: ${centerPointWeather ? 'centerPoint' : 'currentLocation'} (${originWeather?.temperature}°C at ${originWeather?.name})`);
      
      // Badges are now calculated in weatherUsecases.js - no need to apply here!
      
      setDestinations(allDestinations);
      
      // Cache destinations
      try {
        await AsyncStorage.setItem('mapDestinationsCache', JSON.stringify({
          timestamp: Date.now(),
          data: allDestinations,
        }));
      } catch (cacheError) {
        console.warn('Failed to cache destinations:', cacheError);
      }
      
      // Generate warnings from destinations (independent of filter) - DISABLED
      // const generatedWarnings = generateWeatherWarnings(
      //   allDestinations,
      //   location.latitude,
      //   location.longitude
      // );
      // setWarnings(generatedWarnings);
    } catch (error) {
      showToast(t('map.failedToLoadWeather') || 'Failed to load weather data', 'error');
      console.error(error);
    } finally {
      setLoadingDestinations(false);
    }
  };

  /**
   * Fetch weather for current location (always show, independent of DB)
   */
  const getCurrentLocationWeather = async () => {
    if (!location) return null;
    
    try {
      // Get city name from reverse geocoding
      let cityName = 'Dein Standort';
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        
        if (geocode && geocode[0]) {
          // Prefer city, fall back to district, then region
          cityName = geocode[0].city || geocode[0].district || geocode[0].region || 'Dein Standort';
        }
      } catch (geoError) {
        console.warn('Reverse geocoding failed:', geoError);
      }

      // Use Open-Meteo API for current location
      const params = new URLSearchParams({
        latitude: location.latitude,
        longitude: location.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'cloud_cover',
          'wind_speed_10m',
        ].join(','),
        timezone: 'auto',
      });

      const url = `https://api.open-meteo.com/v1/forecast?${params}`;
      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();
      const current = data.current;

      // Map to app format
      const condition = mapWeatherCodeToCondition(current.weather_code);
      
      return {
        lat: location.latitude,
        lon: location.longitude,
        name: `📍 ${cityName}`, // Use geocoded city name
        condition,
        temperature: Math.round(current.temperature_2m || 0),
        feelsLike: Math.round(current.apparent_temperature || 0),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m || 0),
        precipitation: current.precipitation || 0,
        cloudCover: current.cloud_cover,
        stability: calculateStability(current.cloud_cover, current.wind_speed_10m),
        distance: 0,
        isCurrentLocation: true, // Mark as current location
        badges: [],
      };
    } catch (error) {
      console.warn('Failed to fetch current location weather:', error);
      return null;
    }
  };

  /**
   * Map Open-Meteo weather code to app condition
   */
  const mapWeatherCodeToCondition = (code) => {
    if (!code && code !== 0) return 'cloudy';
    
    if (code === 0 || code === 1) return 'sunny';
    if (code === 2 || code === 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'windy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'snowy';
    if (code >= 80 && code <= 99) return 'rainy';
    
    return 'cloudy';
  };

  /**
   * Calculate stability from cloud cover and wind speed
   */
  const calculateStability = (cloudCover, windSpeed) => {
    const cloudScore = 100 - (cloudCover || 50);
    const windScore = Math.max(0, 100 - (windSpeed || 5) * 2);
    return Math.round((cloudScore + windScore) / 2);
  };

  const handleMarkerPress = (destination) => {
    navigation.navigate('DestinationDetail', { destination });
  };

  const handleRadiusIncrease = async () => {
    const newRadius = Math.min(radius + 50, 5000); // Max 5000 km
    setRadius(newRadius);
    await playDingSound(); // Play ding sound on interaction
    // Note: loadDestinations is debounced in useEffect (500ms delay)
  };

  const handleRadiusDecrease = async () => {
    const newRadius = Math.max(radius - 50, 50); // Min 50 km
    setRadius(newRadius);
    await playDingSound(); // Play ding sound on interaction
    // Note: loadDestinations is debounced in useEffect (500ms delay)
  };

  const handleRadiusSelect = async (newRadius) => {
    setRadius(newRadius);
    setShowRadiusMenu(false);
    await playDingSound(); // Play ding sound on interaction
    // Note: loadDestinations is debounced in useEffect (500ms delay)
  };

  const handleCloseOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const getStabilitySymbol = (destination) => {
    // TREND: Compare TODAY vs TOMORROW from forecast data
    // ↑ = Weather getting BETTER
    // = = Weather staying SAME
    // ↓ = Weather getting WORSE
    
    // If we have weatherTrend from DB, use that (pre-calculated)
    if (destination.weatherTrend) {
      if (destination.weatherTrend === 'improving') return '↑';
      if (destination.weatherTrend === 'worsening') return '↓';
      return '=';
    }
    
    // Fallback: Calculate from current data (rough estimate)
    // TODO: This should be calculated properly in the weather update script
    // and stored in weather_data table as 'weather_trend'
    
    const temp = destination.temperature || 0;
    const condition = destination.condition || 'cloudy';
    
    // Simple heuristic until we have real forecast comparison:
    // Sunny + warm = likely staying good/improving
    // Rainy/cold = likely worsening
    if (condition === 'sunny' && temp >= 15) return '↑';
    if (condition === 'light_rain' || condition === 'heavy_rain' || condition === 'rainy' || temp < 5) return '↓';
    return '=';
  };

  // No more dynamic marker scaling - library handles density!

  const toggleMapType = () => {
    const mapTypes = ['standard', 'mutedStandard', 'satellite', 'hybrid', 'terrain'];
    const currentIndex = mapTypes.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % mapTypes.length;
    setMapType(mapTypes[nextIndex]);
  };

  const getMapTypeLabel = () => {
    return t(`mapType.${mapType}`, { defaultValue: t('mapType.standard') });
  };

  const toggleReverseMode = async () => {
    setReverseMode(prev => prev === 'warm' ? 'cold' : 'warm');
    await playTickSound();
    // TODO: Implement badge calculation reversal (cold places get rewards)
  };

  const toggleRadiusShape = async () => {
    const shapes = ['circle', 'half', 'semi'];
    const currentIndex = shapes.indexOf(radiusShape);
    const nextIndex = (currentIndex + 1) % shapes.length;
    setRadiusShape(shapes[nextIndex]);
    await playTickSound();
    // TODO: Implement radius shape filtering
  };

  /**
   * Calculate dynamic zoom limits based on radius
   */
  const getZoomLimits = () => {
    // minZoom: Allow user to see entire radius
    // Formula: smaller minZoom for larger radius (MORE RELAXED!)
    let minZoom;
    if (radius <= 400) {
      minZoom = 4; // Normal radius (was 5, now 4 - more zoom out)
    } else if (radius <= 800) {
      minZoom = 3; // Medium radius (was 4, now 3)
    } else if (radius <= 1500) {
      minZoom = 2; // Large radius (was 3, now 2)
    } else {
      minZoom = 1; // Very large radius (was 2, now 1 - almost world view)
    }

    // maxZoom: Prevent zooming in too close (always 15)
    const maxZoom = 15;

    return { minZoom, maxZoom };
  };

  /**
   * Show toast notification (cross-platform)
   */
  const showToast = (message, type = 'info') => {
    Toast.show({
      type: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
      text1: message,
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  /**
   * Calculate display score: Badges = max priority, otherwise use attractiveness
   */
  const getDisplayScore = (place) => {
    // Orte mit Badges = immer max Score (100)
    if (place.badges && place.badges.length > 0) {
      return 100;
    }
    
    // Orte ohne Badges = attractivenessScore
    return place.attractivenessScore || 50;
  };

  /**
   * QUALITY-FIRST GREEDY ALGORITHM: Strict filtering at low zoom, more markers when zoomed in
   */
  const getVisibleMarkers = (allPlaces, zoom, bounds) => {
    // VIEL strengere Distance bei niedrigem Zoom (clean overview)
    const minDistKm = zoom < 5 ? 300 :   // Sehr weit raus - nur Top-Cities
                      zoom < 7 ? 150 :   // Weit - beste Places
                      zoom < 9 ? 70 :    // Medium
                      zoom < 11 ? 30 :   // Nah
                      zoom < 13 ? 15 : 7; // Sehr nah
    
    // Niedrigeres Limit bei niedrigem Zoom (quality over quantity)
    const maxMarkers = zoom < 5 ? 30 :    // Nur Top-Orte
                       zoom < 7 ? 80 :    // Beste Places
                       zoom < 10 ? 200 :  // Mehr Details
                       zoom < 13 ? 400 : 800; // Volle Dichte
    
    // HÖHERER Score-Threshold bei niedrigem Zoom (only best places)
    const minScore = zoom < 7 ? 70 :      // Nur beste Places
                     zoom < 10 ? 55 : 40;  // Mehr erlauben
    
    // ALWAYS keep special markers (current location, center point)
    const specialMarkers = allPlaces.filter(p => p.isCurrentLocation || p.isCenterPoint);
    const regularPlaces = allPlaces.filter(p => !p.isCurrentLocation && !p.isCenterPoint);
    
    // Viewport-Filter: Only visible area (with padding for smooth experience)
    const inViewport = regularPlaces.filter(p => {
      if (!bounds) return true; // No bounds yet, show all
      
      const lat = p.lat;
      const lon = p.lon;
      
      // Add 20% padding to bounds for smoother experience
      const latPadding = (bounds.north - bounds.south) * 0.2;
      const lonPadding = (bounds.east - bounds.west) * 0.2;
      
      return lat >= bounds.south - latPadding &&
             lat <= bounds.north + latPadding &&
             lon >= bounds.west - lonPadding &&
             lon <= bounds.east + lonPadding;
    });
    
    // Calculate display scores (badges = 100, otherwise attractiveness)
    const withScores = inViewport.map(p => ({
      ...p,
      displayScore: getDisplayScore(p)
    }));
    
    // Sort by DISPLAY SCORE (badges first!)
    const sorted = withScores
      .filter(p => p.displayScore >= minScore)  // Use dynamic score for filtering!
      .sort((a, b) => {
        const scoreDiff = b.displayScore - a.displayScore;
        if (Math.abs(scoreDiff) > 5) return scoreDiff;
        return (b.population || 0) - (a.population || 0);
      });
    
    // Debug: Show breakdown
    const withBadges = sorted.filter(p => p.badges && p.badges.length > 0).length;
    const withoutBadges = sorted.length - withBadges;
    console.log(`📍 Viewport: ${inViewport.length} places → ${sorted.length} after filter (${withBadges} with badges, ${withoutBadges} without)`);
    
    // Greedy Selection
    const selected = [...specialMarkers]; // Start with special markers
    
    for (const place of sorted) {
      // Too close to existing marker?
      const tooClose = selected.some(existing => 
        getDistanceKm(place.lat, place.lon, existing.lat, existing.lon) < minDistKm
      );
      
      if (!tooClose) {
        selected.push(place);
      }
      
      if (selected.length >= maxMarkers) break;
    }
    
    console.log(`✨ Selected ${selected.length} markers (minDist=${minDistKm}km, max=${maxMarkers})`);
    
    return selected;
  };

  /**
   * Calculate distance between two points (Haversine formula)
   */
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
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

  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  /**
   * Handle long press on map to set new center point
   */
  const handleMapLongPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    playTickSound();
    
    // Set new center point
    const newCenter = {
      latitude,
      longitude,
      latitudeDelta: 2,
      longitudeDelta: 2,
    };
    
    setCenterPoint(newCenter);
    
    // Fetch weather for new center point
    await fetchCenterPointWeather(latitude, longitude);
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('mapCenterPoint', JSON.stringify(newCenter));
    } catch (error) {
      console.warn('Failed to save center point:', error);
    }
    
    showToast('📍 Neuer Mittelpunkt gesetzt', 'info');
    
    // Note: useEffect with centerPoint dependency will automatically reload destinations
  };

  /**
   * Fetch weather for center point (similar to getCurrentLocationWeather)
   */
  const fetchCenterPointWeather = async (lat, lon) => {
    try {
      // Get city name from reverse geocoding
      let cityName = 'Neuer Mittelpunkt';
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon,
        });
        
        if (geocode && geocode[0]) {
          cityName = geocode[0].city || geocode[0].district || geocode[0].region || 'Neuer Mittelpunkt';
        }
      } catch (geoError) {
        console.warn('Reverse geocoding failed:', geoError);
      }

      // Use Open-Meteo API
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'weather_code',
          'cloud_cover',
          'wind_speed_10m',
        ].join(','),
        timezone: 'auto',
      });

      const url = `https://api.open-meteo.com/v1/forecast?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        setCenterPointWeather(null);
        return;
      }

      const data = await response.json();
      const current = data.current;

      // Map to app format
      const condition = mapWeatherCodeToCondition(current.weather_code);
      
      const weatherData = {
        lat,
        lon,
        name: `⊕ ${cityName}`,
        condition,
        temperature: Math.round(current.temperature_2m || 0),
        feelsLike: Math.round(current.apparent_temperature || 0),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m || 0),
        precipitation: current.precipitation || 0,
        cloudCover: current.cloud_cover,
        stability: calculateStability(current.cloud_cover, current.wind_speed_10m),
        isCenterPoint: true, // Mark as center point (like isCurrentLocation)
        badges: [],
      };
      
      setCenterPointWeather(weatherData);
    } catch (error) {
      console.warn('Failed to fetch center point weather:', error);
      setCenterPointWeather(null);
    }
  };

  /**
   * Reset center point to user location
   */
  const resetCenterPoint = async () => {
    setCenterPoint(null);
    setCenterPointWeather(null);
    try {
      await AsyncStorage.removeItem('mapCenterPoint');
    } catch (error) {
      console.warn('Failed to remove center point:', error);
    }
    playTickSound();
    showToast('📍 Mittelpunkt zurückgesetzt', 'info');
    
    // Note: useEffect with centerPoint dependency will automatically reload destinations
  };

  /**
   * Handle search result selection
   */
  const handleSearchSelect = (place) => {
    if (!mapRef.current) return;

    // Fly to selected place
    mapRef.current.animateToRegion({
      latitude: place.lat,
      longitude: place.lon,
      latitudeDelta: 1,
      longitudeDelta: 1,
    }, 1000);

    // Show place details after a short delay
    setTimeout(() => {
      handleMarkerPress(place);
    }, 1200);

    setShowSearch(false);
    playTickSound();
  };

  /**
   * Track map region changes to enforce boundaries + calculate zoom + bounds
   */
  const handleRegionChangeComplete = (region) => {
    // Calculate zoom from latitudeDelta
    // Zoom ~= log2(360 / latitudeDelta)
    const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
    const newZoom = Math.max(1, Math.min(20, zoom));
    
    if (newZoom !== currentZoom) {
      console.log(`📏 Zoom changed: ${currentZoom} → ${newZoom}`);
      setCurrentZoom(newZoom);
    }
    
    // Calculate viewport bounds
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const bounds = {
      north: latitude + latitudeDelta / 2,
      south: latitude - latitudeDelta / 2,
      east: longitude + longitudeDelta / 2,
      west: longitude - longitudeDelta / 2,
    };
    setCurrentBounds(bounds);
    
    // Enforce map boundaries
    let needsAdjustment = false;
    let newLatitude = latitude;
    let newLongitude = longitude;
    
    if (latitude > MAP_BOUNDS.north) {
      newLatitude = MAP_BOUNDS.north;
      needsAdjustment = true;
    } else if (latitude < MAP_BOUNDS.south) {
      newLatitude = MAP_BOUNDS.south;
      needsAdjustment = true;
    }
    
    if (longitude > MAP_BOUNDS.east) {
      newLongitude = MAP_BOUNDS.east;
      needsAdjustment = true;
    } else if (longitude < MAP_BOUNDS.west) {
      newLongitude = MAP_BOUNDS.west;
      needsAdjustment = true;
    }
    
    // If out of bounds, animate back to valid region
    if (needsAdjustment && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: newLatitude,
        longitude: newLongitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      }, 300);
    }
    
    setCurrentRegion(region);
  };

  if (loading && !location) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>{t('map.loadingLocation')}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{t('map.locationNotAvailable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OnboardingOverlay 
        visible={showOnboarding} 
        onClose={handleCloseOnboarding}
      />
      
      {/* Search Bar - DISABLED (MapSearchBar component missing) */}
      {/* {showSearch && (
        <MapSearchBar 
          onSelectPlace={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )} */}
      
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        customMapStyle={customMapStyle}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          // Start more zoomed out for cleaner view (multiply by 1.5)
          latitudeDelta: (radius * 2 * 1.5) / 111,
          longitudeDelta: (radius * 2 * 1.5) / (111 * Math.cos(location.latitude * Math.PI / 180)),
        }}
        minZoomLevel={getZoomLimits().minZoom}  // Dynamic based on radius!
        maxZoomLevel={getZoomLimits().maxZoom}  // Always 15 (prevent street level)
        pitchEnabled={false}  // Disable tilt/3D view
        rotateEnabled={false}  // Disable rotation
        showsUserLocation
        showsMyLocationButton
        onLongPress={handleMapLongPress}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Radius Circle - centered on centerPoint or location */}
        {(centerPoint || location) && (
          <Circle
            key={`radius-circle-${radius}-${(centerPoint || location).latitude}-${(centerPoint || location).longitude}`}
            center={{
              latitude: (centerPoint || location).latitude,
              longitude: (centerPoint || location).longitude,
            }}
            radius={radius * 1000}
            strokeWidth={4}
            strokeColor={centerPoint ? "#FF5722" : "#424242"}
            fillColor={centerPoint ? "rgba(255, 87, 34, 0.2)" : "rgba(66, 66, 66, 0.2)"}
          />
        )}

        {/* Custom Center Point Marker - BIG BLUE CIRCLE */}
        {centerPoint && (
          <Marker
            coordinate={{ latitude: centerPoint.latitude, longitude: centerPoint.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.centerPointCircleMarker}>
              <View style={styles.centerPointCircleInner}>
                <Text style={styles.centerPointIcon}>⊕</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Greedy-filtered markers based on zoom + score */}
        {visibleMarkers
          .filter(dest => showMockData || !dest.isMockData) // Filter mock data based on toggle
          .filter(dest => !showOnlyBadges || (dest.badges && dest.badges.length > 0)) // Filter by badges if toggle active
          .map((dest, index) => (
          <Marker
            key={`${dest.lat}-${dest.lon}-${index}`}
            coordinate={{ latitude: dest.lat, longitude: dest.lon }}
            onPress={() => handleMarkerPress(dest)}
          >
            <View style={[
              styles.markerContainer, 
              { backgroundColor: getWeatherColor(dest.condition) },
              dest.isCurrentLocation && styles.currentLocationMarker,
              dest.isCenterPoint && styles.centerPointMarker
            ]}>
              <Text style={styles.markerWeatherIcon}>{getWeatherIcon(dest.condition)}</Text>
              <Text style={styles.markerTemp}>
                {dest.temperature !== null && dest.temperature !== undefined 
                  ? Math.round(dest.temperature) 
                  : '?'}°
              </Text>
              
              {/* Stability arrows DISABLED - too complicated for users
              <View style={[
                styles.stabilityBadge, 
                dest.isCurrentLocation && styles.currentLocationBadge,
                dest.isCenterPoint && styles.centerPointBadge
              ]}>
                <Text style={styles.stabilityText}>{getStabilitySymbol(dest)}</Text>
              </View>
              */}
              
              {/* Badge overlays (stacked vertically on right side) with animations */}
              {dest.badges && dest.badges.length > 0 && (
                <View style={styles.badgeOverlayContainer}>
                  {dest.badges
                    .sort((a, b) => (BadgeMetadata[a]?.priority || 99) - (BadgeMetadata[b]?.priority || 99)) // Sort by priority
                    .slice(0, 6) // Max 6 badges per marker
                    .map((badge, badgeIndex) => (
                      <AnimatedBadge
                        key={badgeIndex}
                        icon={BadgeMetadata[badge].icon}
                        color={BadgeMetadata[badge].color}
                        delay={badgeIndex * 100} // Stagger animation for multiple badges
                      />
                    ))}
                </View>
              )}
            </View>
          </Marker>
        ))}

        {/* Weather Warnings - DISABLED */}
      </MapView>

      {/* Loading Overlay for destinations */}
      {loadingDestinations && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingOverlayText, { color: theme.text }]}>
              {t('map.loadingLocation')}...
            </Text>
          </View>
        </View>
      )}

      {/* Empty state when trophy filter is active but no places */}
      {showOnlyBadges && !loadingDestinations && visibleMarkers.filter(dest => dest.badges && dest.badges.length > 0).length === 0 && (
        <View style={[styles.emptyStateOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
          <View style={[styles.emptyStateBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.emptyStateIcon}>🏆</Text>
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>Keine sonnigen Orte verfügbar</Text>
            <Text style={[styles.emptyStateMessage, { color: theme.textSecondary }]}>
              Entweder Radius erweitern oder Filter deaktivieren
            </Text>
          </View>
        </View>
      )}

      {/* Favourites Button */}
      <TouchableOpacity
        style={[styles.favouritesButton, { 
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}
        onPress={() => navigation.navigate('Favourites')}
        accessibilityLabel={t('app.favourites')}
        accessibilityRole="button"
        accessibilityHint="View your saved favourite destinations"
      >
        <Text style={styles.favouritesIcon}>⭐</Text>
      </TouchableOpacity>

      {/* Mock Data Toggle Button (temp for testing) */}
      <TouchableOpacity
        style={[styles.mockToggleButton, { 
          backgroundColor: showMockData ? theme.primary : theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}
        onPress={() => setShowMockData(!showMockData)}
        accessibilityLabel={showMockData ? 'Hide mock data' : 'Show mock data'}
        accessibilityRole="switch"
        accessibilityState={{ checked: showMockData }}
        accessibilityHint="Toggle display of test data"
      >
        <Text style={[styles.mockToggleIcon, { color: showMockData ? '#fff' : theme.text }]}>🎲</Text>
      </TouchableOpacity>

      {/* Badge Filter Toggle Button */}
      <TouchableOpacity
        style={[styles.badgeToggleButton, { 
          backgroundColor: showOnlyBadges ? '#FFD700' : theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
          opacity: 1.0, // Always fully visible
        }]}
        onPress={() => {
          setShowOnlyBadges(!showOnlyBadges);
          playTickSound();
        }}
        accessibilityLabel={showOnlyBadges ? 'Show all destinations' : 'Show only special destinations'}
        accessibilityRole="switch"
        accessibilityState={{ checked: showOnlyBadges }}
        accessibilityHint="Filter to show only destinations with special badges"
      >
        <Text style={[styles.badgeToggleIcon, { 
          color: showOnlyBadges ? '#000' : theme.text,
          opacity: 1.0, // Always fully visible
        }]}>🏆</Text>
      </TouchableOpacity>

      {/* Smart Spacing Toggle Button - REMOVED (now always active based on zoom) */}

      {/* Warnings Toggle Button - REMOVED */}

      {/* Settings Button */}
      <TouchableOpacity
        style={[styles.settingsButton, { 
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}
        onPress={() => navigation.navigate('Settings')}
        accessibilityLabel={t('app.settings')}
        accessibilityRole="button"
        accessibilityHint="Open app settings"
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Search Button - DISABLED (MapSearchBar component missing) */}
      {/* {!showSearch && (
        <TouchableOpacity
          style={[styles.searchButton, { 
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow
          }]}
          onPress={() => {
            setShowSearch(true);
            playTickSound();
          }}
          accessibilityLabel="Search destinations"
          accessibilityRole="button"
          accessibilityHint="Open search to find destinations by name"
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      )} */}

      {/* Reset Center Button (only show if centerPoint is set) */}
      {centerPoint && (
        <TouchableOpacity
          style={[styles.resetCenterButton, { 
            backgroundColor: '#FF5722',
            borderColor: '#fff',
            shadowColor: theme.shadow
          }]}
          onPress={resetCenterPoint}
          accessibilityLabel="Reset center point"
          accessibilityRole="button"
          accessibilityHint="Reset map center to your current location"
        >
          <Text style={styles.resetCenterIcon}>📍</Text>
          <Text style={styles.resetCenterText}>↺</Text>
        </TouchableOpacity>
      )}

      {/* Collapsible Controls */}
      <View style={styles.controlsWrapper}>
        <TouchableOpacity
          style={[styles.controlsToggle, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow
          }]}
          onPress={() => setControlsExpanded(!controlsExpanded)}
          accessibilityLabel={controlsExpanded ? 'Hide filters' : 'Show filters'}
          accessibilityRole="button"
          accessibilityHint="Toggle weather and radius filter controls"
          accessibilityState={{ expanded: controlsExpanded }}
        >
          <Text style={[styles.controlsToggleText, { color: theme.text }]}>
            {controlsExpanded ? '▼ Filter' : '▶ Filter'}
          </Text>
        </TouchableOpacity>
        
        {controlsExpanded && (
          <View style={[styles.controlsContainer, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow
          }]}>
            <DateFilter
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
            
            <View style={styles.filterSeparator} />
            
            <WeatherFilter
              selectedCondition={selectedCondition}
              onConditionChange={setSelectedCondition}
            />
          </View>
        )}
      </View>

      <View style={styles.radiusControlsWrapper}>
        {showRadiusMenu && (
          <View style={[styles.radiusPresetMenu, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow
          }]}>
            {[200, 400, 1000, 2000].map((radiusOption) => (
              <TouchableOpacity
                key={radiusOption}
                style={[styles.radiusPresetItem, radiusOption === radius && styles.radiusPresetItemActive]}
                onPress={() => handleRadiusSelect(radiusOption)}
              >
                <Text style={[
                  styles.radiusPresetText,
                  { color: radiusOption === radius ? theme.primary : theme.text }
                ]}>
                  {radiusOption} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.radiusDisplay, {
            backgroundColor: theme.surface,
            borderColor: showRadiusMenu ? theme.primary : theme.border,
            shadowColor: theme.shadow
          }]}
          onPress={() => setShowRadiusMenu(!showRadiusMenu)}
          accessibilityLabel={t('radius.title')}
          accessibilityRole="button"
        >
          <Text style={[styles.radiusLabel, { color: theme.textTertiary }]}>{t('radius.title')}</Text>
          <Text style={[styles.radiusDisplayText, { color: theme.text }]}>{radius} km</Text>
        </TouchableOpacity>
        <View style={[styles.radiusControls, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}>
          {/* + Button */}
          <TouchableOpacity
            style={[styles.radiusButton, styles.radiusButtonTop, {
              backgroundColor: theme.background
            }]}
            onPress={handleRadiusIncrease}
            accessibilityLabel={t('radius.more')}
            accessibilityRole="button"
            accessibilityHint={`Increase search radius from ${radius} km`}
          >
            <Text style={[styles.radiusButtonText, { color: theme.text }]}>+</Text>
            <Text style={[styles.radiusButtonLabel, { color: theme.textSecondary }]}>{t('radius.more')}</Text>
          </TouchableOpacity>
          
          {/* - Button */}
          <TouchableOpacity
            style={[styles.radiusButton, styles.radiusButtonBottom, {
              backgroundColor: theme.background
            }]}
            onPress={handleRadiusDecrease}
            accessibilityLabel={t('radius.less')}
            accessibilityRole="button"
            accessibilityHint={`Decrease search radius from ${radius} km`}
          >
            <Text style={[styles.radiusButtonText, { color: theme.text }]}>−</Text>
            <Text style={[styles.radiusButtonLabel, { color: theme.textSecondary }]}>{t('radius.less')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Left Buttons Container */}
      <View style={styles.bottomLeftButtons}>
        {/* Reverse Mode Button (Warm/Cold) */}
        <TouchableOpacity
          style={[styles.reverseButton, {
            backgroundColor: reverseMode === 'warm' ? '#FF6B35' : '#2196F3',
            borderColor: '#fff',
            shadowColor: theme.shadow
          }]}
          onPress={toggleReverseMode}
          accessibilityLabel={`Reverse mode: ${reverseMode}`}
          accessibilityRole="button"
          accessibilityHint="Toggle between rewarding warm or cold places"
        >
          <Text style={styles.reverseIcon}>🌡️</Text>
        </TouchableOpacity>

        {/* Radius Shape Button */}
        <TouchableOpacity
          style={[styles.radiusShapeButton, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow
          }]}
          onPress={toggleRadiusShape}
          onLongPress={() => {
            playTickSound();
            // TODO: Implement rotation on long press
          }}
          accessibilityLabel={`Radius shape: ${radiusShape}`}
          accessibilityRole="button"
          accessibilityHint="Tap to change shape, long press to rotate"
        >
          <Text style={[styles.radiusShapeIcon, { color: theme.text }]}>
            {radiusShape === 'circle' ? '⭕' : radiusShape === 'half' ? '◐' : '◔'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2E7D32" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
  },
  controlsWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 80,
  },
  controlsToggle: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlsToggleText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  controlsContainer: {
    marginTop: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  markerContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationMarker: {
    borderColor: '#2196F3',
    borderWidth: 4,
  },
  markerWeatherIcon: {
    fontSize: 28,
  },
  markerTemp: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stabilityBadge: {
    position: 'absolute',
    bottom: -18,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationBadge: {
    backgroundColor: '#2196F3',
  },
  centerPointMarker: {
    borderColor: '#FF5722',
    borderWidth: 4,
  },
  centerPointBadge: {
    backgroundColor: '#FF5722',
  },
  centerPointCircleMarker: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(33, 150, 243, 0.3)', // Blau mit Transparenz
    borderWidth: 4,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  centerPointCircleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPointIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stabilityText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  badgeOverlayContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    flexDirection: 'column',
    gap: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  zoomLoadingIndicator: {
    position: 'absolute',
    top: 80,
    left: '50%',
    marginLeft: -15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingBox: {
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  radiusControlsWrapper: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    alignItems: 'center',
  },
  radiusDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 3,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    alignItems: 'center',
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  radiusDisplayText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  radiusControls: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  radiusButton: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  radiusButtonTop: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  radiusButtonBottom: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  radiusButtonText: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 28,
  },
  radiusButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  radiusPresetMenu: {
    position: 'absolute',
    bottom: 160,
    right: 0,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 140,
    zIndex: 1000,
  },
  radiusPresetItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  radiusPresetItemActive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  radiusPresetText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomLeftButtons: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    flexDirection: 'row',
    gap: 12,
  },
  reverseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  reverseIcon: {
    fontSize: 26,
  },
  radiusShapeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  radiusShapeIcon: {
    fontSize: 28,
  },
  favouritesButton: {
    position: 'absolute',
    top: 84,
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  favouritesIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  mockToggleButton: {
    position: 'absolute',
    top: 158,
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  mockToggleIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  badgeToggleButton: {
    position: 'absolute',
    top: 232, // Below mock toggle (158 + 64 + 10)
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  badgeToggleIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  warningsToggleButton: {
    position: 'absolute',
    top: 306, // Below badge toggle (232 + 64 + 10)
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  warningsToggleIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  spacingToggleButton: {
    position: 'absolute',
    top: 306, // Below badge toggle (232 + 64 + 10) - moved up since warnings removed
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  spacingToggleIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  warningMarkerContainer: {
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 70,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 8,
  },
  warningIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  warningSeverityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700', // GELB
    borderRadius: 6, // Etwas eckiger
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000', // SCHWARZ
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 10,
  },
  warningSeverityText: {
    color: '#000', // SCHWARZES AUSRUFEZEICHEN
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -2,
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  settingsIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  searchButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  searchIcon: {
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 36,
    includeFontPadding: false,
    marginTop: 4,
  },
  resetCenterButton: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  resetCenterIcon: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: -4,
  },
  resetCenterText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: -2,
  },
  crosshairMarker: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 87, 34, 0.8)',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  crosshairText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Allow interaction with map behind
  },
  emptyStateBox: {
    padding: 30,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default MapScreen;



