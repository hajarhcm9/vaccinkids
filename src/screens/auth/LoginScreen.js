import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors } from '../../constants/theme';

export default function LoginScreen({ navigation }) {
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (telephone === '' || password === '') {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro et votre mot de passe');
      return;
    }

    // SIMULATION : On simule la vérification du mot de passe par le backend
    // Si c'est bon, le backend enverrait un SMS, alors on navigue vers l'écran OTP
    Alert.alert('Succès', 'Mot de passe correct. Un code de vérification vous a été envoyé par SMS.');
    navigation.navigate('OTPVerification', { telephone: telephone });
  };

  return (
    <LinearGradient
      colors={['#2C5FBF', '#4A90E2', '#82B1FF']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>VacciTrack</Text>
        <Text style={styles.subtitle}>Suivi vaccinal pédiatrique</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.description}>
          Entrez vos identifiants pour accéder à votre espace.
        </Text>

        <AppInput
          placeholder="Numéro de téléphone"
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
        />

        <AppInput
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />

        <AppButton title="Se connecter" onPress={handleLogin} />

        <TouchableOpacity onPress={() => Alert.alert('Info', 'Fonctionnalité de récupération de mot de passe à venir.')}>
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 36, fontWeight: 'bold', color: Colors.surface, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
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
  description: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  link: { color: Colors.primary, textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '600' }
});