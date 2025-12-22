import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { getWeatherIcon, getWeatherColor } from '../services/weatherService';

const DestinationDetailScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { destination } = route.params;

  const handleDriveThere = () => {
    const { lat, lon } = destination;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${lat},${lon}`;
    const label = destination.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    Linking.openURL(url).catch((err) => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { backgroundColor: getWeatherColor(destination.condition) }]}>
        <Text style={styles.headerIcon}>{getWeatherIcon(destination.condition)}</Text>
        <Text style={styles.headerTitle}>{destination.name}</Text>
        <Text style={styles.headerSubtitle}>{destination.description}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <View style={styles.tempContainer}>
            <Text style={styles.tempValue}>{destination.temperature}°</Text>
            <Text style={styles.tempUnit}>C</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('destination.stability')}</Text>
              <Text style={styles.statValue}>{destination.stability}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('destination.humidity')}</Text>
              <Text style={styles.statValue}>{destination.humidity}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('destination.wind')}</Text>
              <Text style={styles.statValue}>{destination.windSpeed} km/h</Text>
            </View>
          </View>
        </View>

        <View style={styles.forecastSection}>
          <Text style={styles.sectionTitle}>{t('destination.forecast')}</Text>
          
          <View style={styles.forecastItem}>
            <Text style={styles.forecastDay}>{t('destination.today')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(destination.forecast.today.condition)}</Text>
            <Text style={styles.forecastTemp}>
              {destination.forecast.today.high}° / {destination.forecast.today.low}°
            </Text>
          </View>

          <View style={styles.forecastItem}>
            <Text style={styles.forecastDay}>{t('destination.tomorrow')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(destination.forecast.tomorrow.condition)}</Text>
            <Text style={styles.forecastTemp}>
              {destination.forecast.tomorrow.high}° / {destination.forecast.tomorrow.low}°
            </Text>
          </View>

          <View style={styles.forecastItem}>
            <Text style={styles.forecastDay}>{t('destination.day3')}</Text>
            <Text style={styles.forecastIcon}>{getWeatherIcon(destination.forecast.day3.condition)}</Text>
            <Text style={styles.forecastTemp}>
              {destination.forecast.day3.high}° / {destination.forecast.day3.low}°
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

