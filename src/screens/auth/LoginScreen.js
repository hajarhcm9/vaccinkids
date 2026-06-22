import React, { useState, useContext } from 'react';
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

export default function LoginScreen({ navigation, route }) {
  const { login } = useContext(AuthContext);
  const insets    = useSafeAreaInsets();

  const prefillCin = route?.params?.prefillCin ?? '';

  const [cin,       setCin]       = useState(prefillCin);
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [cinError,  setCinError]  = useState(null);
  const [passError, setPassError] = useState(null);
  const [serverErr, setServerErr] = useState(null);
  const [loading,   setLoading]   = useState(false);

  const clearErrors = () => {
    setCinError(null);
    setPassError(null);
    setServerErr(null);
  };

  const handleLogin = async () => {
    clearErrors();
    let valid = true;
    if (!cin.trim())      { setCinError('Entrez votre CIN');          valid = false; }
    if (!password.trim()) { setPassError('Entrez votre mot de passe'); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      const resp = await authService.loginParent(cin.trim().toUpperCase(), password);
      const user        = resp?.user;
      const token       = resp?.tokens?.accessToken;
      const refreshToken = resp?.tokens?.refreshToken;
      if (!token) throw new Error('Réponse invalide du serveur');
      await AsyncStorage.setItem('jwtToken', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      if (user?.isNewUser || !user?.centre_id) {
        navigation.replace('ProfileSetup', { token, user, refreshToken });
      } else {
        await login(token, user, refreshToken);
      }
    } catch (e) {
      if (e instanceof ApiError && e.isAuth) {
        setCinError('CIN ou mot de passe incorrect.');
      } else if (e instanceof ApiError && e.isNetwork) {
        setServerErr('Impossible de joindre le serveur.\nVérifiez votre connexion Wi-Fi.');
      } else {
        setServerErr(e instanceof ApiError ? e.message : 'Erreur inattendue. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

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
            { paddingTop: insets.top + Spacing['3xl'], paddingBottom: insets.bottom + Spacing.xl },
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

            {/* CIN */}
            <Text style={styles.inputLabel}>Votre CIN</Text>
            <View style={[styles.fieldRow, cinError && styles.fieldRowError]}>
              <View style={styles.fieldIcon}>
                <Ionicons name="card-outline" size={20} color={cinError ? Colors.danger : Colors.primary} />
              </View>
              <TextInput
                style={[styles.fieldInput, styles.cinInput]}
                placeholder="Ex : AB123456"
                placeholderTextColor={Colors.textLight}
                value={cin}
                onChangeText={(v) => { setCin(v.toUpperCase()); setCinError(null); setServerErr(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="next"
                autoFocus
              />
            </View>
            {cinError && <ErrRow msg={cinError} />}

            {/* Mot de passe */}
            <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Mot de passe</Text>
            <View style={[styles.fieldRow, passError && styles.fieldRowError]}>
              <View style={styles.fieldIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={passError ? Colors.danger : Colors.primary} />
              </View>
              <TextInput
                style={[styles.fieldInput, { paddingRight: 0 }]}
                placeholder="Votre mot de passe"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={(v) => { setPassword(v); setPassError(null); setServerErr(null); }}
                secureTextEntry={!showPass}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            {passError && <ErrRow msg={passError} />}

            {serverErr && (
              <View style={styles.serverErrBox}>
                <Ionicons name="wifi-outline" size={15} color={Colors.danger} />
                <Text style={styles.serverErrText}>{serverErr}</Text>
              </View>
            )}

            <AppButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !cin.trim() || !password.trim()}
              icon="arrow-forward"
              iconPosition="right"
              style={{ marginTop: Spacing.lg }}
            />

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>
                Pas encore de compte ?{'  '}
                <Text style={styles.registerBold}>Créer un compte</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── RDV sans compte ─────────────────────────────────────── */}
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

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ErrRow({ msg }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
      <Text style={styles.errorText}>{msg}</Text>
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
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },

  inputLabel:    { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted, overflow: 'hidden' },
  fieldRowError: { borderColor: Colors.danger },
  fieldIcon:     { paddingHorizontal: 14, paddingVertical: 14 },
  fieldInput:    { flex: 1, paddingRight: 14, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: Colors.text },
  cinInput:      { letterSpacing: 2 },
  eyeBtn:        { paddingHorizontal: 14 },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6, marginBottom: 2 },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500', flex: 1, lineHeight: 17 },

  serverErrBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.dangerBg, borderRadius: Radii.md, padding: Spacing.sm, marginTop: Spacing.sm },
  serverErrText: { flex: 1, fontSize: 13, color: Colors.danger, lineHeight: 18 },

  registerLink: { alignItems: 'center', paddingTop: Spacing.md },
  registerText: { fontSize: 13, color: Colors.textSecondary },
  registerBold: { color: Colors.primary, fontWeight: '700' },

  separatorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
  separatorLine:{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  separatorText:{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },

  guestBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glass, borderWidth: 1.5, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm },
  guestIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,165,36,0.20)', alignItems: 'center', justifyContent: 'center' },
  guestTitle:    { color: Colors.white, fontSize: 14, fontWeight: '700' },
  guestSub:      { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1 },

});
