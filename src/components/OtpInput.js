import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

const OTP_LENGTH = 6;

const OtpInput = ({ value, onChange, hasError }) => {
  const inputs = useRef([]);

  useEffect(() => {
    // Focus sur la première case au montage
    if (inputs.current[0]) {
      setTimeout(() => inputs.current[0].focus(), 300);
    }
  }, []);

  const handleChange = (text, index) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned.length > 1) {
      // Gère le collage d'un code complet
      const pastedCode = cleaned.slice(0, OTP_LENGTH);
      onChange(pastedCode);
      const nextIndex = Math.min(pastedCode.length, OTP_LENGTH - 1);
      inputs.current[nextIndex]?.focus();
      return;
    }

    const codeArray = value.split('');
    codeArray[index] = cleaned;
    const newCode = codeArray.join('').slice(0, OTP_LENGTH);
    onChange(newCode);

    // Auto-avance vers la case suivante
    if (cleaned && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Backspace : retour sur la case précédente si vide
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const codeArray = value.split('');
      codeArray[index - 1] = '';
      onChange(codeArray.join(''));
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: OTP_LENGTH }).map((_, index) => {
        const digit = value[index] || '';
        const isFocused = false; // Géré par le style focus natif
        const isFilled = digit.length > 0;

        return (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={[
              styles.box,
              isFilled && styles.boxFilled,
              hasError && styles.boxError,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={OTP_LENGTH} // Permet le collage
            textAlign="center"
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            selectTextOnFocus
            accessibilityLabel={`Chiffre ${index + 1} du code OTP`}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.inputBg,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    ...Platform.select({
      ios: { paddingVertical: 0 },
    }),
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
  },
  boxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
});

export default OtpInput;