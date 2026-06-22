import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, ActivityIndicator, TextInput,
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

// ── Centre picker ─────────────────────────────────────────────────────────────

function CentrePicker({ centres, loading, selCentre, onSelect, error }) {
  const [search, setSearch] = useState('');

  // Auto-select when there's exactly one centre
  useEffect(() => {
    if (centres.length === 1 && !selCentre) {
      onSelect(centres[0]);
    }
  }, [centres]);

  const filtered = useMemo(() => {
    if (!search.trim()) return centres;
    const q = search.toLowerCase();
    return centres.filter(
      (c) => c.nom?.toLowerCase().includes(q) || c.adresse?.toLowerCase().includes(q),
    );
  }, [centres, search]);

  if (loading) {
    return <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />;
  }

  if (centres.length === 0) {
    return <Text style={styles.centreEmpty}>Aucun centre disponible pour le moment.</Text>;
  }

  // Single centre — show as auto-selected badge, no picker needed
  if (centres.length === 1) {
    const c = centres[0];
    return (
      <View style={styles.centreAutoRow}>
        <View style={styles.centreAutoIcon}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.centreAutoName}>{c.nom}</Text>
          {c.adresse ? <Text style={styles.centreAutoAddr}>{c.adresse}</Text> : null}
        </View>
      </View>
    );
  }

  // Multiple centres — searchable list
  return (
    <>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un centre…"
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centreList}>
        {filtered.length === 0 ? (
          <Text style={styles.centreEmpty}>Aucun centre trouvé pour "{search}"</Text>
        ) : (
          filtered.map((c) => {
            const active = selCentre?.id === c.id;
            return (
              <TouchableOpacity
                key={String(c.id)}
                style={[styles.centreRow, active && styles.centreRowActive]}
                onPress={() => onSelect(c)}
                activeOpacity={0.75}
              >
                <View style={[styles.centreRadio, active && styles.centreRadioActive]}>
                  {active && <View style={styles.centreRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.centreName, active && { color: Colors.primary }]}>
                    {c.nom}
                  </Text>
                  {c.adresse ? <Text style={styles.centreAddr}>{c.adresse}</Text> : null}
                </View>
                {active && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileSetupScreen({ route }) {
  const { login } = useContext(AuthContext);
  const token        = route.params?.token        || null;
  const refreshToken = route.params?.refreshToken || null;
  const userFromOtp  = route.params?.user         || null;
  const centreOnly   = route.params?.centreOnly   === true;
  const cinFromLogin = route.params?.cin          || null;

  const [centres,      setCentres]      = useState([]);
  const [loadingCent,  setLoadingCent]  = useState(true);
  const [selCentre,    setSelCentre]    = useState(null);
  const [centreError,  setCentreError]  = useState('');
  const [savingCentre, setSavingCentre] = useState(false);

  useEffect(() => {
    authService.listPublicCentres()
      .then((data) => setCentres(Array.isArray(data) ? data : []))
      .catch(() => setCentres([]))
      .finally(() => setLoadingCent(false));
  }, []);

  const handleSelectCentre = (c) => {
    setSelCentre(c);
    setCentreError('');
  };

  // ── Centre-only path ─────────────────────────────────────────────────────

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

  // ── Full registration path ───────────────────────────────────────────────

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
        else if (e.isNetwork) setErrors({ nom: 'Impossible de joindre le serveur. Vérifiez votre connexion Wi-Fi.' });
        else setErrors({ nom: e.message });
      } else {
        setErrors({ nom: 'Erreur inattendue. Réessayez.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Centre section shared JSX ────────────────────────────────────────────

  const CentreSection = ({ hint }) => (
    <View style={styles.centreSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name="medical-outline" size={15} color={Colors.primary} />
        <Text style={styles.sectionLabel}>Centre de santé *</Text>
      </View>
      <Text style={styles.centreHint}>{hint}</Text>
      <CentrePicker
        centres={centres}
        loading={loadingCent}
        selCentre={selCentre}
        onSelect={handleSelectCentre}
        error={centreError}
      />
      {!!centreError && (
        <View style={styles.centreErrorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
          <Text style={styles.centreErrorText}>{centreError}</Text>
        </View>
      )}
    </View>
  );

  // ── Centre-only mode ─────────────────────────────────────────────────────

  if (centreOnly) {
    return (
      <LinearGradient colors={Gradients.auth} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="location" size={40} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Votre centre</Text>
          <Text style={styles.description}>
            Choisissez le centre de santé où votre enfant sera vacciné. Ce choix est définitif.
          </Text>

          <View style={styles.card}>
            <CentreSection hint="Tous vos rendez-vous seront gérés dans ce centre." />

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

  // ── Full registration mode ───────────────────────────────────────────────

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
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.iconWrap}>
            <Ionicons name="person-add" size={40} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Bienvenue !</Text>
          <Text style={styles.description}>
            Renseignez votre nom et choisissez votre centre — c'est tout.
          </Text>

          <View style={styles.card}>
            {cinFromLogin && (
              <View style={styles.cinBadge}>
                <Ionicons name="card-outline" size={15} color={Colors.success} />
                <Text style={styles.cinBadgeText}>
                  CIN vérifiée : <Text style={{ fontWeight: '800' }}>{cinFromLogin}</Text>
                </Text>
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

                  <CentreSection hint="Choisissez le centre où votre enfant sera suivi. Tous ses rendez-vous se feront ici." />

                  {/* Email facultatif */}
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
                    />
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

  cinBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.successBg, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  cinBadgeText: { flex: 1, fontSize: 13, color: Colors.success, fontWeight: '500' },

  // ── Centre section ──────────────────────────────────────────────────────
  centreSection:  { marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionLabel:   { fontSize: 13, fontWeight: '700', color: Colors.text },
  centreHint:     { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: Spacing.sm },

  // Auto-selected (single centre)
  centreAutoRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.successBg, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.success },
  centreAutoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(22,163,74,0.1)', alignItems: 'center', justifyContent: 'center' },
  centreAutoName: { fontSize: 14, fontWeight: '700', color: Colors.success },
  centreAutoAddr: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Search box (multiple centres)
  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm },
  searchIcon:  { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.text },

  // Centre list
  centreList:        { gap: Spacing.sm, marginBottom: Spacing.xs },
  centreRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.background, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border },
  centreRowActive:   { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreRadio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  centreRadioActive: { borderColor: Colors.primary },
  centreRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  centreName:        { fontSize: 13, fontWeight: '700', color: Colors.text },
  centreAddr:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  centreEmpty:       { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginVertical: Spacing.md },

  centreErrorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm },
  centreErrorText:   { fontSize: 12, color: Colors.danger, fontWeight: '500' },

  // Email section
  emailSection: { marginTop: Spacing.md },
  emailHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  emailLabel:   { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  optionalBadge:{ backgroundColor: Colors.primaryTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.pill },
  optionalText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
});
