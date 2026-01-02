# SunNomad 🌞🏜️

A cross-platform mobile app built with React Native and Expo that helps nomads and travelers find the best sunny destinations with optimal weather conditions within their travel radius.

## Features

- 🗺️ **Interactive Map View**: See weather conditions, temperature, and stability scores for multiple destinations
- 📍 **Radius Selection**: Choose your travel radius (200km, 400km, 600km, 1500km, 3000km)
- 🌤️ **Weather Filtering**: Filter destinations by weather type (sunny, cloudy, rainy, snowy, windy)
- 📊 **Detailed Weather Info**: View comprehensive weather data including forecasts for the next 3 days
- 🚗 **Navigation Integration**: Open destinations in Google Maps or Apple Maps with one tap
- 🎨 **Modern UI**: Inspired by Komoot and Park4Night design aesthetics
- 🔐 **User Authentication**: Sign up, login, and manage your profile with Supabase
- ⭐ **Favourites System**: Save your favorite places (synced to cloud when logged in)
- 👥 **Community Ready**: Backend infrastructure ready for ratings, reviews, and social features

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file and add your API keys:
```bash
touch .env
```
```
# Weather API
OPENWEATHERMAP_API_KEY=your_openweathermap_key_here  # For frontend weather display

# Supabase (optional - app works without backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# Note: Backend weather updates use Open-Meteo (FREE, no API key needed!)
```

**Note**: The app works without Supabase credentials, but auth and cloud sync features will be disabled.

3. Start the development server:
```bash
npm start
```

4. Run on your device:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

### Weather Data

**Frontend (User-facing):**
- `weatherProvider.js` uses OpenWeatherMap for real-time weather display in the app
- Gracefully falls back to mock data when API is unavailable

**Backend (Bulk Updates):**
- `openMeteoService.js` uses Open-Meteo API for efficient updates
- **FREE** - No API key needed!
- Updates 20,000+ places with parallel requests
- Fair-Use: 10,000+ requests/day
- See [`API_ALTERNATIVES.md`](./API_ALTERNATIVES.md) for comparison

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
- **Supabase** - Backend (PostgreSQL, Auth, Storage)
- **OpenWeatherMap API** - Frontend weather data
- **Open-Meteo API** - Backend batch updates (FREE!)
- **i18next** - Internationalization (EN, DE, FR)

## Backend Setup (Optional)

To enable authentication and cloud sync features, set up Supabase:

1. Follow the detailed guide in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)
2. Create a free Supabase project at [supabase.com](https://supabase.com)
3. Run the SQL schema from `supabase/schema.sql`
4. Add your Supabase credentials to `.env`

**Without Supabase**: The app works perfectly fine without backend integration. Features that require authentication (login, cloud favourites) will be disabled.

## Implemented Features ✅

- ✅ Real-time weather API integration (OpenWeatherMap)
- ✅ User authentication (Sign up, Login, Profile)
- ✅ Save favorite destinations (local + cloud sync)
- ✅ Multi-language support (EN, DE, FR)
- ✅ Multiple theme options
- ✅ Weather warnings and alerts

## Future Enhancements 🚀

- 📸 Photo uploads for places
- ⭐ User ratings and reviews for destinations
- 👥 Social features (friends, activity feed)
- 📊 Historical weather data analysis
- 🔔 Push notifications for weather changes
- 🗺️ Offline map support

## Architecture

The app follows Clean Architecture principles with clear separation of concerns:

```
src/
├── config/           # Configuration (Supabase client)
├── contexts/         # React Context providers (Auth)
├── domain/           # Business logic models
├── i18n/             # Internationalization
├── integrations/     # External API integrations
├── providers/        # Data providers (Weather, Favourites)
├── services/         # Backend services (Auth, Places, Profile)
├── theme/            # Theming system
├── ui/               # UI components and screens
├── usecases/         # Use case implementations
└── utils/            # Utility functions
```

### Key Design Decisions

- **Supabase Backend**: Scalable PostgreSQL database with built-in auth, real-time subscriptions, and file storage
- **Row Level Security**: All data protected with Supabase RLS policies
- **Offline-First**: App works without backend, gracefully degrades features
- **Modular Services**: Each service (auth, places, favourites) is independent and testable
- **i18n Ready**: All text strings externalized for easy translation

See [`FUTURE_FEATURES.md`](./FUTURE_FEATURES.md) for planned social features and community enhancements.

