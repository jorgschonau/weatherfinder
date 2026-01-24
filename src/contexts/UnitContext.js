import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Unit preferences: distance, temperature, wind speed, precipitation
 */
const UnitContext = createContext();

export const UnitProvider = ({ children }) => {
  const [distanceUnit, setDistanceUnit] = useState('km'); // 'km' or 'miles'
  const [temperatureUnit, setTemperatureUnit] = useState('celsius'); // 'celsius' or 'fahrenheit'
  const [windSpeedUnit, setWindSpeedUnit] = useState('kmh'); // 'kmh', 'mph', 'ms', 'beaufort'
  const [precipitationUnit, setPrecipitationUnit] = useState('mm'); // 'mm' or 'inches'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences on mount
  useEffect(() => {
    loadUnitPreferences();
  }, []);

  const loadUnitPreferences = async () => {
    try {
      const savedDistance = await AsyncStorage.getItem('distanceUnit');
      const savedTemperature = await AsyncStorage.getItem('temperatureUnit');
      const savedWindSpeed = await AsyncStorage.getItem('windSpeedUnit');
      const savedPrecipitation = await AsyncStorage.getItem('precipitationUnit');
      
      if (savedDistance) {
        setDistanceUnit(savedDistance);
      }
      if (savedTemperature) {
        setTemperatureUnit(savedTemperature);
      }
      if (savedWindSpeed) {
        setWindSpeedUnit(savedWindSpeed);
      }
      if (savedPrecipitation) {
        setPrecipitationUnit(savedPrecipitation);
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

  const setWindSpeedUnitAndSave = async (unit) => {
    try {
      setWindSpeedUnit(unit);
      await AsyncStorage.setItem('windSpeedUnit', unit);
    } catch (error) {
      console.warn('Failed to save wind speed unit:', error);
    }
  };

  const setPrecipitationUnitAndSave = async (unit) => {
    try {
      setPrecipitationUnit(unit);
      await AsyncStorage.setItem('precipitationUnit', unit);
    } catch (error) {
      console.warn('Failed to save precipitation unit:', error);
    }
  };

  const value = {
    distanceUnit,
    temperatureUnit,
    windSpeedUnit,
    precipitationUnit,
    setDistanceUnit: setDistanceUnitAndSave,
    setTemperatureUnit: setTemperatureUnitAndSave,
    setWindSpeed: setWindSpeedUnitAndSave,
    setPrecipitation: setPrecipitationUnitAndSave,
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
