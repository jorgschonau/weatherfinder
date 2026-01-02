import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Authentication Service
 * Handles all authentication-related operations with Supabase
 */

const SESSION_KEY = '@sunnomad:session';

/**
 * Initialize auth session from storage
 */
export const initializeSession = async () => {
  try {
    const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
    if (sessionJson) {
      const session = JSON.parse(sessionJson);
      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      if (error) throw error;
      return data.session;
    }
    return null;
  } catch (error) {
    console.error('Failed to initialize session:', error);
    return null;
  }
};

/**
 * Save session to storage
 */
const saveSession = async (session) => {
  try {
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  } catch (error) {
    console.error('Failed to save session:', error);
  }
};

/**
 * Sign up with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} username - User's username
 * @param {string} displayName - User's display name
 * @returns {Promise<{user, session, error}>}
 */
export const signUp = async (email, password, username, displayName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });

    if (error) throw error;
    
    if (data.session) {
      await saveSession(data.session);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, session: null, error };
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{user, session, error}>}
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    if (data.session) {
      await saveSession(data.session);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, session: null, error };
  }
};

/**
 * Sign out current user
 * @returns {Promise<{error}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    await saveSession(null);
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get current user
 * @returns {Promise<User|null>}
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Get current session
 * @returns {Promise<Session|null>}
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Get current session error:', error);
    return null;
  }
};

/**
 * Reset password (send reset email)
 * @param {string} email - User's email
 * @returns {Promise<{error}>}
 */
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'sunnomad://reset-password',
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error };
  }
};

/**
 * Update password
 * @param {string} newPassword - New password
 * @returns {Promise<{error}>}
 */
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Update password error:', error);
    return { error };
  }
};

/**
 * Listen to auth state changes
 * @param {function} callback - Callback function (event, session) => void
 * @returns {object} Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    await saveSession(session);
    callback(event, session);
  });
  
  return subscription;
};

export default {
  initializeSession,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getCurrentSession,
  resetPassword,
  updatePassword,
  onAuthStateChange,
};


