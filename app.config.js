import 'dotenv/config';

export default {
  expo: {
    name: 'WeatherFinder',
    slug: 'weather-finder',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#2E7D32',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.weatherfinder.app',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#2E7D32',
      },
      package: 'com.weatherfinder.app',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    web: {},
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Weather Finder to use your location to find nearby destinations.',
        },
      ],
      'expo-localization',
    ],
    extra: {
      openWeatherApiKey: process.env.OPENWEATHERMAP_API_KEY || '',
      weatherbitApiKey: process.env.WEATHERBIT_API_KEY || '',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    },
  },
};
