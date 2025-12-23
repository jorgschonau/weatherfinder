import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getWeatherIcon, getWeatherColor } from '../../usecases/weatherUsecases';

const WEATHER_CONDITIONS = [
  { value: null, key: 'all', icon: '🌍' },
  { value: 'sunny', key: 'sunny', icon: '☀️' },
  { value: 'cloudy', key: 'cloudy', icon: '☁️' },
  { value: 'rainy', key: 'rainy', icon: '🌧️' },
  { value: 'snowy', key: 'snowy', icon: '❄️' },
  { value: 'windy', key: 'windy', icon: '💨' },
];

const WeatherFilter = ({ selectedCondition, onConditionChange }) => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('weather.type')}</Text>
      <View style={styles.optionsContainer}>
        {WEATHER_CONDITIONS.map((condition) => (
          <TouchableOpacity
            key={condition.value || 'all'}
            style={[
              styles.option,
              selectedCondition === condition.value && styles.optionSelected,
            ]}
            onPress={() => onConditionChange(condition.value)}
          >
            <Text style={styles.optionIcon}>{condition.icon}</Text>
            <Text
              style={[
                styles.optionText,
                selectedCondition === condition.value && styles.optionTextSelected,
              ]}
            >
              {t(`weather.${condition.key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  optionIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  optionTextSelected: {
    color: '#1976D2',
  },
});

export default WeatherFilter;


