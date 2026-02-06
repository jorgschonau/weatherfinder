import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getWeatherIcon, getWeatherColor } from '../../usecases/weatherUsecases';
import { openInMaps, NavigationProvider } from '../../usecases/navigationUsecases';
import { getPlaceDetail } from '../../services/placesWeatherService';
import { toggleFavourite, isDestinationFavourite } from '../../usecases/favouritesUsecases';
import { BadgeMetadata } from '../../domain/destinationBadge';
import { getCountryName } from '../../utils/countryNames';

// Convert wind speed (km/h) to descriptive text
const getWindDescription = (windSpeed) => {
  const speed = windSpeed || 0;
  if (speed <= 10) return 'Windstill';
  if (speed <= 20) return 'Leichte Brise';
  if (speed <= 35) return 'Mäßiger Wind';
  if (speed <= 50) return 'Starker Wind';
  return 'Sturm';
};

const DestinationDetailScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { destination } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);
  const [expandedBadges, setExpandedBadges] = useState({});

  const loadForecast = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If destination already has all forecast data (mock data or complete data), use it directly
      if (destination.forecast) {
        // Ensure forecast has the expected structure with high/low (5 days)
        const normalizedForecast = {
          today: destination.forecast.today ? {
            ...destination.forecast.today,
            high: destination.forecast.today.high ?? Math.round(destination.forecast.today.temp || destination.temperature || 0),
            low: destination.forecast.today.low ?? Math.round((destination.forecast.today.temp || destination.temperature || 0) - 3),
          } : { condition: destination.condition, high: destination.temperature, low: destination.temperature - 3 },
          tomorrow: destination.forecast.tomorrow ? {
            ...destination.forecast.tomorrow,
            high: destination.forecast.tomorrow.high ?? Math.round(destination.forecast.tomorrow.temp || 0),
            low: destination.forecast.tomorrow.low ?? Math.round((destination.forecast.tomorrow.temp || 0) - 3),
          } : null,
          day3: destination.forecast.day3 || destination.forecast.day2 ? {
            ...(destination.forecast.day3 || destination.forecast.day2),
            high: (destination.forecast.day3?.high || destination.forecast.day2?.high) ?? Math.round((destination.forecast.day3?.temp || destination.forecast.day2?.temp || 0)),
            low: (destination.forecast.day3?.low || destination.forecast.day2?.low) ?? Math.round((destination.forecast.day3?.temp || destination.forecast.day2?.temp || 0) - 3),
          } : null,
          day4: destination.forecast.day4 ? {
            ...destination.forecast.day4,
            high: destination.forecast.day4.high ?? Math.round(destination.forecast.day4.temp || 0),
            low: destination.forecast.day4.low ?? Math.round((destination.forecast.day4.temp || 0) - 3),
          } : null,
          day5: destination.forecast.day5 ? {
            ...destination.forecast.day5,
            high: destination.forecast.day5.high ?? Math.round(destination.forecast.day5.temp || 0),
            low: destination.forecast.day5.low ?? Math.round((destination.forecast.day5.temp || 0) - 3),
          } : null,
        };
        
        setForecast({
          ...destination,
          description: destination.description || destination.weatherDescription || `${destination.condition} conditions`,
          countryCode: destination.countryCode || destination.country_code,
          country_code: destination.country_code || destination.countryCode,
          country: destination.country,
          forecast: normalizedForecast,
        });
        setIsLoading(false);
        return;
      }
      
      // Fetch from Supabase if destination has an ID
      if (destination.id) {
        try {
          const { place, forecast: forecastData, error: fetchError } = await getPlaceDetail(destination.id, i18n.language);
          
          if (fetchError || !place) {
            throw new Error(fetchError || 'Failed to fetch place detail');
          }
          
          // Convert Supabase forecast data to expected format (5 days)
          const convertedForecast = {
            ...place,
            name: destination.name, // Keep original name
            description: place.weatherDescription || `${place.condition} conditions`,
            forecast: {
              today: forecastData[0] ? {
                condition: forecastData[0].condition,
                temp: Math.round((forecastData[0].tempMin + forecastData[0].tempMax) / 2),
                high: forecastData[0].tempMax,
                low: forecastData[0].tempMin,
              } : {
                condition: place.condition,
                temp: place.temperature,
                high: place.temperature + 3,
                low: place.temperature - 3,
              },
              tomorrow: forecastData[1] ? {
                condition: forecastData[1].condition,
                temp: Math.round((forecastData[1].tempMin + forecastData[1].tempMax) / 2),
                high: forecastData[1].tempMax,
                low: forecastData[1].tempMin,
              } : null,
              day3: forecastData[2] ? {
                condition: forecastData[2].condition,
                temp: Math.round((forecastData[2].tempMin + forecastData[2].tempMax) / 2),
                high: forecastData[2].tempMax,
                low: forecastData[2].tempMin,
              } : null,
              day4: forecastData[3] ? {
                condition: forecastData[3].condition,
                temp: Math.round((forecastData[3].tempMin + forecastData[3].tempMax) / 2),
                high: forecastData[3].tempMax,
                low: forecastData[3].tempMin,
              } : null,
              day5: forecastData[4] ? {
                condition: forecastData[4].condition,
                temp: Math.round((forecastData[4].tempMin + forecastData[4].tempMax) / 2),
                high: forecastData[4].tempMax,
                low: forecastData[4].tempMin,
              } : null,
            },
          };
          
          // IMPORTANT: Keep badges from original destination (calculated on map)
          if (destination.badges) {
            convertedForecast.badges = destination.badges;
            convertedForecast._worthTheDriveData = destination._worthTheDriveData;
            convertedForecast._worthTheDriveBudgetData = destination._worthTheDriveBudgetData;
            convertedForecast._warmAndDryData = destination._warmAndDryData;
            convertedForecast._beachParadiseData = destination._beachParadiseData;
            convertedForecast._sunnyStreakData = destination._sunnyStreakData;
            convertedForecast._weatherMiracleData = destination._weatherMiracleData;
            convertedForecast._heatwaveData = destination._heatwaveData;
            convertedForecast._snowKingData = destination._snowKingData;
            convertedForecast._rainyDaysData = destination._rainyDaysData;
            convertedForecast._weatherCurseData = destination._weatherCurseData;
            convertedForecast._springAwakeningData = destination._springAwakeningData;
          }
          
          setForecast(convertedForecast);
          setIsLoading(false);
          return;
        } catch (fetchError) {
          console.warn(`⚠️ Supabase fetch failed for ${destination.name}, using fallback:`, fetchError);
        }
      }
      
      // Fallback: Use destination data with generated forecast (5 days)
      setForecast({
        ...destination,
        description: destination.description || destination.weatherDescription || `${destination.condition} conditions`,
        countryCode: destination.countryCode || destination.country_code,
        country_code: destination.country_code || destination.countryCode,
        forecast: {
          today: { condition: destination.condition, temp: destination.temperature, high: destination.temperature + 3, low: destination.temperature - 3 },
          tomorrow: { condition: destination.condition, temp: destination.temperature + 1, high: destination.temperature + 4, low: destination.temperature - 2 },
          day3: { condition: destination.condition, temp: destination.temperature, high: destination.temperature + 3, low: destination.temperature - 3 },
          day4: { condition: destination.condition, temp: destination.temperature - 1, high: destination.temperature + 2, low: destination.temperature - 4 },
          day5: { condition: destination.condition, temp: destination.temperature, high: destination.temperature + 3, low: destination.temperature - 3 },
        }
      });
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError(err.message || t('destination.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
    checkFavouriteStatus();
  }, [destination.lat, destination.lon]);

  const checkFavouriteStatus = async () => {
    const status = await isDestinationFavourite(destination.lat, destination.lon);
    setIsFavourite(status);
  };

  const handleToggleFavourite = async () => {
    if (favouriteLoading) return;
    
    setFavouriteLoading(true);
    try {
      const result = await toggleFavourite(forecast || destination);
      setIsFavourite(result.isFavourite);
      
      // Show success message
      Alert.alert(
        result.isFavourite ? t('favourites.addedToFavourites') : t('favourites.removedFromFavourites'),
        '',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
      Alert.alert(t('map.error'), 'Failed to update favourites');
    } finally {
      setFavouriteLoading(false);
    }
  };

  const handleDriveThere = async () => {
    try {
      // TODO: Add motor sound (real audio, not haptics) when starting navigation
      // Requires: expo-av Audio.Sound with engine.mp3/wav file
      
      await openInMaps(destination, NavigationProvider.AUTO);
    } catch (error) {
      Alert.alert(
        t('destination.navigationError'),
        t('destination.navigationErrorMessage'),
        [{ text: 'OK' }]
      );
      console.error('Navigation error:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>{t('destination.loading')}</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorTitle, { color: theme.error }]}>{t('destination.errorTitle')}</Text>
        <Text style={[styles.errorMessage, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.primary }]} 
          onPress={loadForecast}
        >
          <Text style={styles.retryButtonText}>{t('destination.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Data state (forecast is loaded)
  if (!forecast) {
    return null;
  }

  // Convert old "Weather code XX" to proper description (for legacy DB data)
  const fixWeatherCodeDescription = (description) => {
    if (!description) return '';
    
    // Check for "Weather code XX" pattern
    const match = description.match(/Weather code (\d+)/i);
    if (match) {
      const code = parseInt(match[1]);
      const codeDescriptions = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Foggy', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
      };
      return codeDescriptions[code] || description;
    }
    
    return description;
  };

  // Translate weather condition
  const translateCondition = (description) => {
    if (!description) return '';
    
    // First, fix any legacy "Weather code XX" entries
    const fixedDesc = fixWeatherCodeDescription(description);
    
    // Try direct translation from weather.descriptions (exact match)
    const directTranslation = t(`weather.descriptions.${fixedDesc}`, { defaultValue: null });
    if (directTranslation && directTranslation !== `weather.descriptions.${fixedDesc}`) {
      return directTranslation;
    }
    
    const desc = fixedDesc.toLowerCase();
    
    // Map English conditions to translation keys
    if (desc.includes('mainly clear')) return t('weather.conditions.mainlyClear');
    if (desc.includes('partly cloudy')) return t('weather.conditions.partlyCloudy');
    if (desc === 'clear sky' || desc === 'clear') return t('weather.conditions.clearSky');
    if (desc.includes('few clouds')) return t('weather.conditions.fewClouds');
    if (desc.includes('scattered clouds')) return t('weather.conditions.scatteredClouds');
    if (desc.includes('broken clouds')) return t('weather.conditions.brokenClouds');
    if (desc.includes('overcast')) return t('weather.conditions.overcast');
    if (desc.includes('foggy') || desc.includes('rime fog')) return t('weather.conditions.foggy');
    if (desc.includes('freezing drizzle')) return t('weather.conditions.lightFreezingDrizzle');
    if (desc.includes('dense drizzle')) return t('weather.conditions.denseDrizzle');
    if (desc.includes('light drizzle')) return t('weather.conditions.lightDrizzle');
    if (desc.includes('moderate drizzle')) return t('weather.conditions.moderateDrizzle');
    if (desc.includes('drizzle')) return t('weather.conditions.drizzle');
    if (desc.includes('freezing rain')) return t('weather.conditions.lightFreezingRain');
    if (desc.includes('violent rain') || desc.includes('heavy rain showers')) return t('weather.conditions.violentRainShowers');
    if (desc.includes('moderate rain showers')) return t('weather.conditions.moderateRainShowers');
    if (desc.includes('slight rain showers') || desc.includes('light rain showers')) return t('weather.conditions.slightRainShowers');
    if (desc.includes('light rain') || desc.includes('slight rain')) return t('weather.conditions.slightRain');
    if (desc.includes('moderate rain')) return t('weather.conditions.moderateRain');
    if (desc.includes('heavy rain') || desc.includes('intense rain')) return t('weather.conditions.heavyRain');
    if (desc.includes('snow grains')) return t('weather.conditions.snowGrains');
    if (desc.includes('heavy snow showers')) return t('weather.conditions.heavySnowShowers');
    if (desc.includes('slight snow showers') || desc.includes('light snow showers')) return t('weather.conditions.slightSnowShowers');
    if (desc.includes('light snow') || desc.includes('slight snow')) return t('weather.conditions.slightSnow');
    if (desc.includes('moderate snow')) return t('weather.conditions.moderateSnow');
    if (desc.includes('heavy snow') || desc.includes('intense snow')) return t('weather.conditions.heavySnow');
    if (desc.includes('sleet')) return t('weather.conditions.sleet');
    if (desc.includes('thunderstorm') && desc.includes('heavy hail')) return t('weather.conditions.thunderstormHeavyHail');
    if (desc.includes('thunderstorm') && desc.includes('hail')) return t('weather.conditions.thunderstormSlightHail');
    if (desc.includes('thunderstorm') || desc.includes('thunder')) return t('weather.conditions.thunderstorm');
    if (desc.includes('mist')) return t('weather.conditions.mist');
    if (desc.includes('fog')) return t('weather.conditions.fog');
    
    // Simple condition names (from badge calculations)
    if (desc === 'sunny') return t('weather.sunny');
    if (desc === 'cloudy') return t('weather.cloudy');
    if (desc === 'rainy') return t('weather.rainy');
    if (desc === 'snowy') return t('weather.snowy');
    if (desc === 'windy') return t('weather.windy');
    
    // Fallback to fixed description if no translation match
    return fixedDesc;
  };

  // Format ETA in H:MM format, rounded to 5 minutes
  const formatETA = (decimalHours) => {
    if (!decimalHours || decimalHours <= 0) return '0:00';
    
    const totalMinutes = Math.round(decimalHours * 60);
    // Round to nearest 5 minutes
    const roundedMinutes = Math.round(totalMinutes / 5) * 5;
    
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate sunshine hours from condition
  const getSunshineHours = () => {
    const condition = forecast.condition?.toLowerCase() || '';
    if (condition.includes('clear') || condition.includes('sunny')) return '8-10';
    if (condition.includes('partly') || condition.includes('few clouds')) return '6-8';
    if (condition.includes('cloud')) return '4-6';
    if (condition.includes('rain') || condition.includes('storm')) return '2-4';
    return '6-8';
  };

  /**
   * Find the best day from the forecast
   * Scoring: sunny condition + highest temperature
   */
  const findBestDay = () => {
    if (!forecast?.forecast) return null;
    
    const conditionScore = (condition) => {
      if (!condition) return 0;
      const c = condition.toLowerCase();
      if (c === 'sunny' || c.includes('clear')) return 100;
      if (c === 'cloudy' || c.includes('partly')) return 60;
      if (c.includes('overcast')) return 40;
      if (c.includes('wind')) return 30;
      if (c.includes('rain') || c.includes('snow')) return 10;
      return 50;
    };
    
    const days = [
      { key: 'today', label: t('destination.today'), data: forecast.forecast.today },
      { key: 'tomorrow', label: t('destination.tomorrow'), data: forecast.forecast.tomorrow },
      { key: 'day3', label: t('destination.day3'), data: forecast.forecast.day3 },
      { key: 'day4', label: t('destination.day4', { defaultValue: 'Tag 4' }), data: forecast.forecast.day4 },
      { key: 'day5', label: t('destination.day5', { defaultValue: 'Tag 5' }), data: forecast.forecast.day5 },
    ].filter(d => d.data);
    
    if (days.length === 0) return null;
    
    // Calculate score for each day: condition (60%) + temperature (40%)
    const scored = days.map(day => {
      const temp = day.data.high ?? day.data.temp ?? 0;
      const cond = conditionScore(day.data.condition);
      // Normalize temp: 0°C = 0, 30°C = 100
      const tempNormalized = Math.max(0, Math.min(100, (temp / 30) * 100));
      const score = cond * 0.6 + tempNormalized * 0.4;
      return { ...day, score, temp, condition: day.data.condition };
    });
    
    // Find highest scoring day
    const best = scored.reduce((a, b) => a.score > b.score ? a : b);
    
    return best;
  };

  const bestDay = findBestDay();

  // Check if we need dark text (for cold/light backgrounds like snow or sunny+freezing)
  const needsDarkText = () => {
    const condition = forecast.condition?.toLowerCase() || '';
    const temp = forecast.temperature;
    
    // Snow/ice conditions always need dark text
    if (condition.includes('snow') || condition.includes('ice') || condition.includes('freezing')) {
      return true;
    }
    
    // Sunny but freezing (< 0°C) also uses light blue background → dark text
    if (condition === 'sunny' && temp !== null && temp !== undefined && temp < 0) {
      return true;
    }
    
    return false;
  };

  const useDarkText = needsDarkText();
  const textColor = useDarkText ? '#2b3e50' : '#fff';
  const subtitleColor = useDarkText ? '#4a5f6d' : 'rgba(255,255,255,0.9)';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: getWeatherColor(forecast.condition, forecast.temperature) }]}>
        {/* Großes Hintergrund-Icon */}
        <Text style={styles.headerBgIcon}>{getWeatherIcon(forecast.condition)}</Text>
        
        {/* Obere Zeile: Name & Temperatur */}
        <View style={styles.headerTop}>
          <View style={styles.headerNameContainer}>
            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={2}>{forecast.name}</Text>
            {(forecast.countryCode || forecast.country_code) && (
              <Text style={[styles.headerCountry, { color: subtitleColor }]}>
                {getCountryName(forecast.countryCode || forecast.country_code, i18n.language || 'en')}
              </Text>
            )}
          </View>
          <Text style={[styles.headerTemp, { color: textColor }]}>{Math.round(forecast.temperature)}°</Text>
        </View>
        
        {/* Untere Zeile: Description */}
        <Text style={[styles.headerSubtitle, { color: subtitleColor }]}>{translateCondition(forecast.description)}</Text>
        {/* TEMP DEBUG: Show attractiveness score */}
        <Text style={[styles.headerSubtitle, { color: subtitleColor, marginTop: 4, fontSize: 12, opacity: 0.7 }]}>
          Score: {forecast.attractivenessScore || forecast.attractiveness_score || destination.attractivenessScore || destination.attractiveness_score || '?'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.mainInfo, { 
          backgroundColor: theme.surface,
          shadowColor: theme.shadow
        }]}>
          <View style={[styles.statsContainer, { borderTopColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sonne</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{getSunshineHours()} Std</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('destination.humidity')}</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{forecast.humidity || 0}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('destination.wind')}</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{getWindDescription(forecast.windSpeed)}</Text>
            </View>
          </View>
        </View>

        {/* Badge Section */}
        {destination.badges && destination.badges.length > 0 && (
          <View style={[styles.badgeSection, {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            borderColor: theme.border
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Auszeichnungen</Text>
            {destination.badges
              .sort((a, b) => (BadgeMetadata[a]?.priority || 99) - (BadgeMetadata[b]?.priority || 99)) // Sort by priority
              .map((badge, index) => {
              const metadata = BadgeMetadata[badge];
              const worthData = destination._worthTheDriveData;
              const worthBudgetData = destination._worthTheDriveBudgetData;
              const warmDryData = destination._warmAndDryData;
              const beachData = destination._beachParadiseData;
              const sunnyStreakData = destination._sunnyStreakData;
              const miracleData = destination._weatherMiracleData;
              const heatwaveData = destination._heatwaveData;
              const snowKingData = destination._snowKingData;
              const rainyDaysData = destination._rainyDaysData;
              const weatherCurseData = destination._weatherCurseData;
              const springAwakeningData = destination._springAwakeningData;
              
              // Determine which badge type
              const isWorthTheDrive = badge === 'WORTH_THE_DRIVE';
              const isWorthTheDriveBudget = badge === 'WORTH_THE_DRIVE_BUDGET';
              const isWarmAndDry = badge === 'WARM_AND_DRY';
              const isBeachParadise = badge === 'BEACH_PARADISE';
              const isSunnyStreak = badge === 'SUNNY_STREAK';
              const isWeatherMiracle = badge === 'WEATHER_MIRACLE';
              const isHeatwave = badge === 'HEATWAVE';
              const isSnowKing = badge === 'SNOW_KING';
              const isRainyDays = badge === 'RAINY_DAYS';
              const isWeatherCurse = badge === 'WEATHER_CURSE';
              const isSpringAwakening = badge === 'SPRING_AWAKENING';
              
              // Get summary text for collapsed state
              const getSummaryText = () => {
                if (isWorthTheDrive && worthData) {
                  return `+${worthData.tempDelta}°C | ${Math.round(destination.distance)}km`;
                }
                if (isWorthTheDriveBudget && worthBudgetData) {
                  return `+${worthBudgetData.tempDelta}°C | ${Math.round(destination.distance)}km`;
                }
                if (isWarmAndDry && warmDryData) {
                  return `${warmDryData.temp}°C | ${translateCondition(warmDryData.condition)}`;
                }
                if (isBeachParadise && beachData) {
                  return `${beachData.temp}°C | ${beachData.sunnyDays} Sonnentage`;
                }
                if (isSunnyStreak && sunnyStreakData) {
                  return `${sunnyStreakData.streakLength} Tage ☀️ | Ø ${sunnyStreakData.avgTemp}°C`;
                }
                if (isWeatherMiracle && miracleData) {
                  return `+${Math.round(miracleData.tempGain)}°C bald ☀️`;
                }
                if (isHeatwave && heatwaveData) {
                  return `${heatwaveData.days} Tage 🔥 | Ø ${heatwaveData.avgTemp}°C`;
                }
                if (isSnowKing && snowKingData) {
                  return `${snowKingData.snowDays} Tage ❄️ | ${snowKingData.totalSnowfall}cm`;
                }
                if (isRainyDays && rainyDaysData) {
                  return `${rainyDaysData.rainyDays} Regentage`;
                }
                if (isWeatherCurse && weatherCurseData) {
                  return `⚠️ ${weatherCurseData.tempLoss}°C Verlust bald!`;
                }
                if (isSpringAwakening && springAwakeningData) {
                  return `+${springAwakeningData.tempDelta}°C | ${Math.round(springAwakeningData.distance)}km`;
                }
                return 'Tap für Details';
              };
              
              // Animated Badge Card
              const AnimatedBadgeCard = () => {
                const fadeAnim = React.useRef(new Animated.Value(0)).current;
                const slideAnim = React.useRef(new Animated.Value(50)).current;
                const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
                const isExpanded = expandedBadges[badge] || false;
                
                React.useEffect(() => {
                  fadeAnim.setValue(0);
                  slideAnim.setValue(50);
                  scaleAnim.setValue(0.8);
                  
                  Animated.parallel([
                    Animated.timing(fadeAnim, {
                      toValue: 1,
                      duration: 600,
                      delay: index * 200,
                      useNativeDriver: true,
                    }),
                    Animated.spring(slideAnim, {
                      toValue: 0,
                      tension: 40,
                      friction: 6,
                      delay: index * 200,
                      useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                      toValue: 1,
                      tension: 40,
                      friction: 6,
                      delay: index * 200,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }, [destination, badge]);
                
                const toggleExpand = () => {
                  setExpandedBadges(prev => ({
                    ...prev,
                    [badge]: !prev[badge]
                  }));
                };
                
                return (
                  <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7}>
                    <Animated.View 
                      style={[
                        styles.badgeCard, 
                        { backgroundColor: theme.background },
                        {
                          opacity: fadeAnim,
                          transform: [
                            { translateX: slideAnim },
                            { scale: scaleAnim }
                          ],
                        }
                      ]}
                    >
                      <View style={[styles.badgeIconContainer, { backgroundColor: metadata.color }]}>
                        <Text style={styles.badgeCardIcon}>{metadata.icon}</Text>
                      </View>
                      <View style={styles.badgeContent}>
                        <Text style={[styles.badgeName, { color: theme.text }]}>
                          {t(`badges.${badge.toLowerCase().replace(/_/g, '')}`)}
                        </Text>
                        
                        {/* Collapsed: Show summary */}
                        {!isExpanded && (
                          <Text style={[styles.badgeSummary, { color: theme.textSecondary }]}>
                            {getSummaryText()}
                          </Text>
                        )}
                        
                        {/* Expanded: Show description and details */}
                        {isExpanded && (
                          <>
                            <Text style={[styles.badgeDescription, { color: theme.textSecondary }]}>
                              {t(`badges.${badge.toLowerCase().replace(/_/g, '')}Description`)}
                            </Text>
                            
                            {/* Worth the Drive stats */}
                            {isWorthTheDrive && worthData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Temperatur: {worthData.tempOrigin}°C → {worthData.tempDest}°C (+{worthData.tempDelta}°C)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            💨 ETA: {formatETA(worthData.eta)} ({Math.round(destination.distance)}km)
                          </Text>
                        </View>
                      )}
                      
                      {/* Worth the Drive Budget stats */}
                      {isWorthTheDriveBudget && worthBudgetData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Temperatur: {worthBudgetData.tempOrigin}°C → {worthBudgetData.tempDest}°C (+{worthBudgetData.tempDelta}°C)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            💨 ETA: {formatETA(worthBudgetData.eta)} ({Math.round(destination.distance)}km)
                          </Text>
                        </View>
                      )}
                      
                      {/* Warm & Dry stats */}
                      {isWarmAndDry && warmDryData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Temperatur: {warmDryData.temp}°C (Rang #{warmDryData.tempRank})
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            ☀️ Bedingungen: {translateCondition(warmDryData.condition)}
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            💨 {getWindDescription(warmDryData.windSpeed)}
                          </Text>
                        </View>
                      )}
                      
                      {/* Beach Paradise stats */}
                      {isBeachParadise && beachData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Temperatur: {beachData.temp}°C
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            ☀️ {beachData.sunnyDays} sonnige Tage
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            💨 {getWindDescription(beachData.windSpeed)}
                          </Text>
                        </View>
                      )}
                      
                      {/* Sunny Streak stats */}
                      {isSunnyStreak && sunnyStreakData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: metadata.color }]}>
                            ☀️ {sunnyStreakData.streakLength} Tage Sonnenschein
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            🌡️ Ø {sunnyStreakData.avgTemp}°C
                          </Text>
                        </View>
                      )}
                      
                      {/* Weather Miracle stats */}
                      {isWeatherMiracle && miracleData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Heute: {Math.round(miracleData.todayTemp)}°C → Bald: {Math.round(miracleData.futureTempMax)}°C (+{Math.round(miracleData.tempGain)}°C)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            ☀️ {translateCondition(miracleData.todayCondition)} → {miracleData.futureCondition}
                          </Text>
                        </View>
                      )}
                      
                      {/* Heatwave stats */}
                      {isHeatwave && heatwaveData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: metadata.color }]}>
                            🔥 {heatwaveData.days} Tage Hitzewelle
                          </Text>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Ø {heatwaveData.avgTemp}°C (Max {heatwaveData.maxTemp}°C)
                          </Text>
                        </View>
                      )}
                      
                      {/* Snow King stats */}
                      {isSnowKing && snowKingData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: metadata.color }]}>
                            ❄️ {snowKingData.snowDays} Tage Schnee
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            📊 {snowKingData.totalSnowfall} cm Gesamtschneefall
                          </Text>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Ø {snowKingData.avgTemp}°C
                          </Text>
                        </View>
                      )}
                      
                      {/* Rainy Days stats */}
                      {isRainyDays && rainyDaysData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            🌧️ {rainyDaysData.rainyDays} Regentage
                          </Text>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            💧 Starkregen: {rainyDaysData.hasHeavyRain ? 'Ja' : 'Nein'}
                          </Text>
                        </View>
                      )}
                      
                      {/* Weather Curse stats */}
                      {isWeatherCurse && weatherCurseData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#4CAF50' }]}>
                            ☀️ Heute: {weatherCurseData.todayTemp}°C, {translateCondition(weatherCurseData.todayCondition)}
                          </Text>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            ⚠️ Bald: {weatherCurseData.futureTempMin}°C, {translateCondition(weatherCurseData.futureCondition)} (-{weatherCurseData.tempLoss}°C!)
                          </Text>
                        </View>
                      )}
                      
                      {/* Spring Awakening stats */}
                      {isSpringAwakening && springAwakeningData && (
                        <View style={styles.badgeStats}>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            🌡️ Temperatur: {springAwakeningData.tempOrigin}°C → {springAwakeningData.tempDest}°C (+{springAwakeningData.tempDelta}°C)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            💨 ETA: {springAwakeningData.eta}h ({Math.round(springAwakeningData.distance)}km)
                          </Text>
                        </View>
                      )}
                          </>
                        )}
                      </View>
                      <Text style={[styles.badgeExpandIndicator, { color: theme.textSecondary }]}>
                        {isExpanded ? '▲' : '▼'}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                );
              };
              
              return <AnimatedBadgeCard key={index} />;
            })}
          </View>
        )}

        {/* Dorthin fahren Button - nach Badges */}
        <TouchableOpacity
          style={[styles.driveButtonTop, {
            backgroundColor: theme.primary,
            shadowColor: theme.primary
          }]}
          onPress={handleDriveThere}
        >
          <Text style={styles.driveButtonTopText}>{t('destination.driveThere')}</Text>
        </TouchableOpacity>

        <View style={[styles.forecastSection, {
          backgroundColor: theme.surface,
          shadowColor: theme.shadow
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('destination.forecast')}</Text>
          
          {/* Best Day Highlight */}
          {bestDay && (
            <View style={[styles.bestDayContainer, { backgroundColor: '#FFF8E1', borderColor: '#FFD54F' }]}>
              <Text style={styles.bestDayIcon}>⭐</Text>
              <View style={styles.bestDayContent}>
                <Text style={styles.bestDayLabel}>Bester Tag</Text>
                <Text style={styles.bestDayValue}>
                  {bestDay.label} ({Math.round(bestDay.temp)}°C, {translateCondition(bestDay.condition)})
                </Text>
              </View>
              <Text style={styles.bestDayWeatherIcon}>{getWeatherIcon(bestDay.condition)}</Text>
            </View>
          )}
          
          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.today')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast?.today?.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast?.today?.high ?? forecast.temperature ?? '?'}° / {forecast.forecast?.today?.low ?? (forecast.temperature ? forecast.temperature - 3 : '?')}°
            </Text>
          </View>

          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.tomorrow')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast?.tomorrow?.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast?.tomorrow?.high ?? '?'}° / {forecast.forecast?.tomorrow?.low ?? '?'}°
            </Text>
          </View>

          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.day3')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast?.day3?.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast?.day3?.high ?? '?'}° / {forecast.forecast?.day3?.low ?? '?'}°
            </Text>
          </View>

          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.day4', { defaultValue: 'Tag 4' })}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast?.day4?.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast?.day4?.high ?? '?'}° / {forecast.forecast?.day4?.low ?? '?'}°
            </Text>
          </View>

          <View style={[styles.forecastItem, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.day5', { defaultValue: 'Tag 5' })}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast?.day5?.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast?.day5?.high ?? '?'}° / {forecast.forecast?.day5?.low ?? '?'}°
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.favouriteButton, {
              backgroundColor: isFavourite ? theme.primary : theme.surface,
              borderColor: theme.primary
            }]}
            onPress={handleToggleFavourite}
            disabled={favouriteLoading}
          >
            {favouriteLoading ? (
              <ActivityIndicator size="small" color={isFavourite ? '#fff' : theme.primary} />
            ) : (
              <Text style={[styles.favouriteButtonText, { color: isFavourite ? '#fff' : theme.primary }]}>
                {isFavourite ? '⭐' : '☆'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    minHeight: 64,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  header: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 140,
  },
  headerBgIcon: {
    position: 'absolute',
    fontSize: 90,
    top: '50%',
    left: '80%',
    transform: [{ translateX: -45 }, { translateY: -45 }],
    opacity: 0.35,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    zIndex: 1,
  },
  headerNameContainer: {
    flexShrink: 1,
    maxWidth: '65%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerCountry: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.9,
  },
  headerTemp: {
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: -2,
  },
  headerSubtitle: {
    fontSize: 15,
    zIndex: 1,
  },
  content: {
    padding: 20,
  },
  mainInfo: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 0,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  forecastSection: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  badgeSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeCardIcon: {
    fontSize: 32,
  },
  badgeContent: {
    flex: 1,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  badgeStats: {
    marginTop: 4,
  },
  badgeStat: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  badgeSummary: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  badgeExpandIndicator: {
    fontSize: 12,
    position: 'absolute',
    right: 16,
    top: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  driveButtonTop: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  driveButtonTopText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  bestDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 12,
  },
  bestDayIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  bestDayContent: {
    flex: 1,
  },
  bestDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B8860B',
    marginBottom: 1,
  },
  bestDayValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5D4037',
  },
  bestDayWeatherIcon: {
    fontSize: 26,
    marginLeft: 6,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  forecastIcon: {
    fontSize: 30,
    width: 45,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 75,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 24,
    marginBottom: 30,
  },
  favouriteButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    minHeight: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  favouriteButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  driveButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    minHeight: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  driveButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DestinationDetailScreen;
