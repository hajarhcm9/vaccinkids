import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { enfantService } from '../../services';

export default function EnfantDetailScreen({ route, navigation }) {
  const { enfant: initial } = route.params;
  const [enfant, setEnfant] = useState(initial);

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'enfant',
      `Supprimer ${enfant.prenom} ${enfant.nom} de votre compte ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await enfantService.deleteEnfant(enfant.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer cet enfant.');
            }
          },
        },
      ]
    );
  };

  const isF = enfant.sexe === 'F';
  const avatarBg = isF ? '#FFE0EB' : Colors.primaryTint;
  const badgeBg = isF ? '#FFE0EB' : Colors.primaryTint;
  const badgeColor = isF ? '#A14D6B' : '#1B6E4D';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil enfant</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarText}>{enfant.prenom[0]}</Text>
          </View>
          <Text style={styles.name}>{enfant.prenom} {enfant.nom}</Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Ionicons name={isF ? 'female' : 'male'} size={13} color={badgeColor} />
            <Text style={[styles.badgeText, { color: badgeColor }]}>{isF ? 'Fille' : 'Garçon'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow icon="calendar-outline" label="Date de naissance" value={enfant.date_naissance} />
          <InfoRow icon="card-outline" label="Identifiant" value={`#${enfant.id}`} />
        </View>

        <TouchableOpacity
          style={styles.calBtn}
          onPress={() => navigation.navigate('Calendrier', { enfantId: enfant.id })}
        >
          <Ionicons name="calendar" size={20} color={Colors.surface} />
          <Text style={styles.calBtnText}>Voir le calendrier vaccinal</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.surface} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Spacing['3xl'], backgroundColor: Colors.surface, ...Elevation.sm },
  backBtn: { padding: 4, marginRight: Spacing.sm },
  headerTitle: { flex: 1, ...Typography.subtitle },
  deleteBtn: { padding: 4 },
  scroll: { padding: Spacing.lg },
  avatarWrap: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  avatarText: { fontSize: 36, fontWeight: '800', color: Colors.text },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: 6, borderRadius: Radii.pill },
  badgeText: { fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm, marginBottom: Spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: Colors.text },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm },
  calBtnText: { flex: 1, color: Colors.surface, fontSize: 15, fontWeight: '700' },
});
