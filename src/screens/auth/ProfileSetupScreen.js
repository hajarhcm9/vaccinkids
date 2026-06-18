import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
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
});

export default function ProfileSetupScreen({ route }) {
  const { login } = useContext(AuthContext);
  const token        = route.params?.token        || null;
  const refreshToken = route.params?.refreshToken || null;
  const userFromOtp  = route.params?.user         || null;

  const handleSave = async (values, { setSubmitting, setErrors }) => {
    setSubmitting(true);
    try {
      const resp = await authService.completeProfile({
        nom:    values.nom.trim(),
        prenom: values.prenom.trim(),
      });
      const updatedUser = resp?.user || { ...userFromOtp, ...values };
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
          <Text style={styles.title}>Bienvenue !</Text>
          <Text style={styles.description}>
            Dernière étape : dites-nous comment vous appeler.
          </Text>

          <View style={styles.card}>
            <Formik
              initialValues={{ nom: '', prenom: '' }}
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
});
