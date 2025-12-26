import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const themes = {
  standard: {
    id: 'standard',
    primary: '#2E7D32',
    primaryDark: '#1B5E20',
    primaryLight: '#4CAF50',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#333333',
    textTertiary: '#666666',
    border: '#424242',
    error: '#D32F2F',
    success: '#2E7D32',
    shadow: '#000000',
  },
  light: {
    id: 'light',
    primary: '#757575',
    primaryDark: '#424242',
    primaryLight: '#9E9E9E',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#212121',
    textTertiary: '#757575',
    border: '#E0E0E0',
    error: '#D32F2F',
    success: '#4CAF50',
    shadow: '#000000',
  },
  dark: {
    id: 'dark',
    primary: '#90CAF9',
    primaryDark: '#42A5F5',
    primaryLight: '#BBDEFB',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#E0E0E0',
    textTertiary: '#BDBDBD',
    border: '#424242',
    error: '#EF5350',
    success: '#66BB6A',
    shadow: '#000000',
  },
  blue: {
    id: 'blue',
    primary: '#1976D2',
    primaryDark: '#0D47A1',
    primaryLight: '#42A5F5',
    background: '#E3F2FD',
    surface: '#FFFFFF',
    text: '#0D47A1',
    textSecondary: '#1565C0',
    textTertiary: '#1976D2',
    border: '#1976D2',
    error: '#D32F2F',
    success: '#1976D2',
    shadow: '#0D47A1',
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('standard');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const changeTheme = async (themeId) => {
    try {
      await AsyncStorage.setItem('appTheme', themeId);
      setCurrentTheme(themeId);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};


