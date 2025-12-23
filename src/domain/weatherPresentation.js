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

export const getWeatherColor = (condition) => {
  const colors = {
    sunny: '#FFA726',
    cloudy: '#78909C',
    rainy: '#42A5F5',
    snowy: '#E1F5FE',
    windy: '#B0BEC5',
  };
  return colors[condition] || '#FFA726';
};



