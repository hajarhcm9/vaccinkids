import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  fullWidth = true,
  small = false,
  style,
}) {
  const isDisabled = disabled || loading;
  const isPrimary  = variant === 'primary';
  const isDanger   = variant === 'danger';
  const isGhost    = variant === 'ghost';
  const isOutline  = variant === 'outline';
  const iconColor  = (isGhost || isOutline) ? Colors.primary : Colors.white;
  const height     = small ? 40 : 52;

  const inner = loading ? (
    <ActivityIndicator size="small" color={iconColor} />
  ) : (
    <View style={styles.row}>
      {icon && iconPosition === 'left' && (
        <Ionicons name={icon} size={18} color={iconColor} style={styles.iconLeft} />
      )}
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          isPrimary  && styles.labelPrimary,
          isDanger   && styles.labelDanger,
          (isGhost || isOutline) && styles.labelGhost,
          isDisabled && styles.labelDisabled,
        ]}
      >
        {title}
      </Text>
      {icon && iconPosition === 'right' && (
        <Ionicons name={icon} size={18} color={iconColor} style={styles.iconRight} />
      )}
    </View>
  );

  if (isPrimary && !isDisabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        disabled={isDisabled}
        style={[fullWidth && styles.fullWidth, { borderRadius: Radii.xl, overflow: 'hidden', marginTop: Spacing.md }, style]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={Gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, { height }]}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        { height },
        isDanger   && styles.danger,
        (isGhost || isOutline) && styles.ghost,
        isDisabled && styles.disabledBtn,
        isDisabled && isPrimary && { backgroundColor: Colors.primaryLight },
        fullWidth  && styles.fullWidth,
        { borderRadius: Radii.xl, marginTop: Spacing.md },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    ...Elevation.sm,
  },
  fullWidth:     { alignSelf: 'stretch' },
  danger:        { backgroundColor: Colors.danger },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledBtn:   { opacity: 0.45, shadowOpacity: 0 },
  row:           { flexDirection: 'row', alignItems: 'center' },
  label:         { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  labelSmall:    { fontSize: 13 },
  labelPrimary:  { color: Colors.white },
  labelDanger:   { color: Colors.white },
  labelGhost:    { color: Colors.primary },
  labelDisabled: { color: Colors.white },
  iconLeft:      { marginRight: Spacing.sm },
  iconRight:     { marginLeft: Spacing.sm },
});
