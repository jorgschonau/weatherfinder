import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getWeatherForRadius, getWeatherIcon, getWeatherColor } from '../../usecases/weatherUsecases';
import RadiusSelector from '../components/RadiusSelector';
import WeatherFilter from '../components/WeatherFilter';
import OnboardingOverlay from '../components/OnboardingOverlay';

const MapScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [radius, setRadius] = useState(400); // Default 400km
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('standard'); // standard, satellite, hybrid, terrain, mutedStandard
  const [controlsExpanded, setControlsExpanded] = useState(true); // Controls einklappbar
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMockData, setShowMockData] = useState(true); // Toggle for mock data (temp for testing)

  useEffect(() => {
    (async () => {
      // Check if first time user
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('map.error'), t('map.locationNotAvailable'));
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 2,
        longitudeDelta: 2,
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (location) {
      loadDestinations();
      // Adjust map region when radius changes
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: (radius * 2) / 111,
          longitudeDelta: (radius * 2) / (111 * Math.cos(location.latitude * Math.PI / 180)),
        }, 600); // Langsamere Animation (600ms statt 500ms)
      }
    }
  }, [location, radius, selectedCondition]);

  const loadDestinations = async () => {
    if (!location) return;
    
    setLoading(true);
    try {
      const weatherData = await getWeatherForRadius(
        location.latitude,
        location.longitude,
        radius,
        selectedCondition
      );
      setDestinations(weatherData);
    } catch (error) {
      Alert.alert(t('map.error'), t('map.failedToLoadWeather'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (destination) => {
    navigation.navigate('DestinationDetail', { destination });
  };

  const handleRadiusIncrease = () => {
    const newRadius = radius + 10;
    setRadius(Math.min(newRadius, 5000)); // Max 5000 km
  };

  const handleRadiusDecrease = () => {
    const newRadius = radius - 10;
    setRadius(Math.max(newRadius, 10)); // Min 10 km
  };

  const handleCloseOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const getStabilitySymbol = (stability) => {
    if (stability >= 75) return '='; // Stabil
    if (stability >= 55) return '↑'; // Tendenz besser
    return '↓'; // Tendenz schlechter
  };

  const toggleMapType = () => {
    const mapTypes = ['standard', 'mutedStandard', 'satellite', 'hybrid', 'terrain'];
    const currentIndex = mapTypes.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % mapTypes.length;
    setMapType(mapTypes[nextIndex]);
  };

  const getMapTypeLabel = () => {
    return t(`mapType.${mapType}`, { defaultValue: t('mapType.standard') });
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
      
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: (radius * 2) / 111,
          longitudeDelta: (radius * 2) / (111 * Math.cos(location.latitude * Math.PI / 180)),
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {location && (
          <Circle
            key={`radius-circle-${radius}-${location.latitude}-${location.longitude}`}
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={radius * 1000}
            strokeWidth={4}
            strokeColor="#424242"
            fillColor="rgba(66, 66, 66, 0.2)"
          />
        )}
        {destinations
          .filter(dest => showMockData || !dest.isMockData) // Filter mock data based on toggle
          .map((dest, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: dest.lat, longitude: dest.lon }}
            onPress={() => handleMarkerPress(dest)}
          >
            <View style={[
              styles.markerContainer, 
              { backgroundColor: getWeatherColor(dest.condition) },
              dest.isCurrentLocation && styles.currentLocationMarker
            ]}>
              <Text style={styles.markerWeatherIcon}>{getWeatherIcon(dest.condition)}</Text>
              <Text style={styles.markerTemp}>{dest.temperature}°</Text>
              <View style={[styles.stabilityBadge, dest.isCurrentLocation && styles.currentLocationBadge]}>
                <Text style={styles.stabilityText}>{getStabilitySymbol(dest.stability)}</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Favourites Button */}
      <TouchableOpacity
        style={[styles.favouritesButton, { 
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}
        onPress={() => navigation.navigate('Favourites')}
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
      >
        <Text style={[styles.mockToggleIcon, { color: showMockData ? '#fff' : theme.text }]}>🎲</Text>
      </TouchableOpacity>

      {/* Settings Button */}
      <TouchableOpacity
        style={[styles.settingsButton, { 
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Collapsible Controls */}
      <View style={styles.controlsWrapper}>
        <TouchableOpacity
          style={[styles.controlsToggle, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow
          }]}
          onPress={() => setControlsExpanded(!controlsExpanded)}
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
            <RadiusSelector selectedRadius={radius} onRadiusChange={setRadius} />
            <WeatherFilter
              selectedCondition={selectedCondition}
              onConditionChange={setSelectedCondition}
            />
          </View>
        )}
      </View>

      <View style={styles.radiusControlsWrapper}>
        <View style={[styles.radiusDisplay, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}>
          <Text style={[styles.radiusLabel, { color: theme.textTertiary }]}>{t('radius.title')}</Text>
          <Text style={[styles.radiusDisplayText, { color: theme.text }]}>{radius} km</Text>
        </View>
        <View style={[styles.radiusControls, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}>
          <TouchableOpacity
            style={[styles.radiusButton, styles.radiusButtonTop, {
              backgroundColor: theme.background
            }]}
            onPress={handleRadiusIncrease}
          >
            <Text style={[styles.radiusButtonText, { color: theme.text }]}>+</Text>
            <Text style={[styles.radiusButtonLabel, { color: theme.textSecondary }]}>{t('radius.more')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radiusButton, styles.radiusButtonBottom, {
              backgroundColor: theme.background
            }]}
            onPress={handleRadiusDecrease}
          >
            <Text style={[styles.radiusButtonText, { color: theme.text }]}>−</Text>
            <Text style={[styles.radiusButtonLabel, { color: theme.textSecondary }]}>{t('radius.less')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.mapTypeButton, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }]}
        onPress={toggleMapType}
      >
        <Text style={[styles.mapTypeIcon, { color: theme.text }]}>⧉</Text>
      </TouchableOpacity>

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
  stabilityText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  radiusButtonBottom: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
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
  mapTypeButton: {
    position: 'absolute',
    bottom: 50,
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
  mapTypeIcon: {
    fontSize: 36,
    textAlign: 'center',
    marginTop: 4,
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
});

export default MapScreen;



