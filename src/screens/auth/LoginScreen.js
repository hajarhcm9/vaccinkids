import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { authService, ApiError } from '../../services';

export default function LoginScreen({ navigation }) {
  const [cin, setCin] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
        if (e.isAuth) setErrors({ password: 'CIN ou mot de passe incorrect' });
        else if (e.isNetwork) setErrors({ cin: 'Vérifiez votre connexion internet' });
        else setErrors({ password: e.message });
      } else {
        setErrors({ password: 'Erreur inattendue. Réessayez.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = cin.trim().length > 0 && password.length > 0;

  return (
    <LinearGradient colors={Gradients.auth} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Ionicons name="medkit" size={32} color={Colors.surface} />
            </View>
            <Text style={styles.logo}>VacciKids</Text>
            <Text style={styles.subtitle}>Suivi vaccinal pédiatrique</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Bon retour 👋</Text>
            <Text style={styles.description}>
              Connectez-vous avec votre Carte d'Identité Nationale pour accéder à votre espace.
            </Text>

            <AppInput
              label="Carte d'Identité Nationale (CIN)"
              placeholder="Ex : AB123456"
              value={cin}
              onChangeText={(v) => { setCin(v); if (errors.cin) setErrors({ ...errors, cin: null }); }}
              error={errors.cin}
              touched={true}
              icon="card-outline"
              autoCapitalize="characters"
              accessibilityLabel="Numéro de Carte d'Identité Nationale"
            />

            <AppInput
              label="Mot de passe"
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: null }); }}
              error={errors.password}
              touched={true}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.forgotRow}
            >
              <Text style={styles.link}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <AppButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              disabled={!canSubmit}
              icon="log-in-outline"
              iconPosition="right"
            />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupBtn}>
              <Text style={styles.signupLink}>Créer un compte</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.accent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, paddingVertical: Spacing['4xl'] },
  brand: { alignItems: 'center', marginBottom: Spacing.xl },
  logoBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logo: { fontSize: 32, fontWeight: '800', color: Colors.textInverse, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii['2xl'],
    padding: Spacing.xl,
    ...Elevation.lg,
  },
  title: { ...Typography.title, marginBottom: 8, textAlign: 'left' },
  description: { ...Typography.body, marginBottom: Spacing.lg, lineHeight: 22 },
  forgotRow: { alignSelf: 'flex-end', marginBottom: Spacing.md, marginTop: -Spacing.xs },
  link: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl, flexWrap: 'wrap' },
  signupText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  signupBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 6, padding: 4 },
  signupLink: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
});