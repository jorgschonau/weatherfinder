import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SplashScreen from 'expo-splash-screen';

import MapScreen from './src/ui/screens/MapScreen';
import SettingsScreen from './src/ui/screens/SettingsScreen';
import CommunityScreen from './src/ui/screens/CommunityScreen';
import DestinationDetailScreen from './src/ui/screens/DestinationDetailScreen';
import FavouritesScreen from './src/ui/screens/FavouritesScreen';

import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import './src/i18n';
import { useTranslation } from 'react-i18next';

const Stack = createStackNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    const prepare = async () => {
      // Keep splash screen visible for 2.5 seconds (0.5 sec longer fade-out)
      await new Promise(resolve => setTimeout(resolve, 2500));
      await SplashScreen.hideAsync();
    };
    prepare();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Map"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{
            title: t('app.title'),
            headerBackTitle: t('app.back'),
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('app.settings'),
            headerBackTitle: t('app.back'),
          }}
        />
        <Stack.Screen
          name="Community"
          component={CommunityScreen}
          options={{
            title: t('app.community'),
            headerBackTitle: t('app.back'),
          }}
        />
        <Stack.Screen
          name="DestinationDetail"
          component={DestinationDetailScreen}
          options={{
            title: t('app.title'),
            headerBackTitle: t('app.back'),
          }}
        />
        <Stack.Screen
          name="Favourites"
          component={FavouritesScreen}
          options={{
            title: t('app.favourites'),
            headerBackTitle: t('app.back'),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
