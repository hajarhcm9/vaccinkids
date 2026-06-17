import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { rdvService, ApiError } from '../../services';

const MOCK_RDV = [
  { id: '1', vaccin: 'DTP 2',        enfant: 'Léa',   date: '2026-06-18', heure: '09:30', centre: 'Centre Rabat — Agdal', statut: 'A_VENIR' },
  { id: '2', vaccin: 'Rougeole 1',   enfant: 'Salma', date: '2026-06-24', heure: '14:00', centre: 'Centre Rabat — Agdal', statut: 'A_VENIR' },
  { id: '3', vaccin: 'BCG',          enfant: 'Léa',   date: '2026-05-12', heure: '10:00', centre: 'Centre Rabat — Hassan', statut: 'FAIT' },
  { id: '4', vaccin: 'Hépatite B 1', enfant: 'Salma', date: '2026-05-04', heure: '11:30', centre: 'Centre Rabat — Hassan', statut: 'FAIT' },
];

const SEGMENTS = [
  { key: 'A_VENIR', label: 'À venir',  icon: 'calendar-outline' },
  { key: 'FAIT',    label: 'Passés',   icon: 'checkmark-done-outline' },
  { key: 'ANNULE',  label: 'Annulés',  icon: 'close-circle-outline' },
];

function formatDate(iso) {
  const d = new Date(iso);
  const opts = { weekday: 'short', day: '2-digit', month: 'short' };
  return d.toLocaleDateString('fr-FR', opts);
}

export default function RdvScreen() {
  const [segment, setSegment] = useState('A_VENIR');
  const [showTakeRdv, setShowTakeRdv] = useState(false);
  const [data, setData] = useState(MOCK_RDV);
  const [loading, setLoading] = useState(false);

  const loadRdv = React.useCallback(async () => {
    setLoading(true);
    try {
      const resp = await rdvService.listRdv(segment);
      if (Array.isArray(resp)) setData(resp);
    } catch (e) {} finally { setLoading(false); }
  }, [segment]);
  React.useEffect(() => { loadRdv(); }, [loadRdv]);

  const statusMeta = (status) => {
    switch (status) {
      case 'A_VENIR': return { color: Colors.primary, bg: Colors.primary + '20', icon: 'time-outline', label: 'À venir' };
      case 'FAIT':    return { color: Colors.success, bg: Colors.success + '20', icon: 'checkmark-circle', label: 'Confirmé' };
      case 'ANNULE':  return { color: Colors.danger, bg: Colors.danger + '20', icon: 'close-circle', label: 'Annulé' };
      default:        return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status };
    }
  };

  const renderRdv = ({ item }) => {
    const s = statusMeta(item.statut);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: s.color }]}>
            <Ionicons name="syringe" size={20} color={Colors.surface} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.vaccin}</Text>
            <Text style={styles.cardSubtitle}>{item.enfant_nom || item.enfant} · {item.centre}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Ionicons name={s.icon} size={11} color={s.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{item.heure}</Text>
          </View>
          {item.statut === 'A_VENIR' && (
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]}>
                <Text style={styles.actionSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]}>
                <Text style={styles.actionPrimaryText}>Détails</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={Gradients.brand} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Rendez-vous</Text>
            <Text style={styles.headerSubtitle}>Gérez les rendez-vous de vos enfants</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.segmentsRow}>
        {SEGMENTS.map((seg) => {
          const active = segment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(seg.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={seg.icon} size={14} color={active ? Colors.surface : Colors.textSecondary} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{seg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderRdv}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucun rendez-vous {segment === 'A_VENIR' ? 'à venir' : segment === 'FAIT' ? 'passé' : 'annulé'}</Text>
            <Text style={styles.emptyMessage}>
              {segment === 'A_VENIR' ? 'Planifiez le prochain vaccin de votre enfant.' : 'Vos rendez-vous apparaîtront ici.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowTakeRdv(true)}
        accessibilityRole="button"
        accessibilityLabel="Prendre rendez-vous"
      >
        <Ionicons name="add" size={28} color={Colors.surface} />
        <Text style={styles.fabLabel}>RDV</Text>
      </TouchableOpacity>

      <TakeRdvModal visible={showTakeRdv} onClose={() => setShowTakeRdv(false)} />
    </View>
  );
}

function TakeRdvModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Prendre rendez-vous</Text>
          <Text style={styles.modalSubtitle}>Choisissez un créneau disponible pour le prochain vaccin.</Text>

          <Text style={styles.fieldLabel}>Enfant</Text>
          <View style={styles.chipsRow}>
            {['Salma', 'Asmae'].map((n, i) => (
              <TouchableOpacity key={n} style={[styles.chip, i === 0 && styles.chipActive]}>
                <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Vaccin à administrer</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>DTP 2 (programmé)</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
          </View>

          <Text style={styles.fieldLabel}>Centre</Text>
          <View style={styles.selectBox}>
            <Text style={styles.selectText}>Centre Rabat — Agdal</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
          </View>

          <Text style={styles.fieldLabel}>Créneau disponible</Text>
          <View style={styles.slotsGrid}>
            {['Mer 18/06 09:30', 'Mer 18/06 11:00', 'Jeu 19/06 14:00', 'Ven 20/06 10:00', 'Sam 21/06 09:00'].map((slot, i) => (
              <TouchableOpacity key={slot} style={[styles.slot, i === 0 && styles.slotActive]}>
                <Text style={[styles.slotText, i === 0 && styles.slotTextActive]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <AppButtonLocal title="Annuler" onPress={onClose} variant="ghost" />
            <AppButtonLocal title="Confirmer" onPress={onClose} primary />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AppButtonLocal({ title, onPress, variant, primary }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.btn, primary ? styles.btnPrimary : styles.btnGhost, { flex: 1 }]}
    >
      <Text style={[styles.btnText, primary ? styles.btnTextPrimary : styles.btnTextGhost]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing['3xl'], paddingBottom: Spacing.xl, borderBottomLeftRadius: Radii.header, borderBottomRightRadius: Radii.header },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.surface },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  segmentsRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: -Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.pill, padding: 4, ...Elevation.sm },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radii.pill },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.surface, fontWeight: '700' },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.md, ...Elevation.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radii.pill },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: 'auto' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.sm },
  actionSecondary: { backgroundColor: Colors.surfaceMuted },
  actionSecondaryText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  actionPrimary: { backgroundColor: Colors.primaryTint },
  actionPrimaryText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle: { ...Typography.subtitle, marginBottom: 8 },
  emptyMessage: { ...Typography.body, textAlign: 'center', maxWidth: 280 },
  fab: { position: 'absolute', right: Spacing.lg, bottom: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 6, height: 56, paddingHorizontal: Spacing.lg, borderRadius: 28, backgroundColor: Colors.primary, ...Elevation.md },
  fabLabel: { color: Colors.surface, fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['2xl'], borderTopRightRadius: Radii['2xl'], padding: Spacing.xl, paddingBottom: Spacing['2xl'], maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.title, textAlign: 'center', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.surface },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 12, borderRadius: Radii.sm, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  selectText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.sm, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  slotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  slotTextActive: { color: Colors.surface },
  buttonRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  btn: { paddingVertical: 14, borderRadius: Radii.sm, alignItems: 'center' },
  btnPrimary: { backgroundColor: Colors.primary },
  btnGhost: { backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  btnText: { fontSize: 14, fontWeight: '700' },
  btnTextPrimary: { color: Colors.surface },
  btnTextGhost: { color: Colors.textSecondary },
});