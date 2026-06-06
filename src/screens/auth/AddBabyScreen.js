import React, { useContext, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AppInput, AppButton, SegmentedControl } from '../../components/FormComponents';
import DatePickerInput from '../../components/DatePickerInput';
import { babyService } from '../../services/babyService';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { AuthContext } from '../../context/AuthContext';

// ─── Traductions ───────────────────────────────────────────────
const translations = {
  fr: {
    title: 'Ajouter un bébé',
    subtitle: 'Renseignez les informations de votre enfant',
    stepLabel: (s, t) => `Étape ${s} sur ${t}`,
    // Champs
    firstNameLabel: 'Prénom *',
    firstNamePlaceholder: 'Ex : Youssef',
    lastNameLabel: 'Nom de famille *',
    lastNamePlaceholder: 'Ex : Benali',
    birthDateLabel: 'Date de naissance *',
    genderLabel: 'Sexe *',
    genderMale: 'Garçon',
    genderFemale: 'Fille',
    // Boutons
    nextBtn: 'Suivant',
    prevBtn: 'Retour',
    submitBtn: 'Enregistrer',
    submitting: 'Enregistrement...',
    skipBtn: 'Passer cette étape',
    // Validation
    firstNameRequired: 'Le prénom est obligatoire.',
    firstNameMin: 'Le prénom doit contenir au moins 2 caractères.',
    lastNameRequired: 'Le nom de famille est obligatoire.',
    lastNameMin: 'Le nom doit contenir au moins 2 caractères.',
    birthDateRequired: 'La date de naissance est obligatoire.',
    birthDateFuture: 'La date de naissance ne peut pas être dans le futur.',
    birthDateTooOld: 'La date de naissance semble incorrecte (> 5 ans).',
    genderRequired: 'Veuillez sélectionner le sexe.',
    // Succès
    successTitle: 'Bébé ajouté !',
    successMsg: (name) => `Le profil de ${name} a été créé avec succès.`,
    // Résumé
    summaryTitle: 'Vérification',
    summarySubtitle: "Confirmez les informations avant d'enregistrer",
    name: 'Nom complet',
    birthDate: 'Date de naissance',
    gender: 'Sexe',
    male: 'Garçon',
    female: 'Fille',
    editBtn: 'Modifier',
  },
  ar: {
    title: 'إضافة طفل',
    subtitle: 'أدخل معلومات طفلك',
    stepLabel: (s, t) => `الخطوة ${s} من ${t}`,
    firstNameLabel: 'الاسم الأول *',
    firstNamePlaceholder: 'مثال: يوسف',
    lastNameLabel: 'اسم العائلة *',
    lastNamePlaceholder: 'مثال: بنعلي',
    birthDateLabel: 'تاريخ الميلاد *',
    genderLabel: 'الجنس *',
    genderMale: 'ولد',
    genderFemale: 'بنت',
    nextBtn: 'التالي',
    prevBtn: 'رجوع',
    submitBtn: 'حفظ',
    submitting: 'جارٍ الحفظ...',
    skipBtn: 'تخطي هذه الخطوة',
    firstNameRequired: 'الاسم الأول مطلوب.',
    firstNameMin: 'يجب أن يحتوي الاسم الأول على حرفين على الأقل.',
    lastNameRequired: 'اسم العائلة مطلوب.',
    lastNameMin: 'يجب أن يحتوي الاسم على حرفين على الأقل.',
    birthDateRequired: 'تاريخ الميلاد مطلوب.',
    birthDateFuture: 'لا يمكن أن يكون تاريخ الميلاد في المستقبل.',
    birthDateTooOld: 'يبدو تاريخ الميلاد غير صحيح (أكثر من 5 سنوات).',
    genderRequired: 'يرجى اختيار الجنس.',
    successTitle: 'تمت الإضافة!',
    successMsg: (name) => `تم إنشاء ملف ${name} بنجاح.`,
    summaryTitle: 'المراجعة',
    summarySubtitle: 'تأكد من المعلومات قبل الحفظ',
    name: 'الاسم الكامل',
    birthDate: 'تاريخ الميلاد',
    gender: 'الجنس',
    male: 'ولد',
    female: 'بنت',
    editBtn: 'تعديل',
  },
};

const TOTAL_STEPS = 3;

// ─── Composant principal ───────────────────────────────────────
const AddBabyScreen = ({ navigation, route }) => {
  const { signIn } = useContext(AuthContext);
  const language = route?.params?.language || 'fr';
  const isRTL = language === 'ar';
  const t = translations[language];

  // État du formulaire
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const lastNameRef = useRef(null);

  // ─── Mise à jour champ ───
  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  // ─── Validation par étape ───
  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!form.firstName.trim()) newErrors.firstName = t.firstNameRequired;
      else if (form.firstName.trim().length < 2) newErrors.firstName = t.firstNameMin;
      if (!form.lastName.trim()) newErrors.lastName = t.lastNameRequired;
      else if (form.lastName.trim().length < 2) newErrors.lastName = t.lastNameMin;
    }
    if (s === 2) {
      if (!form.birthDate) newErrors.birthDate = t.birthDateRequired;
      else {
        const bd = new Date(form.birthDate);
        const now = new Date();
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(now.getFullYear() - 5);
        if (bd > now) newErrors.birthDate = t.birthDateFuture;
        else if (bd < fiveYearsAgo) newErrors.birthDate = t.birthDateTooOld;
      }
      if (!form.gender) newErrors.gender = t.genderRequired;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Navigation entre étapes ───
  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((s) => s - 1);
    }
  };

  // ─── Soumission finale ───
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await babyService.addBaby({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate,
        gender: form.gender,
      });
      await babyService.getBabies();

      Alert.alert(t.successTitle, t.successMsg(form.firstName), [
        {
          text: 'OK',
          onPress: signIn,
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Calcul de l'âge pour le résumé ───
  const getAge = (birthDate) => {
    if (!birthDate) return '';
    const bd = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth());
    if (months < 1) return language === 'fr' ? '< 1 mois' : '< شهر';
    if (months < 12) return language === 'fr' ? `${months} mois` : `${months} أشهر`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return language === 'fr'
      ? `${years} an${years > 1 ? 's' : ''}${rem > 0 ? ` ${rem} mois` : ''}`
      : `${years} سنة${rem > 0 ? ` ${rem} أشهر` : ''}`;
  };

  const formatDateDisplay = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = {
      fr: ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'],
      ar: [
        'يناير',
        'فبراير',
        'مارس',
        'أبريل',
        'مايو',
        'يونيو',
        'يوليو',
        'أغسطس',
        'سبتمبر',
        'أكتوبر',
        'نوفمبر',
        'ديسمبر',
      ],
    };
    return `${day} ${months[language][parseInt(m) - 1]} ${y}`;
  };

  // ─── Rendu ───
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <Text style={styles.headerSub}>{t.stepLabel(step, TOTAL_STEPS)}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i < step && styles.progressSegmentActive,
              i === step - 1 && styles.progressSegmentCurrent,
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── ÉTAPE 1 : Identité ── */}
        {step === 1 && (
          <View>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>👶</Text>
            </View>
            <Text style={[styles.stepTitle, isRTL && styles.rtl]}>
              {language === 'fr' ? 'Identité du bébé' : 'هوية الطفل'}
            </Text>
            <Text style={[styles.stepSubtitle, isRTL && styles.rtl]}>
              {language === 'fr'
                ? 'Ces informations seront utilisées pour son carnet de santé.'
                : 'ستُستخدم هذه المعلومات في دفتر صحته.'}
            </Text>

            <AppInput
              label={t.firstNameLabel}
              value={form.firstName}
              onChangeText={(v) => setField('firstName', v)}
              placeholder={t.firstNamePlaceholder}
              error={errors.firstName}
              isRTL={isRTL}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              autoCapitalize="words"
              maxLength={50}
            />

            <AppInput
              label={t.lastNameLabel}
              value={form.lastName}
              onChangeText={(v) => setField('lastName', v)}
              placeholder={t.lastNamePlaceholder}
              error={errors.lastName}
              isRTL={isRTL}
              inputRef={lastNameRef}
              returnKeyType="done"
              autoCapitalize="words"
              maxLength={50}
            />
          </View>
        )}

        {/* ── ÉTAPE 2 : Naissance & Sexe ── */}
        {step === 2 && (
          <View>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>🗓️</Text>
            </View>
            <Text style={[styles.stepTitle, isRTL && styles.rtl]}>
              {language === 'fr' ? 'Naissance & Sexe' : 'الميلاد والجنس'}
            </Text>
            <Text style={[styles.stepSubtitle, isRTL && styles.rtl]}>
              {language === 'fr'
                ? 'Nécessaire pour adapter le calendrier vaccinal.'
                : 'ضروري لتكييف جدول التطعيم.'}
            </Text>

            <DatePickerInput
              label={t.birthDateLabel}
              value={form.birthDate}
              onChange={(v) => setField('birthDate', v)}
              isRTL={isRTL}
              lang={language}
              error={errors.birthDate}
            />

            <SegmentedControl
              label={t.genderLabel}
              value={form.gender}
              onChange={(v) => setField('gender', v)}
              isRTL={isRTL}
              error={errors.gender}
              options={[
                { value: 'male', label: t.genderMale, icon: '👦' },
                { value: 'female', label: t.genderFemale, icon: '👧' },
              ]}
            />
          </View>
        )}

        {/* ── ÉTAPE 3 : Résumé ── */}
        {step === 3 && (
          <View>
            <View style={styles.stepIcon}>
              <Text style={styles.stepEmoji}>✓</Text>
            </View>
            <Text style={[styles.stepTitle, isRTL && styles.rtl]}>
              {language === 'fr' ? 'Confirmation' : 'التأكيد'}
            </Text>
            <Text style={[styles.stepSubtitle, isRTL && styles.rtl]}>
              {language === 'fr'
                ? 'Vérifiez les informations avant enregistrement.'
                : 'تحقق من المعلومات قبل الحفظ.'}
            </Text>

            {/* Résumé */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>{t.summaryTitle}</Text>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={styles.editBtn}>{t.editBtn}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.summaryAvatar}>
                <View style={styles.summaryAvatarPlaceholder}>
                  <Text style={styles.summaryAvatarEmoji}>
                    {form.gender === 'male' ? '👦' : form.gender === 'female' ? '👧' : '👶'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.summaryName}>
                    {form.firstName} {form.lastName}
                  </Text>
                  <Text style={styles.summaryAge}>{getAge(form.birthDate)}</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              {[
                { label: t.name, value: `${form.firstName} ${form.lastName}` },
                { label: t.birthDate, value: formatDateDisplay(form.birthDate) },
                { label: t.gender, value: form.gender === 'male' ? t.male : t.female },
              ].map((row) => (
                <View key={row.label} style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Boutons de navigation ── */}
        <View style={styles.btnRow}>
          {step < TOTAL_STEPS ? (
            <AppButton label={t.nextBtn} onPress={handleNext} />
          ) : (
            <AppButton
              label={loading ? t.submitting : t.submitBtn}
              onPress={handleSubmit}
              loading={loading}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 22,
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  headerSub: {
    fontSize: typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressSegmentActive: {
    backgroundColor: colors.white,
  },
  progressSegmentCurrent: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  stepEmoji: { fontSize: 30 },
  stepTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.fontSizes.sm * 1.6,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  photoBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    gap: spacing.xs,
  },
  photoPlaceholderIcon: { fontSize: 28 },
  photoPlaceholderText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  changePhotoText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  editBtn: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  summaryAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  summaryAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAvatarEmoji: { fontSize: 26 },
  summaryName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  summaryAge: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryRowRTL: { flexDirection: 'row-reverse' },
  summaryLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textPrimary,
  },
  btnRow: { marginTop: spacing.lg },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  skipText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});

export default AddBabyScreen;
