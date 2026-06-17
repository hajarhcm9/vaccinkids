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

export default function ForgotPasswordScreen({ navigation }) {
  const [cin, setCin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const clean = cin.replace(/\s/g, '').toUpperCase();
    if (!clean || clean.length < 6) {
      setError('Veuillez saisir votre CIN (6 caractères minimum)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(clean);
      navigation.navigate('ResetPassword', { cin: clean });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404) setError('Aucun compte trouvé pour ce CIN');
        else if (e.isNetwork) setError('Vérifiez votre connexion internet');
        else setError(e.message || 'Erreur inattendue. Réessayez.');
      } else {
        setError('Erreur inattendue. Réessayez.');
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
            <Ionicons name="lock-open-outline" size={36} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.desc}>
            Saisissez votre numéro de CIN. Nous vous enverrons un code de réinitialisation par SMS.
          </Text>

          <View style={styles.card}>
            <AppInput
              label="Carte d'Identité Nationale (CIN)"
              placeholder="Ex : AB123456"
              value={cin}
              onChangeText={(v) => { setCin(v); setError(''); }}
              error={error}
              touched={!!error}
              icon="card-outline"
              autoCapitalize="characters"
            />
            <AppButton
              title={loading ? 'Envoi…' : 'Envoyer le code'}
              onPress={handleSend}
              loading={loading}
              disabled={!cin.trim()}
              icon="send-outline"
              iconPosition="right"
            />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
            <Text style={styles.loginText}>Retour à la connexion</Text>
          </TouchableOpacity>
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
  loginRow: { alignItems: 'center', marginTop: Spacing.xl },
  loginText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
});
