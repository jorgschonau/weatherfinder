# Unit System Usage Guide

## Overview
Das Unit System ermöglicht die Konvertierung zwischen:
- **Distanz**: Kilometer (km) ↔ Meilen (mi)
- **Temperatur**: Celsius (°C) ↔ Fahrenheit (°F)

**Default Einstellungen**: Kilometer und Celsius

## Setup (Already Done ✅)

### 1. Provider in App.js
```javascript
import { UnitProvider } from './src/contexts/UnitContext';

<ThemeProvider>
  <UnitProvider>
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  </UnitProvider>
</ThemeProvider>
```

## How to Use in Components

### 1. Import Hook and Utils
```javascript
import { useUnits } from '../../contexts/UnitContext';
import { 
  formatDistance, 
  formatTemperature, 
  formatWindSpeed,
  getTemperatureValue,
  getDistanceValue
} from '../../utils/unitConversion';
```

### 2. Get Current Units
```javascript
const { distanceUnit, temperatureUnit } = useUnits();
```

### 3. Format Values for Display

#### Temperature (always stored as Celsius in backend)
```javascript
// Simple formatting with symbol
const tempDisplay = formatTemperature(destination.temperature, temperatureUnit);
// Output: "20°C" or "68°F"

// Without symbol (for markers)
const tempShort = formatTemperature(destination.temperature, temperatureUnit, false);
// Output: "20°" or "68°"

// Get numeric value for calculations
const tempValue = getTemperatureValue(destination.temperature, temperatureUnit);
// Output: 20 or 68
```

#### Distance (always stored as km in backend)
```javascript
// Format distance
const distDisplay = formatDistance(destination.distance, distanceUnit, 1);
// Output: "150.0 km" or "93.2 mi"

// Get numeric value for calculations
const distValue = getDistanceValue(destination.distance, distanceUnit);
// Output: 150 or 93.2
```

#### Wind Speed
```javascript
const windDisplay = formatWindSpeed(destination.windSpeed, distanceUnit);
// Output: "25 km/h" or "16 mph"
```

### 4. Example: MapScreen Marker
```javascript
// In MapScreen.js
import { useUnits } from '../../contexts/UnitContext';
import { formatTemperature } from '../../utils/unitConversion';

const MapScreen = () => {
  const { temperatureUnit } = useUnits();
  
  return (
    <Text style={styles.markerTemp}>
      {formatTemperature(dest.temperature, temperatureUnit, false)}
    </Text>
  );
};
```

### 5. Example: DetailScreen
```javascript
// In DestinationDetailScreen.js
import { useUnits } from '../../contexts/UnitContext';
import { formatTemperature, formatDistance, formatWindSpeed } from '../../utils/unitConversion';

const DestinationDetailScreen = () => {
  const { distanceUnit, temperatureUnit } = useUnits();
  
  return (
    <View>
      {/* Hero Temperature */}
      <Text style={styles.heroTemp}>
        {formatTemperature(forecast.temperature, temperatureUnit)}
      </Text>
      
      {/* Distance */}
      <Text>
        📍 {formatDistance(destination.distance, distanceUnit, 1)}
      </Text>
      
      {/* Wind Speed */}
      <Text>
        💨 {formatWindSpeed(forecast.windSpeed, distanceUnit)}
      </Text>
      
      {/* Forecast Temps */}
      <Text>
        {formatTemperature(forecast.today.high, temperatureUnit)} / 
        {formatTemperature(forecast.today.low, temperatureUnit)}
      </Text>
    </View>
  );
};
```

## Settings Screen (TODO - Later Implementation)

In SettingsScreen.js oder ProfileScreen.js wird später folgendes hinzugefügt:

```javascript
import { useUnits } from '../../contexts/UnitContext';
import { useTranslation } from 'react-i18next';

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { 
    distanceUnit, 
    temperatureUnit, 
    setDistanceUnit, 
    setTemperatureUnit 
  } = useUnits();
  
  return (
    <View>
      <Text>{t('settings.units')}</Text>
      
      {/* Distance Unit Picker */}
      <View>
        <Text>{t('settings.distanceUnit')}</Text>
        <Picker
          selectedValue={distanceUnit}
          onValueChange={(value) => setDistanceUnit(value)}
        >
          <Picker.Item label={t('settings.kilometers')} value="km" />
          <Picker.Item label={t('settings.miles')} value="miles" />
        </Picker>
      </View>
      
      {/* Temperature Unit Picker */}
      <View>
        <Text>{t('settings.temperatureUnit')}</Text>
        <Picker
          selectedValue={temperatureUnit}
          onValueChange={(value) => setTemperatureUnit(value)}
        >
          <Picker.Item label={t('settings.celsius')} value="celsius" />
          <Picker.Item label={t('settings.fahrenheit')} value="fahrenheit" />
        </Picker>
      </View>
    </View>
  );
};
```

## Persistence
- Unit preferences are automatically saved to AsyncStorage
- Loaded on app startup
- Default: km + °C

## Backend Data
**IMPORTANT**: Alle Daten im Backend/Supabase bleiben in:
- Kilometer (km)
- Celsius (°C)

Die Konvertierung passiert NUR im Frontend für die Anzeige!

## Next Steps
1. ✅ Unit system created (UnitContext, utilities, translations)
2. ✅ Provider integrated in App.js
3. ⏳ TODO: Add unit formatting to MapScreen markers
4. ⏳ TODO: Add unit formatting to DestinationDetailScreen
5. ⏳ TODO: Add unit settings UI in SettingsScreen/ProfileScreen
