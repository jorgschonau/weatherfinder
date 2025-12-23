import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { getWeatherIcon, getWeatherColor } from '../../usecases/weatherUsecases';

const WEATHER_CONDITIONS = [
  { value: null, key: 'all', icon: '🌍' },
  { value: 'sunny', key: 'sunny', icon: '☀️' },
  { value: 'rainy', key: 'rainy', icon: '🌧️' },
  { value: 'snowy', key: 'snowy', icon: '❄️' },
  { value: 'windy', key: 'windy', icon: '💨' },
];

const WeatherFilter = ({ selectedCondition, onConditionChange }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{t('weather.type')}</Text>
      <View style={styles.optionsContainer}>
        {WEATHER_CONDITIONS.map((condition) => (
          <TouchableOpacity
            key={condition.value || 'all'}
            style={[
              styles.option,
              { 
                backgroundColor: theme.background,
                borderColor: selectedCondition === condition.value ? theme.primary : 'transparent'
              }
            ]}
            onPress={() => onConditionChange(condition.value)}
          >
            <Text style={styles.optionIcon}>{condition.icon}</Text>
            <Text
              style={[
                styles.optionText,
                { color: theme.textSecondary },
                selectedCondition === condition.value && { 
                  color: theme.primary,
                  fontWeight: '700'
                },
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 3,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 6,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WeatherFilter;



