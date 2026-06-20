import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';
import { authService, ApiError } from '../../services';

const ProfileSchema = Yup.object().shape({
  nom:    Yup.string().min(2, 'Nom trop court').required('Le nom est obligatoire'),
  prenom: Yup.string().min(2, 'Prénom trop court').required('Le prénom est obligatoire'),
  email:  Yup.string().email('Email invalide').notRequired(),
});

export default function ProfileSetupScreen({ route }) {
  const { login } = useContext(AuthContext);
  const token        = route.params?.token        || null;
  const refreshToken = route.params?.refreshToken || null;
  const userFromOtp  = route.params?.user         || null;
  // centreOnly = true when returning parent has no centre yet
  const centreOnly   = route.params?.centreOnly   === true;
  const cinFromLogin = route.params?.cin          || null;

  const [centres,     setCentres]     = useState([]);
  const [loadingCent, setLoadingCent] = useState(true);
  const [selCentre,   setSelCentre]   = useState(null);
  const [centreError, setCentreError] = useState('');
  const [savingCentre, setSavingCentre] = useState(false);

  useEffect(() => {
    authService.listPublicCentres()
      .then((data) => setCentres(Array.isArray(data) ? data : []))
      .catch(() => setCentres([]))
      .finally(() => setLoadingCent(false));
  }, []);

  // Centre-only path (returning parent without centre)
  const handleSaveCentreOnly = async () => {
    if (!selCentre) { setCentreError('Veuillez choisir votre centre de santé'); return; }
    setCentreError('');
    setSavingCentre(true);
    try {
      await authService.updateProfile({ centre_id: selCentre.id });
      const updatedUser = { ...userFromOtp, centre_id: selCentre.id, centre_nom: selCentre.nom };
      await login(token, updatedUser, refreshToken);
    } catch (e) {
      setCentreError(e instanceof ApiError ? e.message : 'Erreur inattendue. Réessayez.');
    } finally {
      setSavingCentre(false);
    }
  };

  // Full registration path (new parent)
  const handleSave = async (values, { setSubmitting, setErrors }) => {
    if (!selCentre) {
      setCentreError('Veuillez choisir votre centre de santé');
      setSubmitting(false);
      return;
    }
    setCentreError('');
    setSubmitting(true);
    try {
      const resp = await authService.completeProfile({
        nom:       values.nom.trim(),
        prenom:    values.prenom.trim(),
        cin:       cinFromLogin || values.cin?.trim().toUpperCase(),
        email:     values.email.trim() || undefined,
        centre_id: selCentre.id,
      });
      const updatedUser = resp?.user || { ...userFromOtp, ...values, centre_id: selCentre.id };
      await AsyncStorage.setItem('new_parent_registration', 'true');
      await login(token, updatedUser, refreshToken);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isValidation && e.details?.fields) setErrors(e.details.fields);
        else if (e.isNetwork) setErrors({ nom: 'Vérifiez votre connexion internet' });
        else setErrors({ nom: e.message });
      } else {
        setErrors({ nom: 'Erreur inattendue. Réessayez.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Centre-only mode (returning parent without centre) ───────────────────
  if (centreOnly) {
    return (
      <LinearGradient colors={Gradients.auth} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="location" size={40} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Votre centre</Text>
          <Text style={styles.description}>
            Choisissez le centre de santé où vous souhaitez faire vacciner votre enfant. Ce choix est définitif.
          </Text>

          <View style={styles.card}>
            <View style={styles.centreSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical-outline" size={15} color={Colors.primary} />
                <Text style={styles.sectionLabel}>Centre de santé *</Text>
              </View>
              <Text style={styles.centreHint}>
                Tous vos rendez-vous et carnets de vaccination seront gérés dans ce centre.
              </Text>

              {loadingCent ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
              ) : centres.length === 0 ? (
                <Text style={styles.centreEmpty}>Aucun centre disponible pour le moment.</Text>
              ) : (
                <View style={styles.centreList}>
                  {centres.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.centreRow, selCentre?.id === c.id && styles.centreRowActive]}
                      onPress={() => { setSelCentre(c); setCentreError(''); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.centreRadio, selCentre?.id === c.id && styles.centreRadioActive]}>
                        {selCentre?.id === c.id && <View style={styles.centreRadioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.centreName, selCentre?.id === c.id && { color: Colors.primary }]}>
                          {c.nom}
                        </Text>
                        {!!c.adresse && <Text style={styles.centreAddr}>{c.adresse}</Text>}
                      </View>
                      {selCentre?.id === c.id && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!!centreError && (
                <View style={styles.centreErrorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.centreErrorText}>{centreError}</Text>
                </View>
              )}
            </View>

            <AppButton
              title={savingCentre ? 'Enregistrement…' : 'Confirmer et continuer'}
              onPress={handleSaveCentreOnly}
              loading={savingCentre}
              disabled={savingCentre || !selCentre}
              icon="arrow-forward"
              iconPosition="right"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── Full registration mode (new parent) ──────────────────────────────────
  return (
    <LinearGradient colors={Gradients.auth} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="person-add" size={40} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Bienvenue !</Text>
          <Text style={styles.description}>
            Renseignez votre nom et choisissez votre centre — c'est tout.
          </Text>

          <View style={styles.card}>
            {/* CIN verified badge — shown if CIN came from login step */}
            {cinFromLogin && (
              <View style={styles.cinBadge}>
                <Ionicons name="card-outline" size={15} color={Colors.success} />
                <Text style={styles.cinBadgeText}>CIN vérifiée : <Text style={{ fontWeight: '800' }}>{cinFromLogin}</Text></Text>
                <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
              </View>
            )}

            <Formik
              initialValues={{ nom: '', prenom: '', email: '' }}
              validationSchema={ProfileSchema}
              onSubmit={handleSave}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <>
                  <AppInput
                    label="Nom *"
                    placeholder="Votre nom de famille"
                    value={values.nom}
                    onChangeText={handleChange('nom')}
                    onBlur={handleBlur('nom')}
                    error={errors.nom}
                    touched={touched.nom}
                    icon="person-outline"
                    autoCapitalize="words"
                  />
                  <AppInput
                    label="Prénom *"
                    placeholder="Votre prénom"
                    value={values.prenom}
                    onChangeText={handleChange('prenom')}
                    onBlur={handleBlur('prenom')}
                    error={errors.prenom}
                    touched={touched.prenom}
                    autoCapitalize="words"
                  />

                  {/* Centre de santé */}
                  <View style={styles.centreSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="medical-outline" size={15} color={Colors.primary} />
                      <Text style={styles.sectionLabel}>Centre de santé *</Text>
                    </View>
                    <Text style={styles.centreHint}>
                      Choisissez le centre où votre enfant sera suivi. Tous ses rendez-vous se feront ici.
                    </Text>

                    {loadingCent ? (
                      <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
                    ) : centres.length === 0 ? (
                      <Text style={styles.centreEmpty}>Aucun centre disponible pour le moment.</Text>
                    ) : (
                      <View style={styles.centreList}>
                        {centres.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.centreRow, selCentre?.id === c.id && styles.centreRowActive]}
                            onPress={() => { setSelCentre(c); setCentreError(''); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.centreRadio, selCentre?.id === c.id && styles.centreRadioActive]}>
                              {selCentre?.id === c.id && <View style={styles.centreRadioDot} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.centreName, selCentre?.id === c.id && { color: Colors.primary }]}>
                                {c.nom}
                              </Text>
                              {!!c.adresse && (
                                <Text style={styles.centreAddr}>{c.adresse}</Text>
                              )}
                            </View>
                            {selCentre?.id === c.id && (
                              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {!!centreError && (
                      <View style={styles.centreErrorRow}>
                        <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                        <Text style={styles.centreErrorText}>{centreError}</Text>
                      </View>
                    )}
                  </View>

                  {/* Email — optional */}
                  <View style={styles.emailSection}>
                    <View style={styles.emailHeader}>
                      <Ionicons name="mail-outline" size={15} color={Colors.primary} />
                      <Text style={styles.emailLabel}>Email (facultatif)</Text>
                      <View style={styles.optionalBadge}>
                        <Text style={styles.optionalText}>Facultatif</Text>
                      </View>
                    </View>
                    <AppInput
                      placeholder="votre@gmail.com"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      error={errors.email}
                      touched={touched.email}
                      icon="mail-outline"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                    />
                    <Text style={styles.emailHint}>
                      Appuyez sur votre email suggéré par le clavier pour le remplir automatiquement.
                    </Text>
                  </View>

                  <AppButton
                    title={isSubmitting ? 'Enregistrement…' : 'Commencer'}
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    icon="arrow-forward"
                    iconPosition="right"
                    style={{ marginTop: Spacing.sm }}
                  />
                </>
              )}
            </Formik>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, paddingVertical: Spacing['3xl'] },

  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  title:       { fontSize: 28, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: Spacing.sm },
  description: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xl },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii['2xl'],
    padding: Spacing.xl,
    ...Elevation.lg,
  },

  cinBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.successBg, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  cinBadgeText:    { flex: 1, fontSize: 13, color: Colors.success, fontWeight: '500' },

  centreSection:   { marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionLabel:    { fontSize: 13, fontWeight: '700', color: Colors.text },
  centreHint:      { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: Spacing.sm },
  centreEmpty:     { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginVertical: Spacing.md },
  centreList:      { gap: Spacing.sm },
  centreRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.background, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border },
  centreRowActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreRadio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  centreRadioActive: { borderColor: Colors.primary },
  centreRadioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  centreName:      { fontSize: 13, fontWeight: '700', color: Colors.text },
  centreAddr:      { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  centreErrorRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm },
  centreErrorText: { fontSize: 12, color: Colors.danger, fontWeight: '500' },

  emailSection: { marginTop: Spacing.md },
  emailHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  emailLabel:   { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  optionalBadge:{ backgroundColor: Colors.primaryTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.pill },
  optionalText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  emailHint:    { fontSize: 11, color: Colors.textLight, marginTop: 4, lineHeight: 16 },
});
