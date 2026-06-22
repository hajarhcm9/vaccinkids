import React, { useState, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, TextInput, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';
import { AuthContext } from '../../context/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleAuthResponse(resp, navigation, login, fallbackCin) {
  const user         = resp?.user;
  const token        = resp?.tokens?.accessToken;
  const refreshToken = resp?.tokens?.refreshToken;
  if (!token) throw new Error('Réponse invalide du serveur');

  await AsyncStorage.setItem('jwtToken', token);
  if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);

  if (user?.isNewUser || !user?.nom || user?.nom === 'Nouveau') {
    navigation.replace('ProfileSetup', {
      token, user, refreshToken,
      cin: fallbackCin,
    });
  } else if (!user?.centre_id) {
    navigation.replace('ProfileSetup', { token, user, refreshToken, centreOnly: true });
  } else {
    await login(token, user, refreshToken);
  }
}

function errorMessage(e) {
  if (!(e instanceof ApiError)) return e.message || 'Erreur inattendue. Réessayez.';
  if (e.isAuth)    return 'Identifiants incorrects. Vérifiez et réessayez.';
  if (e.isNetwork) return 'Impossible de joindre le serveur.\nVérifiez votre connexion Wi-Fi.';
  return e.message || 'Erreur inattendue. Réessayez.';
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const insets    = useSafeAreaInsets();

  // 'baby' | 'email'
  const [mode, setMode] = useState('baby');

  // Baby mode fields
  const [numeroEnfant, setNumeroEnfant] = useState('');
  const [numError,     setNumError]     = useState(null);

  // Email mode fields
  const [email,      setEmail]      = useState('');
  const [emailError, setEmailError] = useState(null);

  // Shared
  const [cin,     setCin]     = useState('');
  const [cinError, setCinError] = useState(null);
  const [loading,  setLoading] = useState(false);

  const refCin   = useRef(null);
  const refEmail = useRef(null);

  const clearErrors = () => {
    setNumError(null);
    setEmailError(null);
    setCinError(null);
  };

  const switchMode = (m) => {
    setMode(m);
    clearErrors();
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    clearErrors();
    let valid = true;

    if (mode === 'baby') {
      if (!numeroEnfant.trim()) { setNumError("Entrez le numéro de l'enfant"); valid = false; }
      else if (!/^\d+$/.test(numeroEnfant.trim())) { setNumError('Chiffres uniquement'); valid = false; }
    } else {
      if (!email.trim()) { setEmailError('Entrez votre adresse email'); valid = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError('Email invalide'); valid = false; }
    }

    if (!cin.trim()) { setCinError('Entrez votre CIN'); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      let resp;
      if (mode === 'baby') {
        resp = await authService.loginWithBabyId(
          parseInt(numeroEnfant.trim(), 10),
          cin.trim().toUpperCase(),
        );
      } else {
        resp = await authService.loginWithEmail(
          email.trim(),
          cin.trim().toUpperCase(),
        );
      }
      await handleAuthResponse(resp, navigation, login, cin.trim().toUpperCase());
    } catch (e) {
      setCinError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isBaby  = mode === 'baby';
  const isEmail = mode === 'email';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={Gradients.auth} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="always"
          bounces={false}
        >
          {/* ── Logo ──────────────────────────────────────────────── */}
          <View style={styles.logoBlock}>
            <View style={styles.iconRing}>
              <View style={styles.iconInner}>
                <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.appName}>VacciKids</Text>
            <Text style={styles.tagline}>Suivi vaccinal pédiatrique</Text>
          </View>

          {/* ── Card ──────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>

            {/* Mode tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, isBaby && styles.tabActive]}
                onPress={() => switchMode('baby')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={isBaby ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.tabText, isBaby && styles.tabTextActive]}>
                  N° de l'enfant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, isEmail && styles.tabActive]}
                onPress={() => switchMode('email')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="mail-outline"
                  size={15}
                  color={isEmail ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.tabText, isEmail && styles.tabTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Baby mode ─────────────────────────────────────── */}
            {isBaby && (
              <>
                <Text style={styles.inputLabel}>N° de l'enfant au centre</Text>
                <View style={[styles.fieldRow, numError && styles.fieldRowError]}>
                  <View style={styles.fieldIcon}>
                    <Ionicons
                      name="barcode-outline"
                      size={20}
                      color={numError ? Colors.danger : Colors.primary}
                    />
                  </View>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Ex : 42"
                    placeholderTextColor={Colors.textLight}
                    value={numeroEnfant}
                    onChangeText={(v) => { setNumeroEnfant(v.replace(/\D/g, '')); setNumError(null); }}
                    keyboardType="number-pad"
                    maxLength={8}
                    returnKeyType="next"
                    onSubmitEditing={() => refCin.current?.focus()}
                    autoFocus={isBaby}
                  />
                </View>
                {numError && <ErrRow msg={numError} />}

                <View style={styles.hintBox}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.textLight} />
                  <Text style={styles.hintText}>
                    Petit numéro figurant sur le document remis par le centre de vaccination.
                  </Text>
                </View>
              </>
            )}

            {/* ── Email mode ────────────────────────────────────── */}
            {isEmail && (
              <>
                <Text style={styles.inputLabel}>Adresse email</Text>
                <View style={[styles.fieldRow, emailError && styles.fieldRowError]}>
                  <View style={styles.fieldIcon}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={emailError ? Colors.danger : Colors.primary}
                    />
                  </View>
                  <TextInput
                    ref={refEmail}
                    style={[styles.fieldInput, { fontSize: 15 }]}
                    placeholder="votre@email.com"
                    placeholderTextColor={Colors.textLight}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setEmailError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => refCin.current?.focus()}
                    autoFocus={isEmail}
                  />
                </View>
                {emailError && <ErrRow msg={emailError} />}
              </>
            )}

            {/* ── CIN (shared) ──────────────────────────────────── */}
            <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Votre CIN</Text>
            <View style={[styles.fieldRow, cinError && styles.fieldRowError]}>
              <View style={styles.fieldIcon}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={cinError ? Colors.danger : Colors.primary}
                />
              </View>
              <TextInput
                ref={refCin}
                style={[styles.fieldInput, styles.cinInput]}
                placeholder="Ex : AB123456"
                placeholderTextColor={Colors.textLight}
                value={cin}
                onChangeText={(v) => { setCin(v.toUpperCase()); setCinError(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>
            {cinError && <ErrRow msg={cinError} />}

            <AppButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || (isBaby ? !numeroEnfant.trim() : !email.trim()) || !cin.trim()}
              icon="arrow-forward"
              iconPosition="right"
              style={{ marginTop: Spacing.lg }}
            />
          </View>

          {/* ── Numéro oublié ───────────────────────────────────── */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('Forgot')}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Ionicons name="help-circle-outline" size={14} color="rgba(255,255,255,0.55)" />
            <Text style={styles.forgotText}>Numéro d'enfant oublié ?</Text>
          </TouchableOpacity>

          {/* ── RDV sans compte ─────────────────────────────────── */}
          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>ou</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity
            style={styles.guestBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('GuestRdv')}
          >
            <View style={styles.guestIconWrap}>
              <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guestTitle}>Pas encore de numéro ?</Text>
              <Text style={styles.guestSub}>Prendre un RDV sans compte</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
          </TouchableOpacity>

          {/* ── Personnel médical ────────────────────────────────── */}
          <TouchableOpacity
            style={styles.staffBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('StaffLogin')}
          >
            <Ionicons name="medical-outline" size={14} color="rgba(255,255,255,0.40)" />
            <Text style={styles.staffText}>Accès personnel médical</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function ErrRow({ msg }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.primaryDeep },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl },

  // Logo
  logoBlock: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  iconRing:  { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  iconInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  appName:   { fontSize: 34, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: 4 },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.70)', letterSpacing: 0.3 },

  // Card
  card:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.xl, ...Elevation.xl, marginBottom: Spacing.lg },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },

  // Mode tabs
  tabs:         { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: Radii.lg, padding: 4, marginBottom: Spacing.lg },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: Radii.md },
  tabActive:    { backgroundColor: Colors.surface, ...Elevation.xs },
  tabText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive:{ color: Colors.primary },

  // Fields
  inputLabel:    { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted, overflow: 'hidden' },
  fieldRowError: { borderColor: Colors.danger },
  fieldIcon:     { paddingHorizontal: 14, paddingVertical: 14 },
  fieldInput:    { flex: 1, paddingRight: 14, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: Colors.text },
  cinInput:      { letterSpacing: 2 },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6, marginBottom: 2 },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500', flex: 1, lineHeight: 17 },

  hintBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.background, borderRadius: Radii.md },
  hintText: { flex: 1, fontSize: 11, color: Colors.textLight, lineHeight: 16 },

  // Separator
  separatorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
  separatorLine:{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  separatorText:{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },

  // Forgot
  forgotLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm },
  forgotText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  // Guest RDV
  guestBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glass, borderWidth: 1.5, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm },
  guestIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,165,36,0.20)', alignItems: 'center', justifyContent: 'center' },
  guestTitle:    { color: Colors.white, fontSize: 14, fontWeight: '700' },
  guestSub:      { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1 },

  // Staff link
  staffBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  staffText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
});
