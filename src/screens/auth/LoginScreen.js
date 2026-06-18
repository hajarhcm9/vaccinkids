import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';
import { AuthContext } from '../../context/AuthContext';

const OTP_LENGTH = 6;

function normalizePhone(p) {
  const c = p.replace(/\s/g, '');
  return c.startsWith('0') ? '+212' + c.slice(1) : c;
}

function maskPhone(normalized) {
  const m = normalized.match(/^(\+212)([5-7])(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+212 ${m[2]}${m[3]} ** ** ${m[5]} ${m[6]}` : normalized;
}

export default function LoginScreen({ navigation }) {
  const { loginDemo, login } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // Phase 1 — phone
  const [telephone, setTelephone]   = useState('');
  const [phoneError, setPhoneError] = useState(null);
  const [sending, setSending]       = useState(false);

  // Phase 2 — OTP
  const [otpSent, setOtpSent]       = useState(false);
  const [digits, setDigits]         = useState(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError]     = useState(null);
  const [verifying, setVerifying]   = useState(false);
  const [resendIn, setResendIn]     = useState(30);
  const inputs = useRef([]);

  useEffect(() => {
    if (!otpSent || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [otpSent, resendIn]);

  const handleSendOTP = async () => {
    const clean = telephone.replace(/\s/g, '');
    if (!/^(\+212|0)[5-7]\d{8}$/.test(clean)) {
      setPhoneError('Numéro invalide (ex : 0612 345 678)');
      return;
    }
    setPhoneError(null);
    setSending(true);
    try {
      await authService.sendOTP(normalizePhone(telephone));
      setOtpSent(true);
      setResendIn(30);
      setDigits(Array(OTP_LENGTH).fill(''));
    } catch (e) {
      setPhoneError(
        e instanceof ApiError
          ? (e.isNetwork ? 'Vérifiez votre connexion internet' : e.message)
          : 'Erreur inattendue. Réessayez.',
      );
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    setVerifying(true);
    try {
      const resp = await authService.verifyOTP(normalizePhone(telephone), code);
      const user         = resp?.data?.user;
      const token        = resp?.data?.tokens?.accessToken;
      const refreshToken = resp?.data?.tokens?.refreshToken;

      if (!token) throw new Error('Réponse invalide du serveur');

      if (user?.isNewUser) {
        await AsyncStorage.setItem('jwtToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        navigation.replace('ProfileSetup', { token, user, refreshToken });
      } else {
        await login(token, user, refreshToken);
      }
    } catch (e) {
      const msg = e instanceof ApiError
        ? (e.isAuth ? 'Code incorrect ou expiré' : e.isNetwork ? 'Vérifiez votre connexion' : e.message)
        : 'Erreur inattendue. Réessayez.';
      setOtpError(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (text, idx) => {
    if (!/^\d?$/.test(text)) return;
    const next = [...digits];
    next[idx] = text;
    setDigits(next);
    setOtpError(null);
    if (text && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (text && idx === OTP_LENGTH - 1 && next.every((d) => d !== '')) {
      setTimeout(() => handleVerifyOTP(next.join('')), 150);
    }
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await authService.sendOTP(normalizePhone(telephone));
      setResendIn(30);
      setDigits(Array(OTP_LENGTH).fill(''));
      setOtpError(null);
      inputs.current[0]?.focus();
    } catch {
      setOtpError('Impossible de renvoyer le code. Réessayez.');
    }
  };

  const DemoButton = () => (
    <TouchableOpacity style={styles.demoBtn} onPress={loginDemo} activeOpacity={0.8}>
      <View style={styles.demoBadge}>
        <Ionicons name="eye-outline" size={14} color={Colors.accent} />
      </View>
      <Text style={styles.demoText}>Accès démo — explorer sans compte</Text>
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
    </TouchableOpacity>
  );

  const scrollProps = {
    contentContainerStyle: [
      styles.scroll,
      { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl },
    ],
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'always',
    bounces: false,
  };

  // ── Phase 1: phone entry ──────────────────────────────────────────────────
  if (!otpSent) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={Gradients.auth} style={StyleSheet.absoluteFillObject} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView {...scrollProps}>
            <View style={styles.logoBlock}>
              <View style={styles.iconRing}>
                <View style={styles.iconInner}>
                  <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
                </View>
              </View>
              <Text style={styles.appName}>VacciKids</Text>
              <Text style={styles.tagline}>Suivi vaccinal pédiatrique</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSub}>
                Entrez votre numéro de téléphone pour recevoir un code de vérification par SMS.
              </Text>

              <Text style={styles.inputLabel}>Numéro de téléphone</Text>
              <View style={[styles.phoneRow, phoneError && styles.phoneRowError]}>
                <View style={styles.countryBadge}>
                  <Text style={styles.countryFlag}>🇲🇦</Text>
                  <Text style={styles.countryCode}>+212</Text>
                </View>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="06 12 34 56 78"
                  placeholderTextColor={Colors.textLight}
                  value={telephone}
                  onChangeText={(v) => { setTelephone(v); setPhoneError(null); }}
                  keyboardType="phone-pad"
                  maxLength={14}
                  returnKeyType="send"
                  onSubmitEditing={handleSendOTP}
                  autoFocus
                />
              </View>
              {phoneError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              )}

              <View style={styles.noticeRow}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.textLight} />
                <Text style={styles.noticeText}>
                  Première connexion ? Votre compte est créé automatiquement.
                </Text>
              </View>

              <AppButton
                title="Recevoir le code SMS"
                onPress={handleSendOTP}
                loading={sending}
                disabled={!telephone.trim() || sending}
                icon="chatbubble-outline"
                iconPosition="right"
                style={{ marginTop: Spacing.md }}
              />
            </View>

            <DemoButton />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Phase 2: OTP entry ────────────────────────────────────────────────────
  const codeComplete = digits.every((d) => d !== '');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={Gradients.auth} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView {...scrollProps}>
          <View style={styles.logoBlock}>
            <View style={styles.iconRing}>
              <View style={styles.iconInner}>
                <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.appName}>VacciKids</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.otpIconWrap}>
              <Ionicons name="chatbubble-ellipses" size={28} color={Colors.primary} />
            </View>

            <Text style={styles.cardTitle}>Code de vérification</Text>
            <Text style={styles.cardSub}>
              Un code à 6 chiffres a été envoyé par SMS au{'\n'}
              <Text style={styles.phoneBold}>{maskPhone(normalizePhone(telephone))}</Text>
            </Text>

            <View style={styles.otpRow}>
              {digits.map((d, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => { inputs.current[idx] = r; }}
                  style={[
                    styles.otpBox,
                    d ? styles.otpBoxFilled : null,
                    otpError ? styles.otpBoxError : null,
                  ]}
                  value={d}
                  onChangeText={(t) => handleDigitChange(t, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  autoFocus={idx === 0}
                />
              ))}
            </View>

            {otpError && (
              <View style={[styles.errorRow, { justifyContent: 'center', marginBottom: Spacing.sm }]}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            )}

            <AppButton
              title="Se connecter"
              onPress={() => handleVerifyOTP(digits.join(''))}
              loading={verifying}
              disabled={!codeComplete || verifying}
              icon="arrow-forward"
              iconPosition="right"
              style={{ marginBottom: Spacing.md }}
            />

            <View style={styles.resendRow}>
              {resendIn > 0 ? (
                <Text style={styles.resendTimer}>
                  Renvoyer dans{' '}
                  <Text style={styles.resendCount}>{resendIn}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} hitSlop={{ top: 8, bottom: 8 }}>
                  <Text style={styles.resendLink}>Renvoyer le code →</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.backRow}
              onPress={() => {
                setOtpSent(false);
                setOtpError(null);
                setDigits(Array(OTP_LENGTH).fill(''));
              }}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Ionicons name="arrow-back" size={14} color={Colors.primary} />
              <Text style={styles.backLink}>Modifier le numéro</Text>
            </TouchableOpacity>
          </View>

          <DemoButton />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.primaryDeep },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl },

  logoBlock: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  iconRing:  { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  iconInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  appName:   { fontSize: 34, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: 4 },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.70)', letterSpacing: 0.3 },

  card:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.xl, ...Elevation.xl, marginBottom: Spacing.lg },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  cardSub:   { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
  },
  phoneRowError: { borderColor: Colors.danger },
  countryBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 14 },
  countryFlag:   { fontSize: 18 },
  countryCode:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  phoneDivider:  { width: 1, height: 28, backgroundColor: Colors.border },
  phoneInput:    { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, color: Colors.text, letterSpacing: 0.5 },

  errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 4 },
  errorText:   { fontSize: 12, color: Colors.danger, fontWeight: '500' },

  noticeRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.sm, marginBottom: 4, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm },
  noticeText:  { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17, fontWeight: '500' },

  demoBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glass, borderWidth: 1.5, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  demoBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(245,165,36,0.2)', alignItems: 'center', justifyContent: 'center' },
  demoText:  { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  // OTP phase
  otpIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  phoneBold:   { fontWeight: '700', color: Colors.primary },

  otpRow:      { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginVertical: Spacing.lg },
  otpBox:      { width: 46, height: 54, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceMuted, fontSize: 22, fontWeight: '700', color: Colors.text },
  otpBoxFilled:{ borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  otpBoxError: { borderColor: Colors.danger, backgroundColor: Colors.dangerBg },

  resendRow:   { alignItems: 'center', marginBottom: Spacing.md },
  resendTimer: { fontSize: 13, color: Colors.textSecondary },
  resendCount: { fontWeight: '700', color: Colors.primary },
  resendLink:  { fontSize: 13, fontWeight: '700', color: Colors.primary },

  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center', paddingTop: Spacing.sm },
  backLink:    { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
