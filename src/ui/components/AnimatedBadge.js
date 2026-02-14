import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';

/**
 * Animated Badge Component with BIG pulse and fade-in effects
 */
const AnimatedBadge = ({ icon, color, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Force reset to fully transparent and tiny
    fadeAnim.setValue(0);
    scaleAnim.setValue(0);
    pulseAnim.setValue(1);

    // Small delay to ensure component is fully mounted
    const startDelay = 100 + delay;

    // Entry animation: Perfect balance - visible but not too slow
    Animated.sequence([
      Animated.delay(startDelay),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800, // 0.8s - visible but snappy!
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // BIGGER pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3, // Much bigger pulse!
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Start pulse after entry animation completes
    const pulseTimeout = setTimeout(() => {
      pulse.start();
    }, 100 + delay + 800); // After 0.8s fade completes

    return () => {
      clearTimeout(pulseTimeout);
      pulse.stop();
    };
  }, [icon, color]); // Re-trigger when badge changes!

  return (
    <Animated.View
      style={[
        styles.badgeOverlay,
        {
          backgroundColor: color,
          opacity: fadeAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) }
          ],
        },
      ]}
    >
      {typeof icon === 'string' ? (
        <Text style={styles.badgeIcon}>{icon}</Text>
      ) : (
        <Image source={icon} style={styles.badgeImage} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeOverlay: {
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeImage: {
    width: 28,
    height: 28,
    resizeMode: 'cover',
    borderRadius: 14,
  },
});

export default AnimatedBadge;

