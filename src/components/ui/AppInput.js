import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, TouchTargets } from '../../constants/theme';

export default function AppInput({
  label, placeholder, value, onChangeText, onBlur,
  error, touched, secureTextEntry = false, keyboardType = 'default',
  icon, rightIcon, onRightIconPress, disabled = false, maxLength,
  autoCapitalize = 'none', helper, accessibilityLabel,
}) {
  const [isFocused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => setFocused(true);
  const handleBlur  = (e) => { setFocused(false); onBlur?.(e); };

  const isError  = touched && error;
  const isSecure = secureTextEntry && !showPassword;

  const borderColor = isError
    ? Colors.danger
    : isFocused
    ? Colors.primary
    : Colors.border;

  return (
    <View style={styles.wrapper}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {helper && <Text style={styles.helper}>{helper}</Text>}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          { borderColor },
          isFocused && styles.inputFocused,
          isError   && styles.inputError,
          disabled  && styles.inputDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={19}
            color={isError ? Colors.danger : isFocused ? Colors.primary : Colors.textLight}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          maxLength={maxLength}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityState={{ invalid: !!isError }}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIconBtn}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Masquer' : 'Afficher'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn} disabled={!onRightIconPress}>
            <Ionicons name={rightIcon} size={19} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isError && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={Colors.danger} />
          <Text style={styles.errorText} accessibilityLiveRegion="assertive">{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.base },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    paddingHorizontal: 2,
  },
  label:  { fontSize: 13, fontWeight: '700', color: Colors.text, letterSpacing: 0.1 },
  helper: { fontSize: 11, color: Colors.textLight },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
  },
  inputFocused: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputError:    { backgroundColor: Colors.dangerBg + '60' },
  inputDisabled: { backgroundColor: Colors.surfaceMuted, opacity: 0.7 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
    paddingHorizontal: Spacing.sm,
  },
  leftIcon:     { marginRight: 4 },
  rightIconBtn: { padding: Spacing.xs, marginLeft: 4 },
  errorRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, marginLeft: 2 },
  errorText:    { color: Colors.danger, fontSize: 12, flex: 1 },
});
