import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { rdvService } from '../../services';

const MOCK_DATA = {
  A_VENIR: [
    { id: '1', vaccin: 'DTP 2',      enfant: 'Salma', enfant_nom: 'Salma', date: '2026-06-20', heure: '09:30', centre: 'Centre Rabat — Agdal', statut: 'A_VENIR' },
    { id: '2', vaccin: 'Rougeole 1', enfant: 'Asmae', enfant_nom: 'Asmae', date: '2026-06-27', heure: '14:00', centre: 'Centre Rabat — Agdal', statut: 'A_VENIR' },
  ],
  FAIT: [
    { id: '3', vaccin: 'BCG',          enfant: 'Salma', enfant_nom: 'Salma', date: '2026-05-12', heure: '10:00', centre: 'Centre Rabat — Hassan', statut: 'FAIT' },
    { id: '4', vaccin: 'Hépatite B 1', enfant: 'Asmae', enfant_nom: 'Asmae', date: '2026-05-04', heure: '11:30', centre: 'Centre Rabat — Hassan', statut: 'FAIT' },
    { id: '5', vaccin: 'DTP 1',        enfant: 'Salma', enfant_nom: 'Salma', date: '2026-04-18', heure: '09:00', centre: 'Centre Rabat — Agdal',  statut: 'FAIT' },
  ],
  ANNULE: [
    { id: '6', vaccin: 'Varicelle', enfant: 'Asmae', enfant_nom: 'Asmae', date: '2026-06-05', heure: '10:30', centre: 'Centre Rabat — Hassan', statut: 'ANNULE' },
  ],
};

const SEGMENTS = [
  { key: 'A_VENIR', label: 'À venir', icon: 'calendar-outline' },
  { key: 'FAIT',    label: 'Passés',  icon: 'checkmark-done-outline' },
  { key: 'ANNULE',  label: 'Annulés', icon: 'close-circle-outline' },
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function RdvScreen({ navigation }) {
  const [segment, setSegment] = useState('A_VENIR');
  const [showTakeRdv, setShowTakeRdv] = useState(false);
  const [data, setData] = useState(MOCK_DATA);

  const loadRdv = React.useCallback(async (seg) => {
    try {
      const resp = await rdvService.listRdv(seg);
      if (Array.isArray(resp) && resp.length > 0) {
        setData((prev) => ({ ...prev, [seg]: resp }));
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => { loadRdv(segment); }, [segment]);

  const currentData = data[segment] || [];

  const statusMeta = (status) => {
    switch (status) {
      case 'A_VENIR': return { color: Colors.primary, bg: Colors.primary + '20', icon: 'time-outline',    label: 'À venir' };
      case 'FAIT':    return { color: Colors.success, bg: Colors.success + '20', icon: 'checkmark-circle', label: 'Confirmé' };
      case 'ANNULE':  return { color: Colors.danger,  bg: Colors.danger  + '20', icon: 'close-circle',    label: 'Annulé' };
      default:        return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status };
    }
  };

  const handleCancel = (item) => {
    Alert.alert(
      'Annuler le RDV',
      `Annuler le rendez-vous ${item.vaccin} pour ${item.enfant_nom || item.enfant} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler', style: 'destructive',
          onPress: async () => {
            setData((prev) => ({
              ...prev,
              A_VENIR: prev.A_VENIR.filter((r) => r.id !== item.id),
              ANNULE:  [{ ...item, statut: 'ANNULE' }, ...prev.ANNULE],
            }));
            try { await rdvService.cancelRdv(item.id); } catch (e) {}
          },
        },
      ]
    );
  };

  const handleAddRdv = (newRdv) => {
    setData((prev) => ({
      ...prev,
      A_VENIR: [newRdv, ...prev.A_VENIR],
    }));
    setShowTakeRdv(false);
  };

  const renderRdv = ({ item }) => {
    const s = statusMeta(item.statut);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: s.color }]}>
            <Ionicons name="medkit" size={20} color={Colors.surface} />
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
              <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]} onPress={() => handleCancel(item)}>
                <Text style={styles.actionSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => navigation.navigate('RdvDetail', { rdvId: item.id, rdv: item })}
              >
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
        <Text style={styles.headerTitle}>Rendez-vous</Text>
        <Text style={styles.headerSubtitle}>Gérez les rendez-vous de vos enfants</Text>
      </LinearGradient>

      <View style={styles.segmentsRow}>
        {SEGMENTS.map((seg) => {
          const active = segment === seg.key;
          const count = data[seg.key]?.length || 0;
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
              {count > 0 && (
                <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
                  <Text style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={renderRdv}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              Aucun rendez-vous {segment === 'A_VENIR' ? 'à venir' : segment === 'FAIT' ? 'passé' : 'annulé'}
            </Text>
            <Text style={styles.emptyMessage}>
              {segment === 'A_VENIR' ? 'Planifiez le prochain vaccin de votre enfant.' : 'Vos rendez-vous apparaîtront ici.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowTakeRdv(true)} accessibilityRole="button">
        <Ionicons name="add" size={28} color={Colors.surface} />
        <Text style={styles.fabLabel}>RDV</Text>
      </TouchableOpacity>

      <TakeRdvModal visible={showTakeRdv} onClose={() => setShowTakeRdv(false)} onConfirm={handleAddRdv} />
    </View>
  );
}

const ENFANTS_MOCK  = ['Salma', 'Asmae'];
const VACCINS_MOCK  = ['DTP 2', 'Hépatite B 2', 'Rougeole 1', 'Varicelle'];
const CENTRES_MOCK  = ['Centre Rabat — Agdal', 'Centre Rabat — Hassan', 'Centre Salé — Centre'];
const SLOTS_MOCK    = ['Mer 18/06 09:30', 'Mer 18/06 11:00', 'Jeu 19/06 14:00', 'Ven 20/06 10:00', 'Sam 21/06 09:00'];

function TakeRdvModal({ visible, onClose, onConfirm }) {
  const [selectedEnfant, setSelectedEnfant] = useState(0);
  const [selectedVaccin, setSelectedVaccin] = useState(0);
  const [selectedCentre, setSelectedCentre] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handleConfirm = () => {
    if (selectedSlot === null) {
      Alert.alert('Créneau requis', 'Veuillez choisir un créneau disponible.');
      return;
    }
    const slotParts = SLOTS_MOCK[selectedSlot].split(' ');
    onConfirm({
      id: Date.now().toString(),
      vaccin: VACCINS_MOCK[selectedVaccin],
      enfant: ENFANTS_MOCK[selectedEnfant],
      enfant_nom: ENFANTS_MOCK[selectedEnfant],
      date: new Date().toISOString(),
      heure: slotParts[slotParts.length - 1],
      centre: CENTRES_MOCK[selectedCentre],
      statut: 'A_VENIR',
    });
    setSelectedSlot(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Prendre rendez-vous</Text>
          <Text style={styles.modalSubtitle}>Choisissez un créneau disponible pour le prochain vaccin.</Text>

          <Text style={styles.fieldLabel}>Enfant</Text>
          <View style={styles.chipsRow}>
            {ENFANTS_MOCK.map((n, i) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, selectedEnfant === i && styles.chipActive]}
                onPress={() => setSelectedEnfant(i)}
              >
                <Text style={[styles.chipText, selectedEnfant === i && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Vaccin à administrer</Text>
          {VACCINS_MOCK.map((v, i) => (
            <TouchableOpacity
              key={v}
              style={[styles.selectBox, selectedVaccin === i && styles.selectBoxActive]}
              onPress={() => setSelectedVaccin(i)}
            >
              <Text style={[styles.selectText, selectedVaccin === i && { color: Colors.primary, fontWeight: '700' }]}>{v}</Text>
              {selectedVaccin === i && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          ))}

          <Text style={styles.fieldLabel}>Centre</Text>
          {CENTRES_MOCK.map((c, i) => (
            <TouchableOpacity
              key={c}
              style={[styles.selectBox, selectedCentre === i && styles.selectBoxActive]}
              onPress={() => setSelectedCentre(i)}
            >
              <Ionicons name="location-outline" size={15} color={selectedCentre === i ? Colors.primary : Colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectText, { flex: 1 }, selectedCentre === i && { color: Colors.primary, fontWeight: '700' }]}>{c}</Text>
              {selectedCentre === i && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          ))}

          <Text style={styles.fieldLabel}>Créneau disponible</Text>
          <View style={styles.slotsGrid}>
            {SLOTS_MOCK.map((slot, i) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slot, selectedSlot === i && styles.slotActive]}
                onPress={() => setSelectedSlot(i)}
              >
                <Text style={[styles.slotText, selectedSlot === i && styles.slotTextActive]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={onClose}>
              <Text style={[styles.btnText, styles.btnTextGhost]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { flex: 1 }, selectedSlot === null && { opacity: 0.5 }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Confirmer</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  header:             { paddingHorizontal: Spacing.xl, paddingTop: Spacing['3xl'], paddingBottom: Spacing.xl, borderBottomLeftRadius: Radii.header, borderBottomRightRadius: Radii.header },
  headerTitle:        { fontSize: 24, fontWeight: '800', color: Colors.surface },
  headerSubtitle:     { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  segmentsRow:        { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: -Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.pill, padding: 4, ...Elevation.sm },
  segment:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: Radii.pill },
  segmentActive:      { backgroundColor: Colors.primary },
  segmentText:        { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive:  { color: Colors.surface, fontWeight: '700' },
  segmentBadge:       { backgroundColor: Colors.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  segmentBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  segmentBadgeText:   { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  segmentBadgeTextActive: { color: Colors.surface },
  card:               { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.md, ...Elevation.sm },
  cardHeader:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardIcon:           { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardSubtitle:       { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radii.pill },
  statusText:         { fontSize: 10, fontWeight: '700' },
  cardFooter:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, flexWrap: 'wrap' },
  metaRow:            { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:           { fontSize: 12, color: Colors.textSecondary },
  cardActions:        { flexDirection: 'row', gap: Spacing.sm, marginLeft: 'auto' },
  actionBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.sm },
  actionSecondary:    { backgroundColor: Colors.surfaceMuted },
  actionSecondaryText:{ color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  actionPrimary:      { backgroundColor: Colors.primaryTint },
  actionPrimaryText:  { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  empty:              { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIcon:          { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle:         { ...Typography.subtitle, marginBottom: 8 },
  emptyMessage:       { ...Typography.body, textAlign: 'center', maxWidth: 280 },
  fab:                { position: 'absolute', right: Spacing.lg, bottom: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 6, height: 56, paddingHorizontal: Spacing.lg, borderRadius: 28, backgroundColor: Colors.primary, ...Elevation.md },
  fabLabel:           { color: Colors.surface, fontSize: 13, fontWeight: '700' },
  modalOverlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent:       { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['2xl'], borderTopRightRadius: Radii['2xl'], padding: Spacing.xl, maxHeight: '92%' },
  modalHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle:         { ...Typography.title, textAlign: 'center', marginBottom: 6 },
  modalSubtitle:      { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },
  fieldLabel:         { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsRow:           { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  chip:               { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive:         { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:           { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:     { color: Colors.surface },
  selectBox:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderRadius: Radii.sm, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.sm },
  selectBoxActive:    { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  selectText:         { fontSize: 14, color: Colors.text, fontWeight: '500', flex: 1 },
  slotsGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot:               { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.sm, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  slotActive:         { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotText:           { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  slotTextActive:     { color: Colors.surface },
  buttonRow:          { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  btn:                { paddingVertical: 14, borderRadius: Radii.sm, alignItems: 'center' },
  btnPrimary:         { backgroundColor: Colors.primary },
  btnGhost:           { backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  btnText:            { fontSize: 14, fontWeight: '700' },
  btnTextPrimary:     { color: Colors.surface },
  btnTextGhost:       { color: Colors.textSecondary },
});
