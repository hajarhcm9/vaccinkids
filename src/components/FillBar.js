import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

const FillBar = ({ booked = 0, total = 1, showLabel = true, animated = true, size = 'md' }) => {
  const percent = Math.min(Math.round((booked / total) * 100), 100);
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animWidth, {
        toValue: percent,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      animWidth.setValue(percent);
    }
  }, [percent]);

  const getColor = () => {
    if (percent >= 100) return colors.danger;
    if (percent >= 80) return colors.warning;
    return colors.success;
  };

  const getLabel = () => {
    if (percent >= 100) return 'Complet';
    if (percent >= 80) return 'Presque complet';
    return 'Disponible';
  };

  const barHeight = size === 'sm' ? 6 : size === 'lg' ? 12 : 8;

  return (
    <View style={styles.wrapper}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.placesText}>
            {booked}/{total} places
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getColor() + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getColor() }]} />
            <Text style={[styles.statusText, { color: getColor() }]}>{getLabel()}</Text>
          </View>
        </View>
      )}
      <View style={[styles.track, { height: barHeight, borderRadius: barHeight / 2 }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              height: barHeight,
              borderRadius: barHeight / 2,
              backgroundColor: getColor(),
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  placesText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  track: {
    width: '100%',
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {},
});

export default FillBar;
