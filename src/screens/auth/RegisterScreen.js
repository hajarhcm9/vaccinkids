import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors } from '../../constants/theme';
import { authService } from '../../services/authService';

const RegisterSchema = Yup.object().shape({
  nom: Yup.string().required('Le nom est obligatoire'),
  telephone: Yup.string().required('Le téléphone est obligatoire'),
  email: Yup.string().email('Email invalide').required('L\'email est obligatoire'),
  password: Yup.string().min(6, '6 caractères minimum').required('Obligatoire'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Les mots de passe doivent correspondre')
    .required('Obligatoire'),
});

export default function RegisterScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const { confirmPassword, ...userData } = values;
      // APPEL REEL A L'API
      // await authService.register(userData);

      // SIMULATION EN ATTENDANT DEV1
      Alert.alert('Succès', 'Compte créé avec succès !');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inscription</Text>

      <Formik
        initialValues={{ nom: '', telephone: '', email: '', password: '', confirmPassword: '' }}
        validationSchema={RegisterSchema}
        onSubmit={handleRegister}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <>
            <AppInput placeholder="Nom complet" value={values.nom} onChangeText={handleChange('nom')} onBlur={handleBlur('nom')} />
            {touched.nom && errors.nom && <Text style={styles.error}>{errors.nom}</Text>}

            <AppInput placeholder="Téléphone" value={values.telephone} onChangeText={handleChange('telephone')} onBlur={handleBlur('telephone')} keyboardType="phone-pad" />
            {touched.telephone && errors.telephone && <Text style={styles.error}>{errors.telephone}</Text>}

            <AppInput placeholder="Email" value={values.email} onChangeText={handleChange('email')} onBlur={handleBlur('email')} keyboardType="email-address" />
            {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

            <AppInput placeholder="Mot de passe" value={values.password} onChangeText={handleChange('password')} onBlur={handleBlur('password')} secureTextEntry />
            {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

            <AppInput placeholder="Confirmer le mot de passe" value={values.confirmPassword} onChangeText={handleChange('confirmPassword')} onBlur={handleBlur('confirmPassword')} secureTextEntry />
            {touched.confirmPassword && errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}

            <AppButton title={loading ? "Chargement..." : "S'inscrire"} onPress={handleSubmit} disabled={loading} />
          </>
        )}
      </Formik>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.background },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.primary, marginBottom: 24, textAlign: 'center' },
  link: { color: Colors.secondary, textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: '600' },
  error: { color: Colors.danger, fontSize: 12, marginBottom: 8, marginLeft: 4 }
});