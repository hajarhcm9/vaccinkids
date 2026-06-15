import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/theme';

// Données Mock (Enfants)
const MOCK_ENFANTS = [
  { id: '1', prenom: 'salma' },
  { id: '2', prenom: 'asmae' },
];

// Données Mock (Vaccins sous forme de tableau)
const MOCK_VACCINS = [
  { id: '1', nom: 'BCG', date_prevue: 'Naissance', statut: 'FAIT' },
  { id: '2', nom: 'Hépatite B 1', date_prevue: '2 mois', statut: 'FAIT' },
  { id: '3', nom: 'DTP 1', date_prevue: '2 mois', statut: 'FAIT' },
  { id: '4', nom: 'DTP 2', date_prevue: '4 mois', statut: 'EN_RETARD' },
  { id: '5', nom: 'Hépatite B 2', date_prevue: '4 mois', statut: 'A_VENIR' },
  { id: '6', nom: 'Rougeole 1', date_prevue: '12 mois', statut: 'A_VENIR' },
];

export default function CalendrierScreen() {
  const [selectedEnfant, setSelectedEnfant] = useState(MOCK_ENFANTS[0].id);

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'FAIT': return Colors.success;
      case 'A_VENIR': return Colors.primary; // Bleu pour "à venir"
      case 'EN_RETARD': return Colors.danger;
      default: return Colors.textLight;
    }
  };

  const getStatutLabel = (statut) => {
    switch (statut) {
      case 'FAIT': return '✅ Fait';
      case 'A_VENIR': return '🕐 À venir';
      case 'EN_RETARD': return '⚠️ En retard';
      default: return statut;
    }
  };

  const renderVaccin = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.cellNom}>
        <Text style={styles.vaccinName}>{item.nom}</Text>
      </View>
      <View style={styles.cellDate}>
        <Text style={styles.vaccinDate}>{item.date_prevue}</Text>
      </View>
      <View style={styles.cellStatut}>
        <View style={[styles.statutBadge, { backgroundColor: getStatutColor(item.statut) + '20' }]}>
          <Text style={[styles.statutText, { color: getStatutColor(item.statut) }]}>
            {getStatutLabel(item.statut)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sélecteur d'enfant */}
      <View style={styles.enfantSelector}>
        <Text style={styles.selectorLabel}>Enfant :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MOCK_ENFANTS.map((enfant) => (
            <TouchableOpacity
              key={enfant.id}
              style={[
                styles.enfantPill,
                selectedEnfant === enfant.id && styles.enfantPillActive
              ]}
              onPress={() => setSelectedEnfant(enfant.id)}
            >
              <Text style={[
                styles.enfantPillText,
                selectedEnfant === enfant.id && styles.enfantPillTextActive
              ]}>
                {enfant.prenom}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* En-tête du tableau */}
      <View style={styles.tableHeader}>
        <View style={styles.cellNom}>
          <Text style={styles.headerText}>Vaccin</Text>
        </View>
        <View style={styles.cellDate}>
          <Text style={styles.headerText}>Âge / Date</Text>
        </View>
        <View style={styles.cellStatut}>
          <Text style={styles.headerText}>Statut</Text>
        </View>
      </View>

      {/* Lignes du tableau */}
      <FlatList
        data={MOCK_VACCINS}
        keyExtractor={(item) => item.id}
        renderItem={renderVaccin}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Sélecteur Enfants
  enfantSelector: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: Colors.surface, elevation: 1 },
  selectorLabel: { fontSize: 16, fontWeight: 'bold', marginRight: 10, color: Colors.text },
  enfantPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  enfantPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  enfantPillText: { color: Colors.textSecondary, fontWeight: '600' },
  enfantPillTextActive: { color: Colors.surface },

  // Tableau Header
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginHorizontal: 15,
    marginTop: 10,
  },
  headerText: { color: Colors.primaryDark, fontWeight: 'bold', fontSize: 14 },

  // Lignes du tableau
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background
  },

  // Cellules (colonnes)
  cellNom: { flex: 2 },      // Prend 2 parts de l'espace
  cellDate: { flex: 1.5 },   // Prend 1.5 parts
  cellStatut: { flex: 1.5 }, // Prend 1.5 parts

  vaccinName: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  vaccinDate: { fontSize: 13, color: Colors.textSecondary },

  // Badge Statut
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'flex-start' // Pour que le badge s'adapte à la taille du texte
  },
  statutText: { fontSize: 11, fontWeight: 'bold' }
});