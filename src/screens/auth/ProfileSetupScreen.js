import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';
import { authService, ApiError } from '../../services';

const ProfileSchema = Yup.object().shape({
  nom: Yup.string().required('Le nom est obligatoire'),
  prenom: Yup.string().required('Le prénom est obligatoire'),
  email: Yup.string().email('Email invalide').required('L\'email est obligatoire'),
  codeCentre: Yup.string()
    .length(9, 'Le code doit contenir exactement 9 chiffres')
    .required('Le code du centre est obligatoire'),
});

export default function ProfileSetupScreen({ route, navigation }) {
  const { login } = useContext(AuthContext);
  const cin = route.params?.cin || '';
  const telephone = route.params?.telephone || '';

  const handleSaveProfile = async (values, { setSubmitting, setErrors }) => {
    setSubmitting(true);
    try {
      const resp = await authService.completeProfile(values);
      if (resp.user) {
        await login('ALREADY_LOGGED_IN', resp.user);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isValidation && e.details?.fields) {
          setErrors(e.details.fields);
        } else if (e.status === 404) {
          setErrors({ codeCentre: 'Code centre introuvable' });
        } else if (e.isNetwork) {
          setErrors({ nom: 'Vérifiez votre connexion internet' });
        } else {
          setErrors({ nom: e.message });
        }
      } else {
        setErrors({ nom: 'Erreur inattendue. Réessayez.' });
      }
    } finally {
      setSubmitting(false);
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
          <View style={styles.iconWrap}>
            <Ionicons name="person-add" size={40} color={Colors.surface} />
          </View>
          <Text style={styles.title}>Complétez votre profil</Text>
          <Text style={styles.description}>
            Dernière étape : liez votre enfant au centre de vaccination grâce au code qui vous a été remis.
          </Text>

          <View style={styles.card}>
            <Formik
              initialValues={{ nom: '', prenom: '', email: '', codeCentre: '' }}
              validationSchema={ProfileSchema}
              onSubmit={handleSaveProfile}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <>
                  <Text style={styles.sectionLabel}>Vos informations</Text>

                  <AppInput
                    label="Nom *"
                    placeholder="Votre nom"
                    value={values.nom}
                    onChangeText={handleChange('nom')}
                    onBlur={handleBlur('nom')}
                    error={errors.nom}
                    touched={touched.nom}
                    icon="person-outline"
                  />
                  <AppInput
                    label="Prénom *"
                    placeholder="Votre prénom"
                    value={values.prenom}
                    onChangeText={handleChange('prenom')}
                    onBlur={handleBlur('prenom')}
                    error={errors.prenom}
                    touched={touched.prenom}
                  />
                  <AppInput
                    label="Email *"
                    placeholder="salma@example.com"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={errors.email}
                    touched={touched.email}
                    icon="mail-outline"
                    keyboardType="email-address"
                  />

                  <View style={styles.divider} />

                  <Text style={styles.sectionLabel}>Lier votre enfant</Text>
                  <Text style={styles.helper}>
                    Saisissez le code de 9 chiffres figurant sur le carnet de vaccination remis par le centre.
                  </Text>

                  <AppInput
                    label="Code centre *"
                    placeholder="_ _ _   _ _ _   _ _ _"
                    value={values.codeCentre}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, '').slice(0, 9);
                      handleChange('codeCentre')(digits);
                    }}
                    onBlur={handleBlur('codeCentre')}
                    error={errors.codeCentre}
                    touched={touched.codeCentre}
                    icon="link-outline"
                    keyboardType="number-pad"
                    maxLength={9}
                    helper="9 chiffres"
                  />

                  <TouchableOpacity style={styles.helpRow}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.helpLink}>Où trouver mon code ?</Text>
                  </TouchableOpacity>

                  <AppButton
                    title={isSubmitting ? 'Enregistrement…' : 'Enregistrer et continuer'}
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    icon="checkmark-outline"
                    iconPosition="right"
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
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.display, color: Colors.textInverse, textAlign: 'center', marginBottom: Spacing.sm },
  description: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20, maxWidth: 320, alignSelf: 'center', marginBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii['2xl'],
    padding: Spacing.xl,
    ...Elevation.lg,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm, marginTop: Spacing.xs, letterSpacing: 0.5, textTransform: 'uppercase' },
  helper: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  helpRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: Spacing.md, gap: 6 },
  helpLink: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
});