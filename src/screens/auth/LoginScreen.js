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

function normalizePhone(p) {
  const c = p.replace(/\s/g, '');
  return c.startsWith('0') ? '+212' + c.slice(1) : c;
}

function maskPhone(normalized) {
  const m = normalized.match(/^(\+212)([5-7])(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+212 ${m[2]}${m[3]} ** ** ${m[5]} ${m[6]}` : normalized;
}

export default function LoginScreen({ navigation, route }) {
  const { login } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // Phase 1 — phone (pre-fill if coming from GuestRdvScreen)
  const [telephone, setTelephone]   = useState(route.params?.prefillPhone || '');
  const [phoneError, setPhoneError] = useState(null);
  const [checking, setChecking]     = useState(false);

  // Phase 2 — CIN
  const [cinStep, setCinStep]       = useState(false);
  const [cin, setCin]               = useState('');
  const [cinError, setCinError]     = useState(null);
  const [verifying, setVerifying]   = useState(false);

  const handleNext = () => {
    const clean = telephone.replace(/\s/g, '');
    if (!/^(\+212|0)[5-7]\d{8}$/.test(clean)) {
      setPhoneError('Numéro invalide (ex : 0612 345 678)');
      return;
    }
    setPhoneError(null);
    setCinStep(true);
  };

  const handleLogin = async () => {
    if (!cin.trim()) { setCinError('Veuillez saisir votre CIN'); return; }
    setVerifying(true);
    try {
      const resp = await authService.loginWithCIN(normalizePhone(telephone), cin.trim());
      const user         = resp?.user;
      const token        = resp?.tokens?.accessToken;
      const refreshToken = resp?.tokens?.refreshToken;
      if (!token) throw new Error('Réponse invalide du serveur');

      if (user?.isNewUser) {
        // First-ever login → full profile setup (nom, prenom, centre)
        await AsyncStorage.setItem('jwtToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        navigation.replace('ProfileSetup', { token, user, refreshToken, cin: cin.trim().toUpperCase() });
      } else if (!user?.centre_id) {
        // Returning parent but no centre yet (pre-migration or skipped)
        await AsyncStorage.setItem('jwtToken', token);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        navigation.replace('ProfileSetup', { token, user, refreshToken, centreOnly: true });
      } else {
        // Returning parent with centre assigned → straight to app
        await login(token, user, refreshToken);
      }
    } catch (e) {
      const msg = e instanceof ApiError
        ? (e.isAuth ? 'CIN incorrect. Vérifiez votre carte nationale d\'identité.'
          : e.isNetwork ? 'Vérifiez votre connexion internet'
          : e.message)
        : 'Erreur inattendue. Réessayez.';
      setCinError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const scrollProps = {
    contentContainerStyle: [
      styles.scroll,
      { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl },
    ],
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'always',
    bounces: false,
  };

  const LogoBlock = () => (
    <View style={styles.logoBlock}>
      <View style={styles.iconRing}>
        <View style={styles.iconInner}>
          <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
        </View>
      </View>
      <Text style={styles.appName}>VacciKids</Text>
      <Text style={styles.tagline}>Suivi vaccinal pédiatrique</Text>
    </View>
  );

  // ── Phase 1: phone ───────────────────────────────────────────────────────
  if (!cinStep) {
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
            <LogoBlock />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSub}>
                Entrez votre numéro de téléphone pour continuer.
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
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                  autoFocus
                />
              </View>
              {phoneError && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{phoneError}</Text>
                </View>
              )}

              <AppButton
                title="Continuer"
                onPress={handleNext}
                loading={checking}
                disabled={!telephone.trim() || checking}
                icon="arrow-forward"
                iconPosition="right"
                style={{ marginTop: Spacing.md }}
              />
            </View>

            {/* Guest RDV shortcut */}
            <TouchableOpacity
              style={styles.guestBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('GuestRdv')}
            >
              <View style={styles.guestIconWrap}>
                <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
              </View>
              <Text style={styles.guestText}>Prendre un RDV sans compte</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Phase 2: CIN ────���────────────────────────────────────────────────────
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
          <LogoBlock />
          <View style={styles.card}>
            <View style={styles.cinIconWrap}>
              <Ionicons name="card-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Carte nationale d'identité</Text>
            <Text style={styles.cardSub}>
              Numéro enregistré :{'\n'}
              <Text style={styles.phoneBold}>{maskPhone(normalizePhone(telephone))}</Text>
            </Text>

            <Text style={styles.inputLabel}>Numéro CIN</Text>
            <View style={[styles.cinRow, cinError && styles.cinRowError]}>
              <View style={styles.cinIconLeft}>
                <Ionicons name="card" size={18} color={Colors.primary} />
              </View>
              <TextInput
                style={styles.cinInput}
                placeholder="Ex : AB123456"
                placeholderTextColor={Colors.textLight}
                value={cin}
                onChangeText={(v) => { setCin(v.toUpperCase()); setCinError(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>
            {cinError && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                <Text style={styles.errorText}>{cinError}</Text>
              </View>
            )}

            <View style={styles.cinNotice}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
              <Text style={styles.cinNoticeText}>
                Première connexion ? Vous choisirez votre centre de vaccination à l'étape suivante. Vos rendez-vous y seront enregistrés.
              </Text>
            </View>

            <AppButton
              title="Se connecter"
              onPress={handleLogin}
              loading={verifying}
              disabled={!cin.trim() || verifying}
              icon="arrow-forward"
              iconPosition="right"
              style={{ marginTop: Spacing.md }}
            />

            <TouchableOpacity
              style={styles.backRow}
              onPress={() => { setCinStep(false); setCinError(null); setCin(''); }}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Ionicons name="arrow-back" size={14} color={Colors.primary} />
              <Text style={styles.backLink}>Modifier le numéro</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.guestBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('GuestRdv')}
          >
            <View style={styles.guestIconWrap}>
              <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
            </View>
            <Text style={styles.guestText}>Prendre un RDV sans compte</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
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
    borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted, overflow: 'hidden',
  },
  phoneRowError:  { borderColor: Colors.danger },
  countryBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 14 },
  countryFlag:    { fontSize: 18 },
  countryCode:    { fontSize: 15, fontWeight: '700', color: Colors.text },
  phoneDivider:   { width: 1, height: 28, backgroundColor: Colors.border },
  phoneInput:     { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, color: Colors.text, letterSpacing: 0.5 },

  cinIconWrap:    { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  phoneBold:      { fontWeight: '700', color: Colors.primary },

  cinRow:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted, overflow: 'hidden' },
  cinRowError:    { borderColor: Colors.danger },
  cinIconLeft:    { paddingHorizontal: 14, paddingVertical: 14 },
  cinInput:       { flex: 1, paddingRight: 14, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: Colors.text, letterSpacing: 2 },

  cinNotice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.sm, marginBottom: 4, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm },
  cinNoticeText:  { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17, fontWeight: '500' },

  errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 4 },
  errorText:   { fontSize: 12, color: Colors.danger, fontWeight: '500' },

  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center', paddingTop: Spacing.base },
  backLink:    { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  guestBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glass, borderWidth: 1.5, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  guestIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(245,165,36,0.2)', alignItems: 'center', justifyContent: 'center' },
  guestText:     { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
});
