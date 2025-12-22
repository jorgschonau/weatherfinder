import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import './src/i18n';
import MapScreen from './src/screens/MapScreen';
import DestinationDetailScreen from './src/screens/DestinationDetailScreen';

const Stack = createStackNavigator();

function AppContent() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: t('app.title') }}
      />
      <Stack.Screen 
        name="DestinationDetail" 
        component={DestinationDetailScreen}
        options={{ title: t('app.destinationDetails') }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AppContent />
    </NavigationContainer>
  );
}

