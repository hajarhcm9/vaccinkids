import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { vaccinService } from '../../services';

const MOCK_ENFANTS = [
  { id: '1', prenom: 'Salma' },
  { id: '2', prenom: 'Asmae' },
];

const MOCK_VACCINS = [
  { id: '1', nom: 'BCG',          date_prevue: 'Naissance', statut: 'FAIT' },
  { id: '2', nom: 'Hépatite B 1', date_prevue: '2 mois',    statut: 'FAIT' },
  { id: '3', nom: 'DTP 1',        date_prevue: '2 mois',    statut: 'FAIT' },
  { id: '4', nom: 'DTP 2',        date_prevue: '4 mois',    statut: 'EN_RETARD' },
  { id: '5', nom: 'Hépatite B 2', date_prevue: '4 mois',    statut: 'A_VENIR' },
  { id: '6', nom: 'Rougeole 1',   date_prevue: '12 mois',   statut: 'A_VENIR' },
];

function statusMeta(status) {
  switch (status) {
    case 'FAIT':      return { color: Colors.success, bg: Colors.success + '20', icon: 'checkmark-circle', label: 'Fait' };
    case 'A_VENIR':   return { color: Colors.primary, bg: Colors.primary + '20', icon: 'time-outline', label: 'À venir' };
    case 'EN_RETARD': return { color: Colors.danger, bg: Colors.danger + '20', icon: 'alert-circle', label: 'En retard' };
    default:          return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status };
  }
}

export default function CalendrierScreen() {
  const [selectedEnfant, setSelectedEnfant] = useState(MOCK_ENFANTS[0].id);
  const [vaccins, setVaccins] = useState(MOCK_VACCINS);

  const loadCalendrier = React.useCallback(async () => {
    try {
      const data = await vaccinService.getCalendrierEnfant(selectedEnfant);
      if (Array.isArray(data) && data.length > 0) setVaccins(data);
    } catch (e) {}
  }, [selectedEnfant]);
  React.useEffect(() => { loadCalendrier(); }, [loadCalendrier]);

  const total = vaccins.length;
  const faits = vaccins.filter((v) => v.statut === 'FAIT').length;
  const enRetard = vaccins.filter((v) => v.statut === 'EN_RETARD').length;
  const progression = total > 0 ? Math.round((faits / total) * 100) : 0;

  const renderVaccin = ({ item }) => {
    const s = statusMeta(item.statut);
    return (
      <View style={[styles.row, item.statut === 'EN_RETARD' && styles.rowAlert]}>
        <View style={styles.timeline}>
          <View style={[styles.timelineDot, { backgroundColor: s.color }]} />
          <View style={styles.timelineLine} />
        </View>
        <View style={styles.cellNom}>
          <Text style={styles.vaccinName}>{item.nom}</Text>
          <Text style={styles.vaccinDate}>{item.date_prevue}</Text>
        </View>
        <View style={[styles.statutBadge, { backgroundColor: s.bg }]}>
          <Ionicons name={s.icon} size={11} color={s.color} style={{ marginRight: 4 }} />
          <Text style={[styles.statutText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.enfantSelector}>
        <Text style={styles.selectorLabel}>Enfant :</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MOCK_ENFANTS.map((enfant) => (
            <TouchableOpacity
              key={enfant.id}
              style={[styles.enfantPill, selectedEnfant === enfant.id && styles.enfantPillActive]}
              onPress={() => setSelectedEnfant(enfant.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedEnfant === enfant.id }}
            >
              <Text style={[styles.enfantPillText, selectedEnfant === enfant.id && styles.enfantPillTextActive]}>{enfant.prenom}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressLabel}>Progression vaccinale</Text>
            <Text style={styles.progressValue}>{faits}/{total} vaccins administrés</Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>{progression}%</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressBarFill, { width: `${progression}%` }]} />
        </View>
        {enRetard > 0 && (
          <View style={styles.alertRow}>
            <Ionicons name="warning-outline" size={14} color={Colors.danger} />
            <Text style={styles.alertText}>{enRetard} vaccin(s) en retard — prenez rendez-vous</Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Fait</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.primary }]} /><Text style={styles.legendText}>À venir</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.danger }]} /><Text style={styles.legendText}>En retard</Text></View>
      </View>

      <FlatList
        data={vaccins}
        keyExtractor={(item) => item.id}
        renderItem={renderVaccin}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  enfantSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, ...Elevation.sm },
  selectorLabel: { fontSize: 14, fontWeight: '700', marginRight: Spacing.md, color: Colors.text },
  enfantPill: { paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: Radii.pill, backgroundColor: Colors.surfaceMuted, marginRight: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border },
  enfantPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  enfantPillText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  enfantPillTextActive: { color: Colors.surface },
  progressCard: { margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  progressLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  progressCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  progressPct: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  progressBar: { height: 8, backgroundColor: Colors.surfaceMuted, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  alertText: { color: Colors.danger, fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: Radii.lg, marginBottom: Spacing.sm, marginLeft: Spacing.xl, ...Elevation.sm },
  rowAlert: { borderLeftWidth: 3, borderLeftColor: Colors.danger },
  timeline: { position: 'absolute', left: -Spacing.lg, top: 0, bottom: 0, width: Spacing.lg, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: Spacing.base + 4, borderWidth: 2, borderColor: Colors.surface },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border },
  cellNom: { flex: 1 },
  vaccinName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  vaccinDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statutBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill },
  statutText: { fontSize: 11, fontWeight: '700' },
});