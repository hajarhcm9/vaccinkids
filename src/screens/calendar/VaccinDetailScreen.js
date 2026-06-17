import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { vaccinService } from '../../services';

function statusMeta(status) {
  switch (status) {
    case 'FAIT':      return { color: Colors.success, bg: Colors.success + '20', icon: 'checkmark-circle', label: 'Administré' };
    case 'A_VENIR':   return { color: Colors.primary, bg: Colors.primary + '20', icon: 'time-outline',    label: 'À venir' };
    case 'EN_RETARD': return { color: Colors.danger,  bg: Colors.danger + '20',  icon: 'alert-circle',    label: 'En retard' };
    default:          return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status };
  }
}

export default function VaccinDetailScreen({ route, navigation }) {
  const { vaccin: initial } = route.params;
  const [vaccin, setVaccin] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial?.id) {
      setLoading(true);
      vaccinService.getVaccinDetail(initial.id)
        .then((data) => { if (data) setVaccin({ ...initial, ...data }); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initial?.id]);

  const s = statusMeta(vaccin?.statut);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail vaccin</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing['3xl'] }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={[styles.iconCircle, { backgroundColor: s.color }]}>
                <Ionicons name="medical" size={28} color={Colors.surface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaccinNom}>{vaccin?.nom}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={12} color={s.color} />
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <InfoRow icon="calendar-outline" label="Date prévue" value={vaccin?.date_prevue || '—'} />
            {vaccin?.date_administree && (
              <InfoRow icon="checkmark-done-outline" label="Date administrée" value={vaccin.date_administree} />
            )}
            {vaccin?.centre && (
              <InfoRow icon="location-outline" label="Centre" value={vaccin.centre} />
            )}
            {vaccin?.lot && (
              <InfoRow icon="barcode-outline" label="N° de lot" value={vaccin.lot} />
            )}
            {vaccin?.description && (
              <View style={styles.descBox}>
                <Text style={styles.descLabel}>À propos</Text>
                <Text style={styles.descText}>{vaccin.description}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={Colors.primary} />
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
  scroll: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, marginBottom: Spacing.md },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  vaccinNom: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radii.pill },
  badgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  descBox: { marginTop: Spacing.md },
  descLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  descText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
