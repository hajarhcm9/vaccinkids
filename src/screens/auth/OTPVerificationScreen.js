import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/ui/AppButton';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { authService, ApiError } from '../../services';
import { AuthContext } from '../../context/AuthContext';

const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ route, navigation }) {
  const { login } = React.useContext(AuthContext);
  const cin = route.params?.cin || '';
  const telephone = route.params?.telephone || '';
  const fromRegister = route.params?.fromRegister || false;

  const maskedPhone = telephone
    ? telephone.replace(/^(\+212|0)/, '+212 ').replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 ** ** $3 $4')
    : 'votre téléphone';

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const inputs = useRef([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleChange = (text, idx) => {
    if (!/^\d?$/.test(text)) return;
    const next = [...digits];
    next[idx] = text;
    setDigits(next);
    setError(null);
    if (text && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (text && idx === OTP_LENGTH - 1 && next.every((d) => d !== '')) {
      setTimeout(() => verifyCode(next.join('')), 150);
    }
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const verifyCode = async (code) => {
    if (code.length < OTP_LENGTH) {
      setError(`Veuillez saisir les ${OTP_LENGTH} chiffres`);
      return;
    }
    setLoading(true);
    try {
      const resp = await authService.verifyOTP(cin, code);
      if (resp.token && resp.user) {
        await login(resp.token, resp.user, resp.refreshToken);
        if (resp.user.profileCompleted === false) {
          navigation.replace('ProfileSetup', { cin, telephone });
        }
      } else {
        navigation.replace('ProfileSetup', { cin, telephone });
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isAuth) setError('Code incorrect ou expiré');
        else if (e.isNetwork) setError('Vérifiez votre connexion internet');
        else setError(e.message);
      } else {
        setError('Erreur inattendue. Réessayez.');
      }
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => verifyCode(digits.join(''));

  const handleResend = async () => {
    try {
      await authService.resendOTP(cin);
      setResendIn(30);
      setDigits(Array(OTP_LENGTH).fill(''));
      setError(null);
      inputs.current[0]?.focus();
    } catch (e) {
      setError('Impossible de renvoyer le code. Réessayez plus tard.');
    }
  };

  const codeComplete = digits.every((d) => d !== '');

  return (
    <LinearGradient colors={Gradients.auth} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20}
      >
        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.surface} />
          </View>

          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.description}>
            {fromRegister
              ? 'Pour finaliser votre inscription, un code à 6 chiffres a été envoyé par SMS au :'
              : 'Pour sécuriser votre connexion, un code à 6 chiffres a été envoyé par SMS au :'}
          </Text>
          <Text style={styles.maskedPhone}>{maskedPhone}</Text>

          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => (inputs.current[i] = r)}
                style={[
                  styles.otpBox,
                  d ? styles.otpFilled : null,
                  error ? styles.otpError : null,
                ]}
                value={d}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                accessibilityLabel={`Chiffre ${i + 1} sur ${OTP_LENGTH}`}
                textContentType="oneTimeCode"
              />
            ))}
          </View>

          {error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <AppButton
            title="Vérifier"
            onPress={handleVerify}
            loading={loading}
            disabled={!codeComplete || loading}
            icon="checkmark-circle-outline"
            iconPosition="right"
            style={{ marginTop: Spacing.lg }}
          />

          <View style={styles.resendRow}>
            {resendIn > 0 ? (
              <Text style={styles.resendDisabled}>Renvoyer le code dans {resendIn}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Renvoyer le code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  title: { ...Typography.display, color: Colors.textInverse, textAlign: 'center', marginBottom: Spacing.sm },
  description: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20, maxWidth: 320, alignSelf: 'center' },
  maskedPhone: { fontSize: 16, fontWeight: '700', color: Colors.accent, textAlign: 'center', marginTop: 8, marginBottom: Spacing.xl },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  otpBox: {
    width: 48, height: 56,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    borderColor: Colors.border,
    fontSize: 24, fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    padding: 0,
  },
  otpFilled: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  otpError: { borderColor: Colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, gap: 6 },
  errorText: { color: Colors.surface, fontSize: 13, fontWeight: '500' },
  resendRow: { alignItems: 'center', marginTop: Spacing.lg },
  resendDisabled: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  resendLink: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
});