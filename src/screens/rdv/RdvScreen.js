import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../../components/ui/AppButton';
import { Colors } from '../../constants/theme';

// Données Mock
const ENFANTS = [{ id: '1', prenom: 'salma' }, { id: '2', prenom: 'asmae' }];
const VACCINS_EN_RETARD = ['DTP 2', 'Rougeole 1']; // Seuls les vaccins en retard/à venir sont prisables
const DATES = ['Lun 10 Juin', 'Mar 11 Juin', 'Mer 12 Juin', 'Jeu 13 Juin'];
const CRENEAUX = ['08:00', '09:30', '11:00', '14:00'];

export default function RdvScreen() {
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [selectedVaccin, setSelectedVaccin] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCreneau, setSelectedCreneau] = useState(null);

  const handleTakeRdv = () => {
    if (!selectedEnfant || !selectedVaccin || !selectedDate || !selectedCreneau) {
      Alert.alert('Information manquante', 'Veuillez remplir toutes les étapes pour prendre rendez-vous.');
      return;
    }

    // SIMULATION : Envoi au backend de DEV1
    Alert.alert(
      'Rendez-vous confirmé ! ✅',
      `${selectedVaccin} pour ${selectedEnfant} le ${selectedDate} à ${selectedCreneau}.\n\nUn SMS de confirmation vous a été envoyé.`
    );
  };

  const renderPills = (data, selectedValue, setFunction) => (
    <View style={styles.pillContainer}>
      {data.map((item) => (
        <TouchableOpacity
          key={item}
          style={[styles.pill, selectedValue === item && styles.pillActive]}
          onPress={() => setFunction(item)}
        >
          <Text style={[styles.pillText, selectedValue === item && styles.pillTextActive]}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header Aesthetic */}
      <LinearGradient
        colors={['#2C5FBF', '#4A90E2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Prendre un rendez-vous</Text>
        <Text style={styles.headerSub}>Sélectionnez les informations du rendez-vous</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        {/* Étape 1 : Enfant */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Pour quel enfant ?</Text>
          {renderPills(ENFANTS.map(e => e.prenom), selectedEnfant, setSelectedEnfant)}
        </View>

        {/* Étape 2 : Vaccin */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Quel vaccin ?</Text>
          <Text style={styles.sectionDesc}>Uniquement les vaccins nécessitant une injection</Text>
          {renderPills(VACCINS_EN_RETARD, selectedVaccin, setSelectedVaccin)}
        </View>

        {/* Étape 3 : Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Quelle date ?</Text>
          {renderPills(DATES, selectedDate, setSelectedDate)}
        </View>

        {/* Étape 4 : Créneau */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Quelle heure ?</Text>
          <Text style={styles.sectionDesc}>Créneaux disponibles (max 20 personnes)</Text>
          {renderPills(CRENEAUX, selectedCreneau, setSelectedCreneau)}
        </View>

        {/* Bouton de validation */}
        <AppButton title="Confirmer le rendez-vous" onPress={handleTakeRdv} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 25, paddingTop: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.surface },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  formContainer: { padding: 20 },
  section: { marginBottom: 25, backgroundColor: Colors.surface, borderRadius: 16, padding: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 5 },
  sectionDesc: { fontSize: 12, color: Colors.textLight, marginBottom: 10 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.background, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E0E6F0' },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  pillText: { color: Colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: Colors.surface },
});