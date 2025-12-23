# Weather Finder - React Native App

A cross-platform mobile app built with React Native and Expo that helps you find destinations with your desired weather conditions within a specified travel radius.

## Features

- 🗺️ **Interactive Map View**: See weather conditions, temperature, and stability scores for multiple destinations
- 📍 **Radius Selection**: Choose your travel radius (200km, 400km, 600km, 1500km, 3000km)
- 🌤️ **Weather Filtering**: Filter destinations by weather type (sunny, cloudy, rainy, snowy, windy)
- 📊 **Detailed Weather Info**: View comprehensive weather data including forecasts for the next 3 days
- 🚗 **Navigation Integration**: Open destinations in Google Maps or Apple Maps with one tap
- 🎨 **Modern UI**: Inspired by Komoot and Park4Night design aesthetics

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and add your OpenWeatherMap API key:
```bash
cp .env.example .env
```
```
OPENWEATHERMAP_API_KEY=your_real_key_here
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

### Real weather data

- `app.config.js` loads `OPENWEATHERMAP_API_KEY` via `dotenv` and exposes it through `expo-constants`.
- `src/providers/weatherProvider.js` now calls OpenWeatherMap's `box/city` endpoint for radius queries and `onecall` for detailed forecasts.
- The provider gracefully falls back to mock data when the key is missing or the API fails, so the app always remains runnable locally.

## Project Structure

```
├── App.js                    # Main app component with navigation
├── src/
│   ├── screens/
│   │   ├── MapScreen.js      # Main map view with weather markers
│   │   └── DestinationDetailScreen.js  # Detailed destination view
│   ├── components/
│   │   ├── RadiusSelector.js # Radius selection component
│   │   └── WeatherFilter.js  # Weather type filter
│   └── services/
│       └── weatherService.js # Weather API service
└── package.json
```

## Technologies Used

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform
- **React Navigation** - Navigation library
- **React Native Maps** - Map component
- **Expo Location** - Location services
- **Expo Linking** - Deep linking for navigation apps

## Notes

- Currently uses mock weather data for demonstration
- Replace mock data with real API calls in `weatherService.js`
- Location permissions are required for the app to function
- The app works on both iOS and Android

## Future Enhancements

- Real-time weather API integration
- Save favorite destinations
- Weather alerts and notifications
- Historical weather data
- Social sharing features

## Planned Social Features (Future)

The app architecture is designed to be easily extensible for social features:

### Planned Components:
- **User Profiles**: Profile screens with avatar upload
- **Friends List**: Add/remove friends, friend requests
- **Live Feed**: Activity feed showing when friends start trips or arrive at destinations
- **Push Notifications**: Real-time notifications for friend activities
- **Privacy Settings**: Control who can see your trips and locations

### Recommended Backend:
- **Supabase** (cost-effective for ~5k active users/month: ~$25/month)
  - PostgreSQL database for users, friends, activities
  - Real-time subscriptions for live updates
  - Storage for profile images
  - Built-in authentication

### Implementation Notes:
- Current component structure (`src/components/`, `src/screens/`) is modular and ready for extension
- Navigation structure can easily accommodate new screens (Profile, Friends, Feed)
- i18n system already supports all text translations
- Location tracking infrastructure is in place for trip detection

