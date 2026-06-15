import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';

// Données fictives des actualités (Plus tard : appel API par DEV1)
const MOCK_ACTUS = [
  {
    id: '1', type: 'ALERTE', titre: 'Campagne de rappel Rougeole',
    description: 'Le centre lance une campagne de rattrapage pour le vaccin ROR. N\'hésitez pas à prendre rendez-vous.',
    date: 'Aujourd\'hui'
  },
  {
    id: '2', type: 'CONSEIL', titre: 'Comment préparer votre enfant ?',
    description: 'Astuce : Expliquez à l\'enfant à quoi sert le vaccin pour diminuer l\'anxiété.',
    date: 'Hier'
  },
  {
    id: '3', type: 'INFO', titre: 'Nouveaux horaires',
    description: 'Le centre ouvrira exceptionnellement le samedi matin de 9h à 12h à partir du mois prochain.',
    date: 'Il y a 3 jours'
  },
];

// Faux prochain RDV (Plus tard : appel API)
const MOCK_NEXT_RDV = {
  enfant: 'Léa',
  vaccin: 'DTP 2',
  date: 'Mercredi 12 Juin',
  heure: '09:30'
};

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const prenom = user?.prenom || 'Invité';

  const getTypeColor = (type) => {
    switch (type) {
      case 'ALERTE': return Colors.danger;
      case 'CONSEIL': return Colors.primary;
      case 'INFO': return Colors.success;
      default: return Colors.textSecondary;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ALERTE': return 'alert-circle-outline';
      case 'CONSEIL': return 'bulb-outline';
      case 'INFO': return 'information-circle-outline';
      default: return 'document-text-outline';
    }
  };

  const renderActu = ({ item }) => (
    <View style={[styles.actuCard, { borderLeftColor: getTypeColor(item.type) }]}>
      <View style={styles.actuHeader}>
        <Ionicons name={getTypeIcon(item.type)} size={24} color={getTypeColor(item.type)} />
        <Text style={[styles.actuType, { color: getTypeColor(item.type) }]}>{item.type}</Text>
        <Text style={styles.actuDate}>{item.date}</Text>
      </View>
      <Text style={styles.actuTitre}>{item.titre}</Text>
      <Text style={styles.actuDescription}>{item.description}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête bleu dégradé */}
      <LinearGradient
        colors={['#2C5FBF', '#4A90E2']}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerGreeting}>Bonjour,</Text>
          <Text style={styles.headerName}>{prenom} ! 👋</Text>
        </View>
      </LinearGradient>

      {/* Carte Prochain Rendez-vous */}
      <View style={styles.rdvCardContainer}>
        <Text style={styles.sectionTitle}>Prochain rendez-vous</Text>
        <View style={styles.rdvCard}>
          <View style={styles.rdvIconContainer}>
            <Ionicons name="calendar" size={32} color={Colors.surface} />
          </View>
          <View style={styles.rdvInfo}>
            <Text style={styles.rdvTitle}>{MOCK_NEXT_RDV.vaccin} - {MOCK_NEXT_RDV.enfant}</Text>
            <Text style={styles.rdvDetails}>{MOCK_NEXT_RDV.date} à {MOCK_NEXT_RDV.heure}</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={24} color={Colors.textLight} />
        </View>
      </View>

      {/* Fil d'actualité */}
      <View style={styles.actuSection}>
        <Text style={styles.sectionTitle}>Consignes & Actualités</Text>
        <FlatList
          data={MOCK_ACTUS}
          keyExtractor={(item) => item.id}
          renderItem={renderActu}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    padding: 25, paddingTop: 40, paddingBottom: 50,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30
  },
  headerGreeting: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  headerName: { fontSize: 26, fontWeight: 'bold', color: Colors.surface },

  // Section Title
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },

  // Carte Prochain RDV
  rdvCardContainer: { marginTop: -30, marginHorizontal: 20 },
  rdvCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8
  },
  rdvIconContainer: {
    width: 55, height: 55, borderRadius: 27.5,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },
  rdvInfo: { flex: 1 },
  rdvTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  rdvDetails: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  // Actualités
  actuSection: { padding: 20 },
  actuCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 15,
    marginBottom: 12, borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  actuHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  actuType: { fontSize: 12, fontWeight: 'bold', marginLeft: 5, flex: 1 },
  actuDate: { fontSize: 11, color: Colors.textLight },
  actuTitre: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 5 },
  actuDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 }
});