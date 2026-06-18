import React, { useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { loginDemo }    = useContext(AuthContext);
  const insets           = useSafeAreaInsets();
  const [cin, setCin]    = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const e = {};
    if (!cin.trim()) e.cin = 'Veuillez saisir votre CIN';
    else if (cin.replace(/\s/g, '').length < 6) e.cin = 'CIN invalide (6 caractères minimum)';
    if (!password) e.password = 'Veuillez saisir votre mot de passe';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const resp = await authService.login(cin.replace(/\s/g, ''), password);
      navigation.navigate('OTPVerification', {
        cin: cin.replace(/\s/g, ''),
        otpSentTo: resp.otpSentTo,
        fromRegister: false,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isAuth)    setErrors({ password: 'CIN ou mot de passe incorrect' });
        else if (e.isNetwork) setErrors({ cin: 'Vérifiez votre connexion internet' });
        else             setErrors({ password: e.message });
      } else {
        setErrors({ password: 'Erreur inattendue. Réessayez.' });
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
            { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          bounces={false}
        >
          {/* ── Logo block ── */}
          <View style={styles.logoBlock}>
            <View style={styles.iconRing}>
              <View style={styles.iconInner}>
                <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.appName}>VacciKids</Text>
            <Text style={styles.tagline}>Suivi vaccinal pédiatrique</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bon retour 👋</Text>
            <Text style={styles.cardSub}>
              Connectez-vous avec votre Carte d'Identité Nationale
            </Text>

            <AppInput
              label="CIN"
              placeholder="Ex : AB123456"
              value={cin}
              onChangeText={(v) => { setCin(v); if (errors.cin) setErrors({ ...errors, cin: null }); }}
              error={errors.cin}
              touched={!!errors.cin}
              icon="card-outline"
              autoCapitalize="characters"
            />
            <AppInput
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: null }); }}
              error={errors.password}
              touched={!!errors.password}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotRow}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <AppButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              disabled={!cin.trim() || !password}
              icon="arrow-forward"
              iconPosition="right"
            />
          </View>

          {/* ── Demo access ── */}
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={loginDemo}
            activeOpacity={0.8}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <View style={styles.demoBadge}>
              <Ionicons name="eye-outline" size={14} color={Colors.accent} />
            </View>
            <Text style={styles.demoText}>Accès démo — explorer sans compte</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* ── Sign up ── */}
          <View style={styles.signupRow}>
            <Text style={styles.signupLabel}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}> Créer un compte →</Text>
            </TouchableOpacity>
          </View>
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

  forgotRow:  { alignSelf: 'flex-end', marginBottom: Spacing.base, marginTop: -4 },
  forgotText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  demoBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.glass, borderWidth: 1.5, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  demoBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(245,165,36,0.2)', alignItems: 'center', justifyContent: 'center' },
  demoText:  { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  signupRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  signupLabel:{ color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  signupLink: { color: Colors.accentLight, fontSize: 14, fontWeight: '700' },
});
