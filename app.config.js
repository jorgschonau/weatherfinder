import 'dotenv/config';

export default {
  expo: {
    name: 'SunNomad',
    slug: 'sunnomad',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#FF8F00', // SunNomad orange/gold
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
        backgroundColor: '#FF8F00', // SunNomad orange/gold
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
