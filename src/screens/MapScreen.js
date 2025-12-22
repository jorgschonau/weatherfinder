import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { getWeatherForRadius, getWeatherIcon, getWeatherColor } from '../services/weatherService';
import RadiusSelector from '../components/RadiusSelector';
import WeatherFilter from '../components/WeatherFilter';

const MapScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [radius, setRadius] = useState(400); // Default 400km
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('standard'); // standard, satellite, hybrid, terrain, mutedStandard

  useEffect(() => {
    (async () => {
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
        }, 500);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>{t('map.loadingLocation')}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{t('map.locationNotAvailable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        {destinations.map((dest, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: dest.lat, longitude: dest.lon }}
            onPress={() => handleMarkerPress(dest)}
          >
            <View style={[styles.markerContainer, { backgroundColor: getWeatherColor(dest.condition) }]}>
              <Text style={styles.markerWeatherIcon}>{getWeatherIcon(dest.condition)}</Text>
              <Text style={styles.markerTemp}>{dest.temperature}°</Text>
              <View style={styles.stabilityBadge}>
                <Text style={styles.stabilityText}>{dest.stability}%</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.controlsContainer}>
        <RadiusSelector selectedRadius={radius} onRadiusChange={setRadius} />
        <WeatherFilter
          selectedCondition={selectedCondition}
          onConditionChange={setSelectedCondition}
        />
      </View>

      <View style={styles.radiusControls}>
        <TouchableOpacity
          style={[styles.radiusButton, styles.radiusButtonTop]}
          onPress={handleRadiusIncrease}
        >
          <Text style={styles.radiusButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radiusButton, styles.radiusButtonBottom]}
          onPress={handleRadiusDecrease}
        >
          <Text style={styles.radiusButtonText}>−</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.mapTypeButton}
        onPress={toggleMapType}
      >
        <Text style={styles.mapTypeButtonText}>{getMapTypeLabel()}</Text>
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
  },
  controlsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
  markerWeatherIcon: {
    fontSize: 29,
  },
  markerTemp: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: -5,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  stabilityBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  stabilityText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
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
  radiusControls: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#424242',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  radiusButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
    fontSize: 22,
    fontWeight: '600',
    color: '#212121',
    lineHeight: 22,
  },
  mapTypeButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#424242',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  mapTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
});

export default MapScreen;

