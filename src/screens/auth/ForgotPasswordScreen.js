import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { authService } from '../../services/authService';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const clean = phone.replace(/\s/g, '');
    if (!clean || clean.length < 9) {
      Alert.alert('Erreur', 'Entrez votre numéro de téléphone (9 à 10 chiffres).');
      return;
    }
    setLoading(true);
    try {
      const fullNumber = `+212${clean.startsWith('0') ? clean.slice(1) : clean}`;
      await authService.sendOtp(fullNumber);
      navigation.navigate('OtpVerification', {
        phoneNumber: fullNumber,
        displayPhone: clean,
        language: 'fr',
      });
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible d\'envoyer le code. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔑</Text>
          </View>
          <Text style={styles.appName}>VacciniKids</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Accès à votre compte</Text>
          <Text style={styles.subtitle}>
            Entrez votre numéro de téléphone pour recevoir un code de vérification.
          </Text>

          <Text style={styles.label}>Numéro de téléphone</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>+212</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="6 12 34 56 78"
              placeholderTextColor={colors.textHint}
              keyboardType="phone-pad"
              maxLength={10}
              onSubmitEditing={handleSend}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (loading || !phone.trim()) && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading || !phone.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.btnText}>Envoyer le code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Service parental VacciniKids</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxxl },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.lg,
  },
  icon:    { fontSize: 34 },
  appName: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.xl,
  },
  prefix: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    height: '100%',
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textDecorationLine: 'underline',
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
  },
});
