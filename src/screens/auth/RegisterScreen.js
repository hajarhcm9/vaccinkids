import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { authService, ApiError } from '../../services';

const RegisterSchema = Yup.object().shape({
  cin: Yup.string()
    .matches(/^[A-Za-z]{0,2}\d{6,8}$/, 'Format CIN invalide (ex : AB123456)')
    .required('La CIN est obligatoire'),
  nom: Yup.string().min(2, 'Nom trop court').required('Le nom est obligatoire'),
  prenom: Yup.string().min(2, 'Prénom trop court').required('Le prénom est obligatoire'),
  email: Yup.string().email('Email invalide').required('L\'email est obligatoire'),
  telephone: Yup.string()
    .matches(/^(\+212|0)([5-7])\d{8}$/, 'Numéro marocain invalide (ex : 0612345678)')
    .required('Le téléphone est obligatoire'),
  password: Yup.string().min(6, '6 caractères minimum').required('Obligatoire'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Les mots de passe doivent correspondre')
    .required('Obligatoire'),
});

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: 'Faible',    color: Colors.danger,  pct: 25 };
  if (score <= 2) return { label: 'Moyen',     color: Colors.warning, pct: 50 };
  if (score <= 3) return { label: 'Bon',       color: Colors.accent,  pct: 75 };
  return { label: 'Excellent', color: Colors.success, pct: 100 };
}

export default function RegisterScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values, { setErrors }) => {
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = values;
      const resp = await authService.register(payload);
      navigation.navigate('OTPVerification', {
        cin: values.cin,
        telephone: values.telephone,
        otpSentTo: resp.otpSentTo,
        fromRegister: true,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isValidation && e.details?.fields) {
          setErrors(e.details.fields);
        } else if (e.status === 409) {
          setErrors({ cin: 'Un compte existe déjà avec cette CIN' });
        } else if (e.isNetwork) {
          setErrors({ nom: 'Vérifiez votre connexion internet' });
        } else {
          setErrors({ nom: e.message });
        }
      } else {
        setErrors({ nom: 'Erreur inattendue. Réessayez.' });
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textInverse} />
          </TouchableOpacity>

          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Ionicons name="medkit" size={28} color={Colors.surface} />
            </View>
            <Text style={styles.logo}>VacciKids</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.description}>
              Inscrivez-vous pour suivre le calendrier vaccinal de votre enfant.
            </Text>

            <Formik
              initialValues={{
                cin: '', nom: '', prenom: '', email: '',
                telephone: '', password: '', confirmPassword: '',
              }}
              validationSchema={RegisterSchema}
              onSubmit={handleRegister}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => {
                const strength = getPasswordStrength(values.password);
                return (
                  <>
                    <AppInput
                      label="CIN *"
                      placeholder="Ex : AB123456"
                      value={values.cin}
                      onChangeText={handleChange('cin')}
                      onBlur={handleBlur('cin')}
                      error={errors.cin}
                      touched={touched.cin}
                      icon="card-outline"
                      autoCapitalize="characters"
                      helper="Carte d'Identité Nationale"
                    />

                    <View style={styles.row}>
                      <View style={styles.col}>
                        <AppInput
                          label="Nom *"
                          placeholder="Dupont"
                          value={values.nom}
                          onChangeText={handleChange('nom')}
                          onBlur={handleBlur('nom')}
                          error={errors.nom}
                          touched={touched.nom}
                          icon="person-outline"
                        />
                      </View>
                      <View style={styles.col}>
                        <AppInput
                          label="Prénom *"
                          placeholder="Salma"
                          value={values.prenom}
                          onChangeText={handleChange('prenom')}
                          onBlur={handleBlur('prenom')}
                          error={errors.prenom}
                          touched={touched.prenom}
                        />
                      </View>
                    </View>

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

                    <AppInput
                      label="Téléphone *"
                      placeholder="0612345678"
                      value={values.telephone}
                      onChangeText={handleChange('telephone')}
                      onBlur={handleBlur('telephone')}
                      error={errors.telephone}
                      touched={touched.telephone}
                      icon="call-outline"
                      keyboardType="phone-pad"
                      helper="Servira à recevoir le code SMS"
                    />

                    <AppInput
                      label="Mot de passe *"
                      placeholder="6 caractères minimum"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      error={errors.password}
                      touched={touched.password}
                      secureTextEntry
                      icon="lock-closed-outline"
                    />

                    {values.password.length > 0 && (
                      <View style={styles.strengthWrap}>
                        <View style={styles.strengthBar}>
                          <View style={[styles.strengthFill, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
                        </View>
                        <Text style={[styles.strengthLabel, { color: strength.color }]}>
                          Force : {strength.label}
                        </Text>
                      </View>
                    )}

                    <AppInput
                      label="Confirmer le mot de passe *"
                      placeholder="Retapez le mot de passe"
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                      error={errors.confirmPassword}
                      touched={touched.confirmPassword}
                      secureTextEntry
                      icon="lock-closed-outline"
                    />

                    <AppButton
                      title={loading ? 'Création en cours…' : 'Créer mon compte'}
                      onPress={handleSubmit}
                      loading={loading}
                      disabled={loading}
                      icon="person-add-outline"
                      iconPosition="right"
                    />

                    <Text style={styles.legal}>
                      En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
                    </Text>
                  </>
                );
              }}
            </Formik>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Déjà inscrit ?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signupLink}> Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xl, paddingVertical: Spacing['3xl'] },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brand: { alignItems: 'center', marginBottom: Spacing.xl },
  logoBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logo: { fontSize: 26, fontWeight: '800', color: Colors.textInverse, letterSpacing: 0.5 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii['2xl'],
    padding: Spacing.xl,
    ...Elevation.lg,
  },
  title: { ...Typography.title, marginBottom: 6 },
  description: { ...Typography.body, marginBottom: Spacing.lg, lineHeight: 22 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  col: { flex: 1 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, marginTop: -Spacing.xs },
  strengthBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, marginRight: Spacing.sm },
  strengthFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700' },
  legal: { fontSize: 11, color: Colors.textLight, textAlign: 'center', marginTop: Spacing.md, lineHeight: 16 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl },
  signupText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  signupLink: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
});