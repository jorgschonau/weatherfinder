import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { getWeatherIcon, getWeatherColor } from '../../usecases/weatherUsecases';
import { openInMaps, NavigationProvider } from '../../usecases/navigationUsecases';
import { fetchDetailedForecast } from '../../providers/weatherProvider';

const DestinationDetailScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { destination } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);

  const loadForecast = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchDetailedForecast(
        destination.lat,
        destination.lon,
        destination.name
      );
      
      setForecast(data);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError(err.message || t('destination.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [destination.lat, destination.lon]);

  const handleDriveThere = async () => {
    try {
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>{t('destination.loading')}</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('destination.errorTitle')}</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadForecast}>
          <Text style={styles.retryButtonText}>{t('destination.retry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonTextError}>{t('destination.backToMap')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Data state (forecast is loaded)
  if (!forecast) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { backgroundColor: getWeatherColor(forecast.condition) }]}>
        <Text style={styles.headerIcon}>{getWeatherIcon(forecast.condition)}</Text>
        <Text style={styles.headerTitle}>{forecast.name}</Text>
        <Text style={styles.headerSubtitle}>{forecast.description}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <View style={styles.tempContainer}>
            <Text style={styles.tempValue}>{forecast.temperature}°</Text>
            <Text style={styles.tempUnit}>C</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('destination.stability')}</Text>
              <Text style={styles.statValue}>{forecast.stability}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('destination.humidity')}</Text>
              <Text style={styles.statValue}>{forecast.humidity}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('destination.wind')}</Text>
              <Text style={styles.statValue}>{forecast.windSpeed} km/h</Text>
            </View>
          </View>
        </View>

        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>{t('destination.forecast')}</Text>
          
          <View style={styles.forecastItem}>
            <Text style={styles.forecastDay}>{t('destination.today')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast.today.condition)}</Text>
            <Text style={styles.forecastTemp}>
              {forecast.forecast.today.high}° / {forecast.forecast.today.low}°
            </Text>
          </View>

          <View style={styles.forecastItem}>
            <Text style={styles.forecastDay}>{t('destination.tomorrow')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast.tomorrow.condition)}</Text>
            <Text style={styles.forecastTemp}>
              {forecast.forecast.tomorrow.high}° / {forecast.forecast.tomorrow.low}°
            </Text>
          </View>

          <View style={styles.forecastItem}>
            <Text style={styles.forecastDay}>{t('destination.day3')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(forecast.forecast.day3.condition)}</Text>
            <Text style={styles.forecastTemp}>
              {forecast.forecast.day3.high}° / {forecast.forecast.day3.low}°
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>{t('destination.backToMap')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.driveButton}
            onPress={handleDriveThere}
          >
            <Text style={styles.driveButtonText}>{t('destination.driveThere')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonError: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backButtonTextError: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  mainInfo: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tempValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  tempUnit: {
    fontSize: 24,
    color: '#666',
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  forecastSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  forecastIcon: {
    fontSize: 32,
    marginHorizontal: 15,
  },
  forecastTemp: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  driveButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  driveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default DestinationDetailScreen;


