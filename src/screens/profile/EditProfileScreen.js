import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { AuthContext } from '../../context/AuthContext';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { authService, ApiError } from '../../services';

const ProfileSchema = Yup.object().shape({
  nom:       Yup.string().required('Le nom est obligatoire'),
  prenom:    Yup.string().required('Le prénom est obligatoire'),
  email:     Yup.string().email('Email invalide').required('L\'email est obligatoire'),
  telephone: Yup.string().min(9, 'Numéro invalide'),
});

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useContext(AuthContext);

  const handleSave = async (values, { setSubmitting, setErrors }) => {
    try {
      const updated = await authService.updateProfile(values);
      await updateUser(updated?.user || values);
      navigation.goBack();
    } catch (e) {
      if (e instanceof ApiError && e.isValidation && e.details?.fields) {
        setErrors(e.details.fields);
      } else {
        setErrors({ nom: e instanceof ApiError ? e.message : 'Erreur inattendue.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Formik
              initialValues={{
                nom:       user?.nom       || '',
                prenom:    user?.prenom    || '',
                email:     user?.email     || '',
                telephone: user?.telephone || '',
              }}
              validationSchema={ProfileSchema}
              onSubmit={handleSave}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <>
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
                    placeholder="votre@email.com"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={errors.email}
                    touched={touched.email}
                    icon="mail-outline"
                    keyboardType="email-address"
                  />
                  <AppInput
                    label="Téléphone"
                    placeholder="06 XX XX XX XX"
                    value={values.telephone}
                    onChangeText={handleChange('telephone')}
                    onBlur={handleBlur('telephone')}
                    error={errors.telephone}
                    touched={touched.telephone}
                    icon="call-outline"
                    keyboardType="phone-pad"
                  />
                  <AppButton
                    title={isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Spacing['3xl'], backgroundColor: Colors.surface, ...Elevation.sm },
  backBtn: { padding: 4, marginRight: Spacing.sm },
  headerTitle: { flex: 1, ...Typography.subtitle },
  scroll: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm },
});
