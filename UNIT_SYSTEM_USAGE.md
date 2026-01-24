# Unit System Usage Guide

## Overview
Das Unit System ermöglicht die Konvertierung zwischen:
- **Distanz**: Kilometer (km) ↔ Meilen (mi)
- **Temperatur**: Celsius (°C) ↔ Fahrenheit (°F)
- **Windgeschwindigkeit**: km/h ↔ mph ↔ m/s ↔ Beaufort
- **Niederschlag**: mm ↔ inches

**Default Einstellungen**: Kilometer, Celsius, km/h, mm

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
const { distanceUnit, temperatureUnit, windSpeedUnit, precipitationUnit } = useUnits();
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
const windDisplay = formatWindSpeed(destination.windSpeed, windSpeedUnit);
// Output: "25 km/h" or "16 mph" or "6.9 m/s" or "4 Bft"
```

#### Precipitation
```javascript
const precipDisplay = formatPrecipitation(destination.precipitation, precipitationUnit);
// Output: "5.0 mm" or "0.2 in"
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
import { 
  formatTemperature, 
  formatDistance, 
  formatWindSpeed, 
  formatPrecipitation 
} from '../../utils/unitConversion';

const DestinationDetailScreen = () => {
  const { distanceUnit, temperatureUnit, windSpeedUnit, precipitationUnit } = useUnits();
  
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
        💨 {formatWindSpeed(forecast.windSpeed, windSpeedUnit)}
      </Text>
      
      {/* Precipitation */}
      <Text>
        🌧️ {formatPrecipitation(forecast.precipitation, precipitationUnit)}
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
    windSpeedUnit,
    precipitationUnit,
    setDistanceUnit, 
    setTemperatureUnit,
    setWindSpeed,
    setPrecipitation
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
      
      {/* Wind Speed Unit Picker */}
      <View>
        <Text>{t('settings.windSpeedUnit')}</Text>
        <Picker
          selectedValue={windSpeedUnit}
          onValueChange={(value) => setWindSpeed(value)}
        >
          <Picker.Item label={t('settings.kmh')} value="kmh" />
          <Picker.Item label={t('settings.mph')} value="mph" />
          <Picker.Item label={t('settings.ms')} value="ms" />
          <Picker.Item label={t('settings.beaufort')} value="beaufort" />
        </Picker>
      </View>
      
      {/* Precipitation Unit Picker */}
      <View>
        <Text>{t('settings.precipitationUnit')}</Text>
        <Picker
          selectedValue={precipitationUnit}
          onValueChange={(value) => setPrecipitation(value)}
        >
          <Picker.Item label={t('settings.millimeters')} value="mm" />
          <Picker.Item label={t('settings.inches')} value="inches" />
        </Picker>
      </View>
    </View>
  );
};
```

## Persistence
- Unit preferences are automatically saved to AsyncStorage
- Loaded on app startup
- Default: km, °C, km/h, mm

## Backend Data
**IMPORTANT**: Alle Daten im Backend/Supabase bleiben in:
- Kilometer (km)
- Celsius (°C)
- km/h (Windgeschwindigkeit)
- mm (Niederschlag)

Die Konvertierung passiert NUR im Frontend für die Anzeige!

## Wind Speed Conversion Reference
- **km/h**: Standard metric (default)
- **mph**: Miles per hour (US/UK)
- **m/s**: Meters per second (scientific)
- **Beaufort**: Beaufort scale 0-12 (maritime/aviation)
  - 0: Calm (<1 km/h)
  - 1-3: Light breeze (1-19 km/h)
  - 4-6: Moderate to strong breeze (20-49 km/h)
  - 7-9: Gale to strong gale (50-88 km/h)
  - 10-12: Storm to hurricane (89+ km/h)

## Precipitation Conversion Reference
- **mm**: Millimeters (metric, default)
- **inches**: Inches (imperial, US)
- Conversion: 1 inch = 25.4 mm

## Next Steps
1. ✅ Unit system created (UnitContext, utilities, translations)
2. ✅ Provider integrated in App.js
3. ⏳ TODO: Add unit formatting to MapScreen markers
4. ⏳ TODO: Add unit formatting to DestinationDetailScreen
5. ⏳ TODO: Add unit settings UI in SettingsScreen/ProfileScreen
