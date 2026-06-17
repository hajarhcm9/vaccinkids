import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ScrollView, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { rdvService } from '../../services';

const MOCK_DATA = {
  A_VENIR: [
    { id: 'r1', enfant: 'Salma',  enfant_nom: 'Salma', vaccin: 'DTP 2',    date: '2026-06-20', heure: '09:30', centre: 'Centre de Santé Maârif', statut: 'A_VENIR' },
    { id: 'r2', enfant: 'Asmae',  enfant_nom: 'Asmae', vaccin: 'BCG',      date: '2026-06-25', heure: '10:00', centre: 'Polyclinique Sidi Moumen', statut: 'A_VENIR' },
  ],
  FAIT: [
    { id: 'r3', enfant: 'Salma',  enfant_nom: 'Salma', vaccin: 'Pentavalent 1', date: '2025-12-10', heure: '09:00', centre: 'Centre de Santé Maârif', statut: 'FAIT' },
    { id: 'r4', enfant: 'Salma',  enfant_nom: 'Salma', vaccin: 'BCG',           date: '2025-09-01', heure: '08:30', centre: 'Maternité Al Farabi', statut: 'FAIT' },
  ],
  ANNULE: [
    { id: 'r5', enfant: 'Asmae',  enfant_nom: 'Asmae', vaccin: 'ROR 1',    date: '2025-11-05', heure: '11:00', centre: 'Centre de Santé Maârif', statut: 'ANNULE', motif: 'Enfant malade' },
  ],
};

const SEGMENTS = [
  { key: 'A_VENIR', label: 'À venir',  icon: 'time-outline',          color: Colors.primary  },
  { key: 'FAIT',    label: 'Effectués', icon: 'checkmark-circle-outline', color: Colors.success },
  { key: 'ANNULE',  label: 'Annulés',   icon: 'close-circle-outline',  color: Colors.danger   },
];

const STATUS_META = {
  A_VENIR: { color: Colors.primary,  bg: Colors.primaryTint,  icon: 'time-outline',           label: 'À venir'   },
  FAIT:    { color: Colors.success,  bg: Colors.successBg,    icon: 'checkmark-circle',        label: 'Effectué'  },
  ANNULE:  { color: Colors.danger,   bg: Colors.dangerBg,     icon: 'close-circle',            label: 'Annulé'    },
};

const MOCK_ENFANTS = [
  { id: '1', prenom: 'Salma' },
  { id: '2', prenom: 'Asmae' },
];
const MOCK_VACCINS  = ['BCG', 'DTP 1', 'DTP 2', 'Pentavalent 1', 'ROR 1', 'Hépatite B'];
const MOCK_CENTRES  = ['Centre de Santé Maârif', 'Polyclinique Sidi Moumen', 'Maternité Al Farabi', 'CHU Ibn Rochd'];
const MOCK_SLOTS    = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00'];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function RdvScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [segment,    setSegment]   = useState('A_VENIR');
  const [rdvs,       setRdvs]      = useState({ ...MOCK_DATA });
  const [showModal,  setShowModal] = useState(false);

  const [selEnfant,  setSelEnfant] = useState(null);
  const [selVaccin,  setSelVaccin] = useState(null);
  const [selCentre,  setSelCentre] = useState(null);
  const [selSlot,    setSelSlot]   = useState(null);

  const handleCancel = (item) => {
    Alert.alert(
      'Annuler ce rendez-vous',
      `Confirmer l'annulation du RDV de ${item.enfant} pour le ${item.vaccin} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler', style: 'destructive',
          onPress: async () => {
            try { await rdvService.cancelRdv(item.id); } catch (e) {}
            setRdvs((prev) => {
              const nextAVenir  = prev.A_VENIR.filter((r) => r.id !== item.id);
              const nextAnnule  = [{ ...item, statut: 'ANNULE', motif: 'Annulation utilisateur' }, ...prev.ANNULE];
              return { ...prev, A_VENIR: nextAVenir, ANNULE: nextAnnule };
            });
          },
        },
      ]
    );
  };

  const handleConfirmRdv = () => {
    if (!selEnfant || !selVaccin || !selCentre || !selSlot) {
      Alert.alert('Champs manquants', 'Veuillez compléter tous les champs.');
      return;
    }
    const now = new Date();
    const newRdv = {
      id: `r_${Date.now()}`,
      enfant: selEnfant.prenom,
      enfant_nom: selEnfant.prenom,
      vaccin: selVaccin,
      date: now.toISOString().slice(0, 10),
      heure: selSlot,
      centre: selCentre,
      statut: 'A_VENIR',
    };
    setRdvs((prev) => ({ ...prev, A_VENIR: [newRdv, ...prev.A_VENIR] }));
    setShowModal(false);
    setSelEnfant(null); setSelVaccin(null); setSelCentre(null); setSelSlot(null);
    setSegment('A_VENIR');
  };

  const currentList = rdvs[segment] || [];

  const renderCard = ({ item }) => {
    const m = STATUS_META[item.statut] || STATUS_META.A_VENIR;
    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: m.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: m.bg }]}>
              <Ionicons name="medkit" size={20} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vaccinNom}>{item.vaccin}</Text>
              <Text style={styles.enfantLabel}>Pour {item.enfant}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: m.bg }]}>
              <Ionicons name={m.icon} size={11} color={m.color} />
              <Text style={[styles.badgeText, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <MetaItem icon="calendar-outline" value={formatDate(item.date)} />
            <MetaItem icon="time-outline"     value={item.heure} />
            <MetaItem icon="location-outline" value={item.centre} />
          </View>

          {item.motif && (
            <View style={styles.motifRow}>
              <Ionicons name="information-circle-outline" size={13} color={Colors.danger} />
              <Text style={styles.motifText}>{item.motif}</Text>
            </View>
          )}

          {item.statut === 'A_VENIR' && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('RdvDetail', { rdvId: item.id, rdv: item })}
              >
                <Text style={styles.detailBtnText}>Voir détails</Text>
                <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                <Ionicons name="close-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}><Text style={{ fontSize: 36 }}>📅</Text></View>
      <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
      <Text style={styles.emptyBody}>
        {segment === 'A_VENIR' ? 'Prenez votre premier rendez-vous via le bouton +' : 'L\'historique apparaîtra ici.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.decCircle} />
        <Text style={styles.headerSub}>Suivi médical</Text>
        <Text style={styles.headerTitle}>Mes rendez-vous</Text>

        {/* Segment */}
        <View style={styles.segmentBar}>
          {SEGMENTS.map((s) => {
            const active = segment === s.key;
            const count  = (rdvs[s.key] || []).length;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.segBtn, active && styles.segBtnActive]}
                onPress={() => setSegment(s.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segLabel, active && { color: Colors.text }]}>{s.label}</Text>
                {count > 0 && (
                  <View style={[styles.segCount, { backgroundColor: active ? s.color : Colors.glass }]}>
                    <Text style={[styles.segCountText, { color: active ? Colors.white : 'rgba(255,255,255,0.7)' }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, !currentList.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.88}>
        <LinearGradient colors={Gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Take RDV Modal ── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau rendez-vous</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <PickerSection label="Enfant" icon="person-outline" color={Colors.primary}>
                <View style={styles.chipRow}>
                  {MOCK_ENFANTS.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.chip, selEnfant?.id === e.id && styles.chipActive]}
                      onPress={() => setSelEnfant(e)}
                    >
                      <Text style={[styles.chipText, selEnfant?.id === e.id && styles.chipTextActive]}>{e.prenom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </PickerSection>

              <PickerSection label="Vaccin" icon="medkit-outline" color="#7C3AED">
                <View style={styles.chipRow}>
                  {MOCK_VACCINS.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.chip, selVaccin === v && styles.chipActive]}
                      onPress={() => setSelVaccin(v)}
                    >
                      <Text style={[styles.chipText, selVaccin === v && styles.chipTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </PickerSection>

              <PickerSection label="Centre de santé" icon="location-outline" color={Colors.success}>
                <View style={styles.chipCol}>
                  {MOCK_CENTRES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.centreRow, selCentre === c && styles.centreRowActive]}
                      onPress={() => setSelCentre(c)}
                    >
                      <Ionicons name="business-outline" size={15} color={selCentre === c ? Colors.primary : Colors.textLight} />
                      <Text style={[styles.centreText, selCentre === c && { color: Colors.primary, fontWeight: '700' }]}>{c}</Text>
                      {selCentre === c && <Ionicons name="checkmark-circle" size={17} color={Colors.primary} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </PickerSection>

              <PickerSection label="Créneau horaire" icon="time-outline" color={Colors.accent}>
                <View style={styles.chipRow}>
                  {MOCK_SLOTS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, selSlot === s && styles.chipActive]}
                      onPress={() => setSelSlot(s)}
                    >
                      <Text style={[styles.chipText, selSlot === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </PickerSection>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmRdv} activeOpacity={0.88}>
                <LinearGradient colors={Gradients.brand} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                  <Text style={styles.confirmBtnText}>Confirmer le rendez-vous</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetaItem({ icon, value }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={Colors.textLight} />
      <Text style={styles.metaText}>{value}</Text>
    </View>
  );
}

function PickerSection({ label, icon, color, children }) {
  return (
    <View style={styles.pickerSection}>
      <View style={styles.pickerLabel}>
        <View style={[styles.pickerIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={styles.pickerLabelText}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:        { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, position: 'relative', overflow: 'hidden' },
  decCircle:     { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.glass, top: -60, right: -40 },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  headerTitle:   { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: Spacing.lg },

  segmentBar:    { flexDirection: 'row', backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.xl, padding: 4 },
  segBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: Radii.lg, gap: 5 },
  segBtnActive:  { backgroundColor: Colors.white },
  segLabel:      { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.70)' },
  segCount:      { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segCountText:  { fontSize: 10, fontWeight: '800' },

  list:          { padding: Spacing.lg, gap: Spacing.md },

  card:          { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], flexDirection: 'row', overflow: 'hidden', ...Elevation.card },
  cardAccent:    { width: 5 },
  cardBody:      { flex: 1, padding: Spacing.base, gap: Spacing.sm },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap:      { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  vaccinNom:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  enfantLabel:   { fontSize: 12, color: Colors.textSecondary },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: Radii.pill },
  badgeText:     { fontSize: 10, fontWeight: '700' },

  cardMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:      { fontSize: 12, color: Colors.textSecondary },

  motifRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.dangerBg, padding: Spacing.sm, borderRadius: Radii.sm },
  motifText:     { fontSize: 12, color: Colors.danger, flex: 1 },

  cardActions:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  detailBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cancelBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: Colors.danger },

  emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['3xl'], paddingHorizontal: Spacing['2xl'] },
  emptyIcon:     { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  fab:           { position: 'absolute', bottom: 28, right: 24, borderRadius: 32, overflow: 'hidden', ...Elevation.xl },
  fabGradient:   { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], maxHeight: '92%' },
  modalHandle:   { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },

  pickerSection: { marginBottom: Spacing.lg },
  pickerLabel:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  pickerIconWrap:{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerLabelText:{ fontSize: 14, fontWeight: '700', color: Colors.text },

  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chipCol:       { gap: Spacing.sm },
  chip:          { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive:    { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: Colors.primary, fontWeight: '700' },

  centreRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, backgroundColor: Colors.surfaceMuted, borderRadius: Radii.md, borderWidth: 1.5, borderColor: 'transparent' },
  centreRowActive:{ backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreText:    { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  confirmBtn:    { marginTop: Spacing.lg, borderRadius: Radii.xl, overflow: 'hidden' },
  confirmGrad:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  confirmBtnText:{ fontSize: 16, fontWeight: '700', color: Colors.white },
});
