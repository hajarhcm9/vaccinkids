import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { authService, ApiError } from '../../services';

export default function ResetPasswordScreen({ route, navigation }) {
  const cin = route.params?.cin || '';
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!otp.trim() || otp.length < 4) e.otp = 'Code invalide';
    if (!password || password.length < 6) e.password = 'Minimum 6 caractères';
    if (password !== confirm) e.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.resetPassword({ cin, otp: otp.trim(), password });
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 400) setErrors({ otp: 'Code incorrect ou expiré' });
        else if (e.isNetwork) setErrors({ otp: 'Vérifiez votre connexion internet' });
        else setErrors({ otp: e.message || 'Erreur inattendue' });
      } else {
        setErrors({ otp: 'Erreur inattendue. Réessayez.' });
      }
    } finally {
      setLoading(false);
    }
  };

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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.surface} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={36} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Réinitialisation</Text>
          <Text style={styles.desc}>
            Entrez le code reçu par SMS et choisissez un nouveau mot de passe.
          </Text>

          <View style={styles.card}>
            <AppInput
              label="Code OTP"
              placeholder="Code à 6 chiffres"
              value={otp}
              onChangeText={(v) => { setOtp(v); setErrors({ ...errors, otp: null }); }}
              error={errors.otp}
              touched={!!errors.otp}
              icon="keypad-outline"
              keyboardType="number-pad"
              maxLength={6}
            />
            <AppInput
              label="Nouveau mot de passe"
              placeholder="Minimum 6 caractères"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors({ ...errors, password: null, confirm: null }); }}
              error={errors.password}
              touched={!!errors.password}
              icon="lock-closed-outline"
              secureTextEntry
            />
            <AppInput
              label="Confirmer le mot de passe"
              placeholder="Répétez le mot de passe"
              value={confirm}
              onChangeText={(v) => { setConfirm(v); setErrors({ ...errors, confirm: null }); }}
              error={errors.confirm}
              touched={!!errors.confirm}
              icon="lock-closed-outline"
              secureTextEntry
            />
            <AppButton
              title={loading ? 'Réinitialisation…' : 'Réinitialiser'}
              onPress={handleReset}
              loading={loading}
              disabled={!otp.trim() || !password || !confirm}
              icon="checkmark-outline"
              iconPosition="right"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xl, paddingVertical: Spacing['3xl'] },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xl },
  backText: { color: Colors.surface, fontSize: 14, fontWeight: '600' },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  title: { ...Typography.display, color: Colors.textInverse, textAlign: 'center', marginBottom: Spacing.sm },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.xl, ...Elevation.lg },
});
