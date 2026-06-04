import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

// ─────────────────────────────────────────
// AppInput — champ texte générique
// ─────────────────────────────────────────
export const AppInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  isRTL,
  inputRef,
  onSubmitEditing,
  returnKeyType = 'next',
  keyboardType = 'default',
  maxLength,
  editable = true,
  ...rest
}) => (
  <View style={inputStyles.wrapper}>
    {label && <Text style={[inputStyles.label, isRTL && inputStyles.rtl]}>{label}</Text>}
    <TextInput
      ref={inputRef}
      style={[
        inputStyles.input,
        error && inputStyles.inputError,
        !editable && inputStyles.inputDisabled,
        isRTL && inputStyles.rtl,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textHint}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      keyboardType={keyboardType}
      maxLength={maxLength}
      editable={editable}
      {...rest}
    />
    {error && <Text style={[inputStyles.errorText, isRTL && inputStyles.rtl]}>⚠ {error}</Text>}
  </View>
);

// ─────────────────────────────────────────
// AppButton — bouton principal / secondaire
// ─────────────────────────────────────────
export const AppButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary', // 'primary' | 'secondary' | 'outline'
  style,
}) => {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        btnStyles.btn,
        variant === 'primary' && btnStyles.primary,
        variant === 'secondary' && btnStyles.secondary,
        variant === 'outline' && btnStyles.outline,
        isDisabled && btnStyles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.white}
          size="small"
        />
      ) : (
        <Text style={[btnStyles.label, variant === 'outline' && btnStyles.labelOutline]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────
// SegmentedControl — sélecteur à boutons (ex: Sexe)
// ─────────────────────────────────────────
export const SegmentedControl = ({ label, options, value, onChange, isRTL, error }) => (
  <View style={segStyles.wrapper}>
    {label && <Text style={[segStyles.label, isRTL && segStyles.rtl]}>{label}</Text>}
    <View style={[segStyles.row, isRTL && segStyles.rowRTL]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[segStyles.btn, value === opt.value && segStyles.btnActive]}
          onPress={() => onChange(opt.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === opt.value }}
        >
          <Text style={segStyles.icon}>{opt.icon}</Text>
          <Text style={[segStyles.btnText, value === opt.value && segStyles.btnTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    {error && <Text style={[segStyles.errorText, isRTL && segStyles.rtl]}>⚠ {error}</Text>}
  </View>
);

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    ...Platform.select({ ios: { paddingVertical: 0 } }),
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
  },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});

const btnStyles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: { opacity: 0.5 },
  label: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
  labelOutline: { color: colors.primary },
});

const segStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowRTL: { flexDirection: 'row-reverse' },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.inputBg,
  },
  btnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  icon: { fontSize: 18 },
  btnText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  btnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
  },
  rtl: { textAlign: 'right' },
});
