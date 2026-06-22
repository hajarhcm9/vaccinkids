import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';

export default function ForgotScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [email,    setEmail]    = useState('');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { setError('Entrez votre adresse email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse email invalide');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotNumero(email.trim());
      setSent(true);
    } catch (e) {
      if (e instanceof ApiError && e.isNetwork) {
        setError('Impossible de joindre le serveur. Vérifiez votre connexion Wi-Fi.');
      } else {
        setError(e?.message || 'Erreur inattendue. Réessayez.');
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
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="always"
          bounces={false}
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.iconRing}>
              <Ionicons name="mail-outline" size={34} color={Colors.white} />
            </View>
            <Text style={styles.title}>Numéro oublié ?</Text>
            <Text style={styles.subtitle}>
              Entrez l'email associé à votre compte.{'\n'}
              Nous vous enverrons les numéros de vos enfants.
            </Text>
          </View>

          {sent ? (
            /* ── Success state ── */
            <View style={styles.card}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Email envoyé !</Text>
              <Text style={styles.successText}>
                Si un compte correspond à{' '}
                <Text style={{ fontWeight: '700' }}>{email.trim()}</Text>
                {', vous recevrez les numéros de vos enfants dans quelques minutes.'}
              </Text>
              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                <Text style={styles.backToLoginText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form ── */
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Adresse email</Text>
              <View style={[styles.fieldRow, error && styles.fieldRowError]}>
                <View style={styles.fieldIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={error ? Colors.danger : Colors.primary}
                  />
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="votre@email.com"
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                  autoFocus
                />
              </View>
              {error && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
                <Text style={styles.infoText}>
                  L'email doit correspondre à celui renseigné lors de la création de votre profil.
                </Text>
              </View>

              <AppButton
                title="Envoyer"
                onPress={handleSend}
                loading={loading}
                disabled={loading || !email.trim()}
                icon="send-outline"
                iconPosition="right"
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl },

  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xl },
  backText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },

  headerBlock: { alignItems: 'center', marginBottom: Spacing.xl },
  iconRing:    { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title:       { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: Spacing.sm },
  subtitle:    { fontSize: 13, color: 'rgba(255,255,255,0.70)', textAlign: 'center', lineHeight: 19 },

  card:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.xl, ...Elevation.xl },
  inputLabel:{ fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },

  fieldRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted, overflow: 'hidden' },
  fieldRowError: { borderColor: Colors.danger },
  fieldIcon:     { paddingHorizontal: 14, paddingVertical: 14 },
  fieldInput:    { flex: 1, paddingRight: 14, paddingVertical: 14, fontSize: 15, color: Colors.text },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6, marginBottom: 2 },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500', flex: 1, lineHeight: 17 },

  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm, marginTop: Spacing.md },
  infoText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },

  // Success
  successIcon:     { alignItems: 'center', marginBottom: Spacing.md },
  successTitle:    { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  successText:     { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xl },
  backToLogin:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backToLoginText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
