import 'dotenv/config';

export default {
  expo: {
    name: 'SunNomad',
    slug: 'sunnomad',
    version: '1.0.1',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-screen.png',
      resizeMode: 'contain',
      backgroundColor: '#F5E6D3', // SunNomad cream/beige background
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.sunnomad.app',
      icon: './assets/icon.png',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F5E6D3', // SunNomad cream/beige background
      },
      package: 'com.sunnomad.app',
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    web: {},
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow SunNomad to use your location to find sunny destinations.',
        },
      ],
      'expo-localization',
    ],
    extra: {
      openWeatherApiKey: process.env.OPENWEATHERMAP_API_KEY || '',
    },
  },
};
