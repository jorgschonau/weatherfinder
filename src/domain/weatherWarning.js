/**
 * Weather Warning Domain Model
 * Handles severe weather warnings for the map
 */

export const WarningType = {
  FIRE: 'fire',
  FLOOD: 'flood',
  WIND: 'wind',
  STORM: 'storm',
  EXTREME_HEAT: 'extreme_heat',
  EXTREME_COLD: 'extreme_cold',
  SNOW: 'snow',
  ICE: 'ice',
};

export const WarningSeverity = {
  SEVERE: 'severe',     // Orange - serious warnings
  EXTREME: 'extreme',   // Red - life-threatening
};

export const WarningMetadata = {
  [WarningType.FIRE]: {
    icon: '🔥',
    color: '#FF4500',
    label: 'Waldbrand',
  },
  [WarningType.FLOOD]: {
    icon: '🌊',
    color: '#1E90FF',
    label: 'Hochwasser',
  },
  [WarningType.WIND]: {
    icon: '💨',
    color: '#87CEEB',
    label: 'Starker Wind',
  },
  [WarningType.STORM]: {
    icon: '⛈️',
    color: '#4B0082',
    label: 'Sturm',
  },
  [WarningType.EXTREME_HEAT]: {
    icon: '🌡️',
    color: '#FF6347',
    label: 'Extremhitze',
  },
  [WarningType.EXTREME_COLD]: {
    icon: '❄️',
    color: '#4169E1',
    label: 'Extremkälte',
  },
  [WarningType.SNOW]: {
    icon: '🌨️',
    color: '#B0C4DE',
    label: 'Schneefall',
  },
  [WarningType.ICE]: {
    icon: '🧊',
    color: '#ADD8E6',
    label: 'Eisregen',
  },
};

/**
 * Parses OpenWeatherMap alerts into our warning format
 */
export function parseWeatherAlert(alert, location) {
  if (!alert || !alert.event) return null;

  const event = alert.event.toLowerCase();
  let type = WarningType.STORM; // default
  
  // Map alert events to warning types
  if (event.includes('fire') || event.includes('brand')) {
    type = WarningType.FIRE;
  } else if (event.includes('flood') || event.includes('hochwasser')) {
    type = WarningType.FLOOD;
  } else if (event.includes('wind') || event.includes('gale')) {
    type = WarningType.WIND;
  } else if (event.includes('storm') || event.includes('sturm') || event.includes('hurricane')) {
    type = WarningType.STORM;
  } else if (event.includes('heat') || event.includes('hitze')) {
    type = WarningType.EXTREME_HEAT;
  } else if (event.includes('cold') || event.includes('kälte') || event.includes('freeze')) {
    type = WarningType.EXTREME_COLD;
  } else if (event.includes('snow') || event.includes('schnee')) {
    type = WarningType.SNOW;
  } else if (event.includes('ice') || event.includes('eis')) {
    type = WarningType.ICE;
  }

  // Determine severity (only keep severe/extreme)
  let severity = WarningSeverity.SEVERE;
  if (event.includes('extreme') || event.includes('major') || event.includes('red')) {
    severity = WarningSeverity.EXTREME;
  }

  const metadata = WarningMetadata[type];

  return {
    id: `warning-${location.lat}-${location.lon}-${alert.start}`,
    type,
    severity,
    title: alert.event,
    description: alert.description || '',
    start: new Date(alert.start * 1000),
    end: new Date(alert.end * 1000),
    location: {
      name: location.name,
      latitude: location.lat,
      longitude: location.lon,
    },
    icon: metadata.icon,
    color: metadata.color,
    label: metadata.label,
  };
}

/**
 * Filters alerts to only show critical warnings
 * (strict filtering - only severe/extreme)
 */
export function shouldShowWarning(warning) {
  if (!warning) return false;
  
  // Only show severe and extreme warnings
  if (warning.severity !== WarningSeverity.SEVERE && 
      warning.severity !== WarningSeverity.EXTREME) {
    return false;
  }

  // Check if warning is still active
  const now = new Date();
  if (warning.end && warning.end < now) {
    return false;
  }

  return true;
}

