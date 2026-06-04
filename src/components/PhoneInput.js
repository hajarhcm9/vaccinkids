import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

const COUNTRY_CODES = [
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
];

const PhoneInput = ({ value, onChangeText, onSubmitEditing, inputRef, isRTL }) => {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showPicker, setShowPicker] = useState(false);

  const handlePhoneChange = (text) => {
    // Autoriser uniquement les chiffres
    const cleaned = text.replace(/[^0-9]/g, '');
    onChangeText(cleaned);
  };

  const placeholder = isRTL ? 'XXXXXXXXX 06' : '06 XX XX XX XX';

  return (
    <View>
      <View style={styles.container}>
        {/* Sélecteur indicatif pays */}
        <TouchableOpacity
          style={styles.countryPicker}
          onPress={() => setShowPicker(!showPicker)}
          accessibilityLabel={`Indicatif pays: ${selectedCountry.name} ${selectedCountry.code}`}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.countryCode}>{selectedCountry.code}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>

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

      {/* Dropdown indicatifs */}
      {showPicker && (
        <View style={styles.dropdown}>
          {COUNTRY_CODES.map((country) => (
            <TouchableOpacity
              key={country.code}
              style={[
                styles.dropdownItem,
                selectedCountry.code === country.code && styles.dropdownItemSelected,
              ]}
              onPress={() => {
                setSelectedCountry(country);
                setShowPicker(false);
              }}
            >
              <Text style={styles.flag}>{country.flag}</Text>
              <Text style={styles.dropdownItemName}>{country.name}</Text>
              <Text style={styles.dropdownItemCode}>{country.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Numéro complet prévisualisé */}
      {value.length > 0 && (
        <Text style={styles.fullNumber}>
          {selectedCountry.code} {value}
        </Text>
      )}
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
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 2,
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
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    zIndex: 1000,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemName: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  dropdownItemCode: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  fullNumber: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingLeft: spacing.xs,
  },
});

export default PhoneInput;
