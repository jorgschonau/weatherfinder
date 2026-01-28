#!/usr/bin/env node

/**
 * Clear Map Cache
 * Run this to force the app to reload fresh data from database
 */

console.log('💡 To clear the map cache:');
console.log('');
console.log('Option 1: Delete app from simulator/device and reinstall');
console.log('');
console.log('Option 2: Add this to your app (one-time):');
console.log('');
console.log('  import AsyncStorage from \'@react-native-async-storage/async-storage\';');
console.log('  await AsyncStorage.removeItem(\'mapDestinationsCache\');');
console.log('');
console.log('Option 3: Force reload destinations by changing radius');
console.log('  → In app: Change radius from 2000 to 2050, then back to 2000');
console.log('');
