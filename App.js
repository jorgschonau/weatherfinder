import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import './src/i18n';
import MapScreen from './src/ui/screens/MapScreen';
import DestinationDetailScreen from './src/ui/screens/DestinationDetailScreen';
import CommunityScreen from './src/ui/screens/CommunityScreen';

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
      <Stack.Screen 
        name="Community" 
        component={CommunityScreen}
        options={{ title: t('app.community') }}
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

