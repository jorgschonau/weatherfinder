import { supabase } from '../config/supabase';

/**
 * Favourites Service
 * Handles user's favourite places with Supabase backend
 */

/**
 * Get all favourites for the current user
 * @returns {Promise<{favourites, error}>}
 */
export const getFavourites = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // User not logged in, return empty array
      return { favourites: [], error: null };
    }

    const { data, error } = await supabase
      .from('favourites')
      .select(`
        *,
        places (
          id,
          name,
          description,
          latitude,
          longitude,
          place_type,
          rating_avg,
          rating_count,
          amenities
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match legacy format
    const transformed = data.map(fav => ({
      id: fav.id,
      lat: fav.places.latitude,
      lon: fav.places.longitude,
      name: fav.places.name,
      description: fav.places.description,
      place_type: fav.places.place_type,
      rating_avg: fav.places.rating_avg,
      rating_count: fav.places.rating_count,
      amenities: fav.places.amenities,
      notes: fav.notes,
      savedAt: fav.created_at,
      placeId: fav.places.id,
    }));

    return { favourites: transformed, error: null };
  } catch (error) {
    console.error('Get favourites error:', error);
    return { favourites: [], error };
  }
};

/**
 * Add a place to favourites
 * @param {string} placeId - Place ID
 * @param {string} notes - Optional notes
 * @returns {Promise<{favourite, error}>}
 */
export const addFavourite = async (placeId, notes = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('favourites')
      .insert({
        user_id: user.id,
        place_id: placeId,
        notes,
      })
      .select(`
        *,
        places (*)
      `)
      .single();

    if (error) throw error;
    return { favourite: data, error: null };
  } catch (error) {
    console.error('Add favourite error:', error);
    return { favourite: null, error };
  }
};

/**
 * Remove a place from favourites
 * @param {string} placeId - Place ID
 * @returns {Promise<{error}>}
 */
export const removeFavourite = async (placeId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('favourites')
      .delete()
      .eq('user_id', user.id)
      .eq('place_id', placeId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Remove favourite error:', error);
    return { error };
  }
};

/**
 * Check if a place is in favourites
 * @param {string} placeId - Place ID
 * @returns {Promise<{isFavourite, error}>}
 */
export const isFavourite = async (placeId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isFavourite: false, error: null };
    }

    const { data, error } = await supabase
      .from('favourites')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', placeId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    return { isFavourite: !!data, error: null };
  } catch (error) {
    console.error('Check favourite error:', error);
    return { isFavourite: false, error };
  }
};

/**
 * Update favourite notes
 * @param {string} placeId - Place ID
 * @param {string} notes - Updated notes
 * @returns {Promise<{favourite, error}>}
 */
export const updateFavouriteNotes = async (placeId, notes) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('favourites')
      .update({ notes })
      .eq('user_id', user.id)
      .eq('place_id', placeId)
      .select()
      .single();

    if (error) throw error;
    return { favourite: data, error: null };
  } catch (error) {
    console.error('Update favourite notes error:', error);
    return { favourite: null, error };
  }
};

/**
 * Clear all favourites for the current user
 * @returns {Promise<{error}>}
 */
export const clearFavourites = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('favourites')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Clear favourites error:', error);
    return { error };
  }
};

export default {
  getFavourites,
  addFavourite,
  removeFavourite,
  isFavourite,
  updateFavouriteNotes,
  clearFavourites,
};


