import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  I18nManager,
} from 'react-native';
import PhoneInput from '../../components/PhoneInput';
import { authService } from '../../services/authService';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const LANGUAGES = [
  { code: 'fr', label: 'Français', isRTL: false },
  { code: 'ar', label: 'العربية', isRTL: true },
];

const translations = {
  fr: {
    appName: 'VacciniKids',
    tagline: 'Suivi vaccinal de votre enfant',
    welcome: 'Bienvenue',
    subtitle: 'Entrez votre numéro de téléphone pour continuer',
    phoneLabel: 'Numéro de téléphone',
    continueBtn: 'Continuer',
    termsText: 'En continuant, vous acceptez nos',
    termsLink: 'Conditions d\'utilisation',
    andText: 'et notre',
    privacyLink: 'Politique de confidentialité',
    phoneRequired: 'Veuillez entrer votre numéro de téléphone.',
    phoneInvalid: 'Numéro de téléphone invalide (9 à 10 chiffres requis).',
  },
  ar: {
    appName: 'VacciniKids',
    tagline: 'متابعة تطعيم طفلك',
    welcome: 'مرحباً بك',
    subtitle: 'أدخل رقم هاتفك للمتابعة',
    phoneLabel: 'رقم الهاتف',
    continueBtn: 'متابعة',
    termsText: 'بالمتابعة، أنت توافق على',
    termsLink: 'شروط الاستخدام',
    andText: 'و',
    privacyLink: 'سياسة الخصوصية',
    phoneRequired: 'يرجى إدخال رقم الهاتف.',
    phoneInvalid: 'رقم الهاتف غير صالح (9 إلى 10 أرقام مطلوبة).',
  },
};

const LoginScreen = ({ navigation }) => {
  const [language, setLanguage] = useState('fr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const phoneInputRef = useRef(null);

  const isRTL = LANGUAGES.find((l) => l.code === language)?.isRTL || false;
  const t = translations[language];

  const validatePhone = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Erreur', t.phoneRequired);
      return false;
    }
    if (phoneNumber.length < 9 || phoneNumber.length > 10) {
      Alert.alert('Erreur', t.phoneInvalid);
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone()) return;

    setLoading(true);
    try {
      const fullNumber = `+212${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;
      await authService.sendOtp(fullNumber);

      navigation.navigate('OtpVerification', {
        phoneNumber: fullNumber,
        displayPhone: phoneNumber,
        language,
      });
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const switchLanguage = (code) => {
    setLanguage(code);
    // En production : I18nManager.forceRTL(isRTL) + restart app
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
        {/* Header avec logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>💉</Text>
            </View>
          </View>
          <Text style={styles.appName}>{t.appName}</Text>
          <Text style={styles.tagline}>{t.tagline}</Text>
        </View>

        {/* Card principale */}
        <View style={styles.card}>
          {/* Sélecteur de langue */}
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langBtn,
                  language === lang.code && styles.langBtnActive,
                ]}
                onPress={() => switchLanguage(lang.code)}
                accessibilityLabel={`Changer la langue en ${lang.label}`}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    language === lang.code && styles.langBtnTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.welcome, isRTL && styles.textRTL]}>{t.welcome}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t.subtitle}</Text>

          {/* Champ téléphone */}
          <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.phoneLabel}</Text>
          <PhoneInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onSubmitEditing={handleSendOtp}
            inputRef={phoneInputRef}
            isRTL={isRTL}
          />

          {/* Bouton continuer */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t.continueBtn}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.btnText}>{t.continueBtn}</Text>
            )}
          </TouchableOpacity>

          {/* CGU */}
          <Text style={[styles.terms, isRTL && styles.textRTL]}>
            {t.termsText}{' '}
            <Text style={styles.link}>{t.termsLink}</Text>{' '}
            {t.andText}{' '}
            <Text style={styles.link}>{t.privacyLink}</Text>
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Centre Es-Salaam · Province d'Oujda</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoEmoji: {
    fontSize: 34,
  },
  appName: {
    fontSize: typography.fontSizes.xxxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.fontSizes.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: typography.fontWeights.regular,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  langRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.xl,
  },
  langBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  langBtnActive: {
    backgroundColor: colors.white,
    ...shadows.card,
  },
  langBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  langBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  welcome: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.button,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
  terms: {
    fontSize: typography.fontSizes.xs,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: typography.fontSizes.xs * typography.lineHeights.relaxed,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default LoginScreen;