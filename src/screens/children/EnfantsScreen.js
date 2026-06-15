import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Colors } from '../../constants/theme';

// Données fictives des enfants liés au compte
const MOCK_ENFANTS = [
  { id: '1', nom: 'Dupont', prenom: 'asmae', date_naissance: '12/05/2023', sexe: 'F' },
  { id: '2', nom: 'Dupont', prenom: 'Salma', date_naissance: '25/08/2021', sexe: 'M' },
];

export default function EnfantsScreen() {
  const renderEnfant = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, item.sexe === 'F' ? styles.avatarF : styles.avatarM]}>
        <Text style={styles.avatarText}>{item.prenom[0]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.prenom} {item.nom}</Text>
        <Text style={styles.details}>Né(e) le : {item.date_naissance}</Text>
        <Text style={styles.linkText}>Code centre lié : *******{item.id === '1' ? '12' : '45'}</Text>
      </View>
      <View style={[styles.badge, item.sexe === 'F' ? styles.badgeF : styles.badgeM]}>
        <Text style={styles.badgeText}>{item.sexe === 'F' ? 'Fille' : 'Garçon'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_ENFANTS}
        keyExtractor={(item) => item.id}
        renderItem={renderEnfant}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <Text style={styles.headerTitle}>Mes Enfants</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun enfant lié à votre compte. Veuillez contacter votre centre de vaccination.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, padding: 15, borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3
  },
  avatar: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarM: { backgroundColor: Colors.primaryLight },
  avatarF: { backgroundColor: '#FFB6C1' },
  avatarText: { color: Colors.surface, fontWeight: 'bold', fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  details: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  linkText: { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeF: { backgroundColor: '#FFE0EB' },
  badgeM: { backgroundColor: '#E0F0FF' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 50, color: Colors.textSecondary, fontSize: 16, lineHeight: 24 }
});