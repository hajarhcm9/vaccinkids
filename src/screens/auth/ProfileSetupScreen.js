import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';

// Validation avec l'email en plus
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

  // On récupère le téléphone passé en paramètre depuis l'écran OTP
  const telephone = route.params?.telephone || 'Non renseigné';

  const handleSaveProfile = (values) => {
    Alert.alert(
      'Profil complété !',
      `Bienvenue ${values.prenom}. L'enfant associé au code ${values.codeCentre} a été lié à votre compte.`
    );

    // On envoie TOUTES les infos au contexte (nom, prenom, telephone, email)
    login('FAKE_JWT_TOKEN_DEV1', {
      nom: values.nom,
      prenom: values.prenom,
      telephone: telephone,
      email: values.email // NOUVEAU
    });
  };

  return (
    <LinearGradient
      colors={['#2C5FBF', '#4A90E2', '#82B1FF']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Votre Profil</Text>
          <Text style={styles.description}>
            Complétez vos informations et liez votre enfant au centre de vaccination.
          </Text>

          <Formik
            initialValues={{ nom: '', prenom: '', email: '', codeCentre: '' }}
            validationSchema={ProfileSchema}
            onSubmit={handleSaveProfile}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <>
                <AppInput
                  placeholder="Votre Nom"
                  value={values.nom}
                  onChangeText={handleChange('nom')}
                  onBlur={handleBlur('nom')}
                />
                {touched.nom && errors.nom && <Text style={styles.error}>{errors.nom}</Text>}

                <AppInput
                  placeholder="Votre Prénom"
                  value={values.prenom}
                  onChangeText={handleChange('prenom')}
                  onBlur={handleBlur('prenom')}
                />
                {touched.prenom && errors.prenom && <Text style={styles.error}>{errors.prenom}</Text>}

                {/* NOUVEAU CHAMP EMAIL */}
                <AppInput
                  placeholder="Votre Email"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  keyboardType="email-address"
                />
                {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

                <View style={styles.divider} />

                <Text style={styles.subtitle}>Lier votre enfant</Text>
                <Text style={styles.description}>
                  Entrez le code de 9 chiffres qui vous a été remis lors de la première visite au centre.
                </Text>

                <AppInput
                  placeholder="Code de 9 chiffres"
                  value={values.codeCentre}
                  onChangeText={handleChange('codeCentre')}
                  onBlur={handleBlur('codeCentre')}
                  keyboardType="number-pad"
                  maxLength={9}
                />
                {touched.codeCentre && errors.codeCentre && <Text style={styles.error}>{errors.codeCentre}</Text>}

                <View style={styles.buttonContainer}>
                  <AppButton title="Enregistrer et continuer" onPress={handleSubmit} />
                </View>
              </>
            )}
          </Formik>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 5 },
  description: { fontSize: 14, color: Colors.textSecondary, marginBottom: 15, lineHeight: 20 },
  divider: { height: 1, backgroundColor: Colors.background, marginVertical: 15 },
  error: { color: Colors.danger, fontSize: 12, marginBottom: 8, marginLeft: 4 },
  buttonContainer: { marginTop: 10 }
});