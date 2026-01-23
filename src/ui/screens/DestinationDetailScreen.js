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

const DestinationDetailScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { destination } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);

  const loadForecast = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If destination already has all forecast data (mock data or complete data), use it directly
      if (destination.forecast) {
        setForecast(destination);
        setIsLoading(false);
        return;
      }
      
      // Fetch from Supabase if destination has an ID
      if (destination.id) {
        try {
          const { place, forecast: forecastData, error: fetchError } = await getPlaceDetail(destination.id);
          
          if (fetchError || !place) {
            throw new Error(fetchError || 'Failed to fetch place detail');
          }
          
          // Convert Supabase forecast data to expected format
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
              } : {
                condition: place.condition,
                temp: place.temperature + 1,
                high: place.temperature + 4,
                low: place.temperature - 2,
              },
              day3: forecastData[2] ? {
                condition: forecastData[2].condition,
                temp: Math.round((forecastData[2].tempMin + forecastData[2].tempMax) / 2),
                high: forecastData[2].tempMax,
                low: forecastData[2].tempMin,
              } : {
                condition: place.condition,
                temp: place.temperature,
                high: place.temperature + 3,
                low: place.temperature - 3,
              },
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
          }
          
          setForecast(convertedForecast);
          setIsLoading(false);
          return;
        } catch (fetchError) {
          console.warn(`⚠️ Supabase fetch failed for ${destination.name}, using fallback:`, fetchError);
        }
      }
      
      // Fallback: Use destination data with generated forecast
      setForecast({
        ...destination,
        forecast: {
          today: { condition: destination.condition, temp: destination.temperature, high: destination.temperature + 3, low: destination.temperature - 3 },
          tomorrow: { condition: destination.condition, temp: destination.temperature + 1, high: destination.temperature + 4, low: destination.temperature - 2 },
          day3: { condition: destination.condition, temp: destination.temperature, high: destination.temperature + 3, low: destination.temperature - 3 },
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

  // Translate weather condition
  const translateCondition = (description) => {
    if (!description) return '';
    const desc = description.toLowerCase();
    
    // Map English conditions to translation keys
    if (desc.includes('clear')) return t('weather.conditions.clearSky');
    if (desc.includes('few clouds')) return t('weather.conditions.fewClouds');
    if (desc.includes('scattered clouds')) return t('weather.conditions.scatteredClouds');
    if (desc.includes('broken clouds')) return t('weather.conditions.brokenClouds');
    if (desc.includes('overcast')) return t('weather.conditions.overcastClouds');
    if (desc.includes('light rain') || desc.includes('slight rain')) return t('weather.conditions.lightRain');
    if (desc.includes('moderate rain')) return t('weather.conditions.moderateRain');
    if (desc.includes('heavy rain') || desc.includes('intense rain')) return t('weather.conditions.heavyRain');
    if (desc.includes('light snow') || desc.includes('slight snow')) return t('weather.conditions.lightSnow');
    if (desc.includes('moderate snow')) return t('weather.conditions.moderateSnow');
    if (desc.includes('heavy snow') || desc.includes('intense snow')) return t('weather.conditions.heavySnow');
    if (desc.includes('sleet')) return t('weather.conditions.sleet');
    if (desc.includes('drizzle')) return t('weather.conditions.drizzle');
    if (desc.includes('thunderstorm') || desc.includes('thunder')) return t('weather.conditions.thunderstorm');
    if (desc.includes('mist')) return t('weather.conditions.mist');
    if (desc.includes('fog')) return t('weather.conditions.fog');
    
    // Fallback to original if no match
    return description;
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

  // Check if we need dark text (for cold/light backgrounds like snow)
  const needsDarkText = () => {
    const condition = forecast.condition?.toLowerCase() || '';
    return condition.includes('snow') || condition.includes('ice') || condition.includes('freezing');
  };

  const useDarkText = needsDarkText();
  const textColor = useDarkText ? '#2b3e50' : '#fff';
  const subtitleColor = useDarkText ? '#4a5f6d' : 'rgba(255,255,255,0.9)';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: getWeatherColor(forecast.condition) }]}>
        {/* Großes Hintergrund-Icon */}
        <Text style={styles.headerBgIcon}>{getWeatherIcon(forecast.condition)}</Text>
        
        {/* Obere Zeile: Name & Temperatur */}
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={2}>{forecast.name}</Text>
          <Text style={[styles.headerTemp, { color: textColor }]}>{Math.round(forecast.temperature)}°</Text>
        </View>
        
        {/* Untere Zeile: Description */}
        <Text style={[styles.headerSubtitle, { color: subtitleColor }]}>{translateCondition(forecast.description)}</Text>
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
              <Text style={[styles.statValue, { color: theme.text }]}>{forecast.windSpeed || 0} km/h</Text>
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
              
              // Animated Badge Card
              const AnimatedBadgeCard = () => {
                const fadeAnim = React.useRef(new Animated.Value(0)).current;
                const slideAnim = React.useRef(new Animated.Value(50)).current;
                const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
                
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
                
                return (
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
                            💨 ETA: {worthData.eta}h ({Math.round(destination.distance)}km)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            📈 Wetter-Gewinn: +{worthData.delta} Punkte
                          </Text>
                          <Text style={[styles.badgeStat, { color: metadata.color }]}>
                            ⭐ Value Score: {worthData.value} pts/h
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
                            💨 ETA: {worthBudgetData.eta}h ({Math.round(destination.distance)}km)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            📈 Wetter-Gewinn: +{worthBudgetData.delta} Punkte
                          </Text>
                          <Text style={[styles.badgeStat, { color: metadata.color }]}>
                            ⭐ Value Score: {worthBudgetData.value} pts/h
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
                            ☀️ Bedingungen: {warmDryData.condition}
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            💨 Wind: {warmDryData.windSpeed} km/h
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
                            💨 Wind: {beachData.windSpeed} km/h
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
                            🌡️ Temperatur: {miracleData.tempOrigin}°C → {miracleData.tempDest}°C (+{miracleData.tempDelta}°C)
                          </Text>
                          <Text style={[styles.badgeStat, { color: theme.primary }]}>
                            ☀️ {miracleData.conditionOrigin} → {miracleData.conditionDest}
                          </Text>
                          <Text style={[styles.badgeStat, { color: metadata.color }]}>
                            ⚡ Verbesserung: {miracleData.improvement} Punkte
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
                            ☀️ Heute: {weatherCurseData.todayTemp}°C, {weatherCurseData.todayCondition}
                          </Text>
                          <Text style={[styles.badgeStat, { color: '#D65A2E' }]}>
                            ⚠️ Bald: {weatherCurseData.futureTempMin}°C, {weatherCurseData.futureCondition} (-{weatherCurseData.tempLoss}°C!)
                          </Text>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                );
              };
              
              return <AnimatedBadgeCard key={index} />;
            })}
          </View>
        )}

        <View style={[styles.forecastSection, {
          backgroundColor: theme.surface,
          shadowColor: theme.shadow
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('destination.forecast')}</Text>
          
          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.today')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast.today.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast.today.high}° / {forecast.forecast.today.low}°
            </Text>
          </View>

          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.tomorrow')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast.tomorrow.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast.tomorrow.high}° / {forecast.forecast.tomorrow.low}°
            </Text>
          </View>

          <View style={[styles.forecastItem, { borderBottomColor: theme.background }]}>
            <Text style={[styles.forecastDay, { color: theme.text }]}>{t('destination.day3')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast.day3.condition)}</Text>
            <Text style={[styles.forecastTemp, { color: theme.textSecondary }]}>
              {forecast.forecast.day3.high}° / {forecast.forecast.day3.low}°
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.driveButton, {
              backgroundColor: theme.primary,
              shadowColor: theme.primary
            }]}
            onPress={handleDriveThere}
          >
            <Text style={styles.driveButtonText}>{t('destination.driveThere')}</Text>
          </TouchableOpacity>

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
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerBgIcon: {
    position: 'absolute',
    fontSize: 110,
    top: '55%',
    left: '56%',
    transform: [{ translateX: -55 }, { translateY: -55 }],
    opacity: 0.4,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    maxWidth: '65%',
    flexShrink: 1,
  },
  headerTemp: {
    fontSize: 64,
    fontWeight: '300',
    letterSpacing: -2,
  },
  headerSubtitle: {
    fontSize: 16,
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
    padding: 20,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  forecastIcon: {
    fontSize: 40,
    width: 60,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 80,
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
