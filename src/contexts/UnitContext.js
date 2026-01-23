import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Unit preferences: distance (km/miles) and temperature (celsius/fahrenheit)
 */
const UnitContext = createContext();

export const UnitProvider = ({ children }) => {
  const [distanceUnit, setDistanceUnit] = useState('km'); // 'km' or 'miles'
  const [temperatureUnit, setTemperatureUnit] = useState('celsius'); // 'celsius' or 'fahrenheit'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences on mount
  useEffect(() => {
    loadUnitPreferences();
  }, []);

  const loadUnitPreferences = async () => {
    try {
      const savedDistance = await AsyncStorage.getItem('distanceUnit');
      const savedTemperature = await AsyncStorage.getItem('temperatureUnit');
      
      if (savedDistance) {
        setDistanceUnit(savedDistance);
      }
      if (savedTemperature) {
        setTemperatureUnit(savedTemperature);
      }
    } catch (error) {
      console.warn('Failed to load unit preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setDistanceUnitAndSave = async (unit) => {
    try {
      setDistanceUnit(unit);
      await AsyncStorage.setItem('distanceUnit', unit);
    } catch (error) {
      console.warn('Failed to save distance unit:', error);
    }
  };

  const setTemperatureUnitAndSave = async (unit) => {
    try {
      setTemperatureUnit(unit);
      await AsyncStorage.setItem('temperatureUnit', unit);
    } catch (error) {
      console.warn('Failed to save temperature unit:', error);
    }
  };

  const value = {
    distanceUnit,
    temperatureUnit,
    setDistanceUnit: setDistanceUnitAndSave,
    setTemperatureUnit: setTemperatureUnitAndSave,
    isLoading,
  };

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
};

export const useUnits = () => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnits must be used within a UnitProvider');
  }
  return context;
};
