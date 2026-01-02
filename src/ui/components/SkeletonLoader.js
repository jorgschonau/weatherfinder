import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * Skeleton Loader Component with shimmer effect
 */
const SkeletonLoader = ({ width, height, borderRadius = 8, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton for Map Marker
 */
export const SkeletonMapMarker = () => {
  return (
    <View style={styles.markerContainer}>
      <SkeletonLoader width={80} height={80} borderRadius={40} />
    </View>
  );
};

/**
 * Skeleton for Weather Card List
 */
export const SkeletonWeatherCard = () => {
  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader width="100%" height={120} borderRadius={16} />
    </View>
  );
};

/**
 * Multiple skeleton cards
 */
export const SkeletonWeatherList = ({ count = 5 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonWeatherCard key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  markerContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
  },
  cardContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingVertical: 16,
  },
});

export default SkeletonLoader;


