import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DATE_PRESETS = [
  { value: 'today', label: 'Heute' },
  { value: 'tomorrow', label: 'Morgen' },
  { value: 'plus3', label: '+3' },
  { value: 'plus5', label: '+5' },
];

const DateFilter = ({ selectedDate, onDateChange }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Datum</Text>
      <View style={styles.optionsWrapper}>
        {DATE_PRESETS.map((preset, index) => {
          const isSelected = selectedDate === preset.value;
          const isLongButton = index < 2; // "Heute" und "Morgen"
          return (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.option,
                isLongButton ? styles.optionLong : styles.optionShort,
                isSelected && styles.optionSelected
              ]}
              onPress={() => onDateChange(preset.value)}
            >
              <Text style={[
                styles.optionText,
                isSelected && styles.optionTextSelected
              ]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 10,
  },
  optionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976D2',
    backgroundColor: 'white',
    padding: 4,
    gap: 6,
  },
  option: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLong: {
    flex: 1.5,
  },
  optionShort: {
    flex: 0.75,
  },
  optionSelected: {
    backgroundColor: '#1976D2',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  optionTextSelected: {
    color: 'white',
  },
});

export default DateFilter;
