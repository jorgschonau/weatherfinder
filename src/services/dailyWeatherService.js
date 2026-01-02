import { supabase } from '../config/supabase';

/**
 * Daily Weather Service
 * Handles daily weather summaries and trends
 */

/**
 * Get daily weather summaries for a place
 * @param {string} placeId - Place ID
 * @param {number} days - Number of days (default 30)
 * @returns {Promise<{summaries, error}>}
 */
export const getDailySummaries = async (placeId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('daily_weather_summary')
      .select('*')
      .eq('place_id', placeId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return { summaries: data, error: null };
  } catch (error) {
    console.error('Get daily summaries error:', error);
    return { summaries: [], error };
  }
};

/**
 * Get 30-day weather trends for a place
 * @param {string} placeId - Place ID
 * @returns {Promise<{trends, error}>}
 */
export const get30DayTrends = async (placeId) => {
  try {
    const { data, error } = await supabase
      .from('places_with_30day_trends')
      .select('*')
      .eq('place_id', placeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { trends: data, error: null };
  } catch (error) {
    console.error('Get 30-day trends error:', error);
    return { trends: null, error };
  }
};

/**
 * Compare weather between two places (30-day average)
 * @param {string} placeId1 - First place ID
 * @param {string} placeId2 - Second place ID
 * @returns {Promise<{comparison, error}>}
 */
export const comparePlaces = async (placeId1, placeId2) => {
  try {
    const [trends1, trends2] = await Promise.all([
      get30DayTrends(placeId1),
      get30DayTrends(placeId2),
    ]);

    if (trends1.error || trends2.error) {
      return { comparison: null, error: trends1.error || trends2.error };
    }

    const comparison = {
      place1: trends1.trends,
      place2: trends2.trends,
      differences: {
        temp_avg_diff: (trends1.trends?.temp_30d_avg || 0) - (trends2.trends?.temp_30d_avg || 0),
        rain_diff: (trends1.trends?.rain_30d_total || 0) - (trends2.trends?.rain_30d_total || 0),
        wind_diff: (trends1.trends?.wind_30d_avg_max || 0) - (trends2.trends?.wind_30d_avg_max || 0),
      },
      better_for_sun: (trends1.trends?.sunny_days_30d || 0) > (trends2.trends?.sunny_days_30d || 0) ? 1 : 2,
      better_for_warmth: (trends1.trends?.temp_30d_avg || 0) > (trends2.trends?.temp_30d_avg || 0) ? 1 : 2,
    };

    return { comparison, error: null };
  } catch (error) {
    console.error('Compare places error:', error);
    return { comparison: null, error };
  }
};

/**
 * Trigger aggregation of weather_data into daily summary
 * @param {string} placeId - Place ID
 * @param {Date} date - Date to aggregate
 * @returns {Promise<{error}>}
 */
export const aggregateDailyWeather = async (placeId, date) => {
  try {
    const dateStr = date.toISOString().split('T')[0];

    const { error } = await supabase.rpc('aggregate_daily_weather', {
      target_place_id: placeId,
      target_date: dateStr,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Aggregate daily weather error:', error);
    return { error };
  }
};

export default {
  getDailySummaries,
  get30DayTrends,
  comparePlaces,
  aggregateDailyWeather,
};


