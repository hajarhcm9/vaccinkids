import React from 'react';
import { View, TextInput, Text, StyleSheet, Platform } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

const PhoneInput = ({ value, onChangeText, onSubmitEditing, inputRef, isRTL }) => {
  const handlePhoneChange = (text) => {
    // Autoriser uniquement les chiffres
    const cleaned = text.replace(/[^0-9]/g, '');
    onChangeText(cleaned);
  };

  const placeholder = isRTL ? 'XXXXXXXXX 06' : '06 XX XX XX XX';

  return (
    <View>
      <View style={styles.container}>
        <View style={styles.countryPicker} accessibilityLabel="Indicatif pays: Maroc +212">
          <Text style={styles.flag}>🇲🇦</Text>
          <Text style={styles.countryCode}>+212</Text>
        </View>

        <View style={styles.divider} />

        {/* Champ numéro */}
        <TextInput
          ref={inputRef}
          style={[styles.input, isRTL && styles.inputRTL]}
          value={value}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textHint}
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
      </View>

      {/* Numéro complet prévisualisé */}
      {value.length > 0 && <Text style={styles.fullNumber}>+212 {value}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 56,
    paddingHorizontal: spacing.md,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  flag: {
    fontSize: 22,
  },
  countryCode: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    letterSpacing: 1,
    ...Platform.select({
      ios: { paddingVertical: 0 },
    }),
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  fullNumber: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingLeft: spacing.xs,
  },
});

export default PhoneInput;
