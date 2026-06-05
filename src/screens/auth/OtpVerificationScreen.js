import React, { useState, useEffect, useCallback, useContext } from 'react';
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
} from 'react-native';
import OtpInput from '../../components/OtpInput';
import { authService } from '../../services/authService';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import { accountCacheService } from '../../services/accountCacheService';
import { secureTokenService } from '../../services/secureTokenService';

const RESEND_DELAY = 60; // secondes

const translations = {
  fr: {
    title: 'Vérification',
    subtitle: (phone) => `Un code à 6 chiffres a été envoyé au\n${phone}`,
    codeLabel: 'Code de vérification',
    verifyBtn: 'Vérifier',
    resendIn: (s) => `Renvoyer dans ${s}s`,
    resendBtn: 'Renvoyer le code',
    changeNumber: 'Changer de numéro',
    verifying: 'Vérification...',
    errorInvalid: 'Code incomplet. Entrez les 6 chiffres.',
    hint: 'Vérifiez votre téléphone, y compris les SMS.',
  },
  ar: {
    title: 'التحقق',
    subtitle: (phone) => `تم إرسال رمز مكون من 6 أرقام إلى\n${phone}`,
    codeLabel: 'رمز التحقق',
    verifyBtn: 'تحقق',
    resendIn: (s) => `إعادة الإرسال خلال ${s}ث`,
    resendBtn: 'إعادة إرسال الرمز',
    changeNumber: 'تغيير الرقم',
    verifying: 'جارٍ التحقق...',
    errorInvalid: 'الرمز غير مكتمل. أدخل الأرقام الستة.',
    hint: 'تحقق من هاتفك، بما في ذلك الرسائل القصيرة.',
  },
};

const OtpVerificationScreen = ({ navigation, route }) => {
  const { phoneNumber, displayPhone, language = 'fr' } = route.params;
  const t = translations[language];
  const isRTL = language === 'ar';
  const { signIn } = useContext(AuthContext);

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [resendLoading, setResendLoading] = useState(false);

  // Compte à rebours pour le renvoi
  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = useCallback(async () => {
    if (otpCode.length < 6) {
      setHasError(true);
      Alert.alert('Erreur', t.errorInvalid);
      return;
    }

    setHasError(false);
    setLoading(true);

    try {
      const result = await authService.verifyOtp(phoneNumber, otpCode);

      await accountCacheService.purge();
      await secureTokenService.saveSession({
        accessToken: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
      });
      const fcmToken = await AsyncStorage.getItem('fcmToken');
      if (fcmToken) {
        await authService.registerFcmToken(result.token, fcmToken).catch((error) => {
          console.warn('FCM token registration failed:', error.message);
        });
      }

      // Navigation vers l'écran suivant
      if (result.user?.isNewUser) {
        navigation.replace('AddBaby'); // Nouvel utilisateur → ajout bébé
      } else {
        signIn(); // Utilisateur existant → accueil
      }
    } catch (error) {
      setHasError(true);
      Alert.alert('Code incorrect', error.message || 'Vérifiez le code et réessayez.');
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  }, [otpCode, phoneNumber, navigation, signIn, t]);

  // Auto-vérification quand les 6 chiffres sont saisis
  useEffect(() => {
    if (otpCode.length === 6 && !loading) {
      handleVerify();
    }
  }, [otpCode]);

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendLoading(true);
    try {
      await authService.sendOtp(phoneNumber);
      setResendTimer(RESEND_DELAY);
      setOtpCode('');
      setHasError(false);
      Alert.alert('', 'Un nouveau code vous a été envoyé.', [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setResendLoading(false);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Retour"
          >
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📱</Text>
          </View>
          <Text style={styles.appName}>VacciniKids</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t.title}</Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
            {t.subtitle(displayPhone || phoneNumber)}
          </Text>

          {/* Saisie OTP */}
          <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t.codeLabel}</Text>
          <OtpInput
            value={otpCode}
            onChange={(code) => {
              setOtpCode(code);
              setHasError(false);
            }}
            hasError={hasError}
          />

          {/* Indicateur d'erreur */}
          {hasError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>✕ Code incorrect. Vérifiez et réessayez.</Text>
            </View>
          )}

          {/* Bouton vérifier */}
          <TouchableOpacity
            style={[styles.btn, (loading || otpCode.length < 6) && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={loading || otpCode.length < 6}
            accessibilityRole="button"
          >
            {loading ? (
              <View style={styles.btnLoadingRow}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.btnText}>{t.verifying}</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>{t.verifyBtn}</Text>
            )}
          </TouchableOpacity>

          {/* Renvoi du code */}
          <TouchableOpacity
            style={[styles.resendBtn, resendTimer > 0 && styles.resendBtnDisabled]}
            onPress={handleResend}
            disabled={resendTimer > 0 || resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                {resendTimer > 0 ? t.resendIn(resendTimer) : t.resendBtn}
              </Text>
            )}
          </TouchableOpacity>

          {/* Changer de numéro */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.changeNumberBtn}>
            <Text style={styles.changeNumberText}>{t.changeNumber}</Text>
          </TouchableOpacity>

          {/* Aide */}
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>💡 {t.hint}</Text>
          </View>
        </View>

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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 34,
  },
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
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
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
    opacity: 0.45,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btnText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  resendBtnDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: colors.textHint,
    textDecorationLine: 'none',
  },
  changeNumberBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  changeNumberText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  hintBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  hintText: {
    color: colors.primaryDark,
    fontSize: typography.fontSizes.xs,
    lineHeight: typography.fontSizes.xs * typography.lineHeights.relaxed,
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

export default OtpVerificationScreen;
