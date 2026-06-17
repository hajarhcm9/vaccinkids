import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation } from '../../constants/theme';

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  fullWidth = true,
  style,
}) {
  const isDisabled = disabled || loading;
  const isPrimary  = variant === 'primary';
  const isDanger   = variant === 'danger';
  const isGhost    = variant === 'ghost';
  const iconColor  = isGhost ? Colors.primary : Colors.surface;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        isPrimary  && styles.primary,
        isDanger   && styles.danger,
        isGhost    && styles.ghost,
        isDisabled && styles.disabled,
        fullWidth  && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={18} color={iconColor} style={styles.iconLeft} />
          )}
          <Text
            style={[
              styles.label,
              isPrimary  && styles.labelPrimary,
              isDanger   && styles.labelDanger,
              isGhost    && styles.labelGhost,
              isDisabled && styles.labelDisabled,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={18} color={iconColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    ...Elevation.sm,
  },
  fullWidth:     { alignSelf: 'stretch' },
  primary:       { backgroundColor: Colors.primary },
  danger:        { backgroundColor: Colors.danger },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled:      { opacity: 0.55 },
  row:           { flexDirection: 'row', alignItems: 'center' },
  label:         { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  labelPrimary:  { color: Colors.surface },
  labelDanger:   { color: Colors.surface },
  labelGhost:    { color: Colors.primary },
  labelDisabled: { color: '#aaa' },
  iconLeft:      { marginRight: Spacing.sm },
  iconRight:     { marginLeft: Spacing.sm },
});
