import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Typography, TouchTargets } from '../../constants/theme';

export default function AppInput({
  label, placeholder, value, onChangeText, onBlur,
  error, touched, secureTextEntry = false, keyboardType = 'default',
  icon, rightIcon, onRightIconPress, disabled = false, maxLength,
  autoCapitalize = 'none', helper, accessibilityLabel,
}) {
  const [isFocused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => setFocused(true);
  const handleBlur = (e) => { setFocused(false); onBlur?.(e); };

  const isError = touched && error;
  const isSecure = secureTextEntry && !showPassword;

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
          { height: TouchTargets.comfortable },
          isFocused && styles.inputFocused,
          isError && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
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
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn} disabled={!onRightIconPress}>
            <Ionicons name={rightIcon} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {isError && <Ionicons name="alert-circle" size={20} color={Colors.danger} style={styles.rightIcon} />}
      </View>

      {isError && <Text style={styles.errorText} accessibilityLiveRegion="assertive">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  helper: { fontSize: 11, color: Colors.textLight },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radii.sm, backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  inputFocused: { borderColor: Colors.primary, borderWidth: 1.5, shadowColor: Colors.primary, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  inputError: { borderColor: Colors.danger },
  inputDisabled: { backgroundColor: Colors.surfaceMuted, opacity: 0.7 },
  input: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 0, paddingHorizontal: Spacing.xs },
  leftIcon: { marginRight: Spacing.sm },
  rightIconBtn: { padding: Spacing.xs },
  rightIcon: { marginLeft: Spacing.sm },
  errorText: { color: Colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
});