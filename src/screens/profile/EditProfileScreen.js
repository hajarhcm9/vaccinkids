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
  nom:    Yup.string().min(2, 'Nom trop court').required('Le nom est obligatoire'),
  prenom: Yup.string().min(2, 'Prénom trop court').required('Le prénom est obligatoire'),
});

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useContext(AuthContext);

  const handleSave = async (values, { setSubmitting, setErrors }) => {
    try {
      const resp = await authService.updateProfile({
        nom:    values.nom.trim(),
        prenom: values.prenom.trim(),
      });
      await updateUser(resp?.user || { ...user, ...values });
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
          <View style={styles.phoneInfo}>
            <Ionicons name="call-outline" size={16} color={Colors.primary} />
            <Text style={styles.phoneInfoText}>
              Numéro : {user?.telephone || '—'}{'  '}
              <Text style={styles.phoneHint}>(non modifiable)</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Formik
              initialValues={{
                nom:    user?.nom    || '',
                prenom: user?.prenom || '',
              }}
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
                    title={isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    icon="checkmark-outline"
                    iconPosition="right"
                    style={{ marginTop: Spacing.sm }}
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
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Spacing['3xl'], backgroundColor: Colors.surface, ...Elevation.sm },
  backBtn:      { padding: 4, marginRight: Spacing.sm },
  headerTitle:  { flex: 1, ...Typography.subtitle },
  scroll:       { padding: Spacing.lg },
  phoneInfo:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.base, marginBottom: Spacing.md },
  phoneInfoText:{ fontSize: 14, color: Colors.primary, fontWeight: '600', flex: 1 },
  phoneHint:    { fontSize: 12, color: Colors.textSecondary, fontWeight: '400' },
  card:         { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm },
});
