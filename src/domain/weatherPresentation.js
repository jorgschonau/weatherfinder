/**
 * Domain/UI shared presentation mapping for weather conditions.
 * (Kept here so UI can stay dumb; UI should consume via usecases.)
 */
export const getWeatherIcon = (condition) => {
  const icons = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    snowy: '❄️',
    windy: '💨',
  };
  return icons[condition] || '☀️';
};

export const getWeatherColor = (condition, temperature = null) => {
  const colors = {
    sunny: '#FFA726',
    cloudy: '#78909C',
    rainy: '#42A5F5',
    snowy: '#E1F5FE',
    windy: '#B0BEC5',
  };
  
  // Sunny but cold → temperature-based blue gradient
  if (condition === 'sunny' && temperature !== null) {
    if (temperature < -10) return '#D0E8FF'; // Eisblau (sehr kalt)
    if (temperature < 0) return '#E5F2FF';   // Hellblau (kalt)
  }
  
  return colors[condition] || '#FFA726';
};





