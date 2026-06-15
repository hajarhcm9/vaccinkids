import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors } from '../../constants/theme';

export default function OTPVerificationScreen({ route, navigation }) {
  // On récupère le numéro de téléphone/email depuis l'écran de connexion
  const contact = route.params?.contact || 'Non renseigné';
  const [otp, setOtp] = useState('');

  const handleVerifyOTP = () => {
    if (otp.length < 4) {
      Alert.alert('Erreur', 'Veuillez entrer le code complet');
      return;
    }

    // SIMULATION : Le code OTP est vérifié.
    // On navigue vers la création de profil EN TRANSMETTANT LE NUMÉRO DE TÉLÉPHONE
    navigation.navigate('ProfileSetup', { telephone: contact });
  };

  return (
    <LinearGradient
      colors={['#2C5FBF', '#4A90E2', '#82B1FF']}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Vérification du numéro</Text>
        <Text style={styles.description}>
          Pour sécuriser votre connexion, un code de vérification a été envoyé par SMS au : {'\n'}
          <Text style={styles.bold}>{contact}</Text>
        </Text>

        <AppInput
          placeholder="Entrez le code à 6 chiffres"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <AppButton title="Vérifier" onPress={handleVerifyOTP} />

        <TouchableOpacity onPress={() => Alert.alert('Renvoi', 'Un nouveau code a été envoyé (simulation).')}>
          <Text style={styles.link}>Renvoyer le code</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
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
  bold: { fontWeight: 'bold', color: Colors.text },
  link: { color: Colors.primary, textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '600' }
});