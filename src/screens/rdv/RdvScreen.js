import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ScrollView, StatusBar, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { rdvService, enfantService } from '../../services';

const SEGMENTS = [
  { key: 'A_VENIR', label: 'À venir',   icon: 'time-outline',             color: Colors.primary  },
  { key: 'FAIT',    label: 'Effectués', icon: 'checkmark-circle-outline', color: Colors.success  },
  { key: 'ANNULE',  label: 'Annulés',   icon: 'close-circle-outline',     color: Colors.danger   },
];

const STATUS_META = {
  EN_ATTENTE:       { color: Colors.primary,  bg: Colors.primaryTint, icon: 'time-outline',      label: 'En attente'     },
  EN_LISTE_ATTENTE: { color: Colors.accent,   bg: Colors.accentLight, icon: 'hourglass-outline', label: 'Liste d\'attente' },
  CONFIRME:         { color: Colors.info,     bg: Colors.infoBg,      icon: 'checkmark-circle',  label: 'Confirmé'       },
  PRESENT:          { color: Colors.success,  bg: Colors.successBg,   icon: 'checkmark-circle',  label: 'Effectué'       },
  ABSENT:           { color: Colors.danger,   bg: Colors.dangerBg,    icon: 'close-circle',      label: 'Absent'         },
  ANNULE:           { color: Colors.danger,   bg: Colors.dangerBg,    icon: 'close-circle',      label: 'Annulé'         },
};

const UPCOMING_STATUTS = ['EN_ATTENTE', 'CONFIRME', 'EN_LISTE_ATTENTE'];
const DONE_STATUTS     = ['PRESENT', 'ABSENT'];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function RdvScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [segment,     setSegment]    = useState('A_VENIR');
  const [allRdvs,     setAllRdvs]    = useState([]);
  const [sessions,    setSessions]   = useState([]);
  const [enfantsList, setEnfantsList] = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [showModal,   setShowModal]  = useState(false);
  const [confirming,  setConfirming] = useState(false);
  const [selEnfant,   setSelEnfant]  = useState(null);
  const [selSession,  setSelSession] = useState(null);

  const rdvsBySegment = {
    A_VENIR: allRdvs.filter((r) => UPCOMING_STATUTS.includes(r.statut)),
    FAIT:    allRdvs.filter((r) => DONE_STATUTS.includes(r.statut)),
    ANNULE:  allRdvs.filter((r) => r.statut === 'ANNULE'),
  };

  const loadData = useCallback(async () => {
    try {
      const [rdvData, sessionData, enfantData] = await Promise.all([
        rdvService.listRdv().catch(() => []),
        rdvService.listSessions().catch(() => []),
        enfantService.listEnfants().catch(() => []),
      ]);
      setAllRdvs(rdvData || []);
      setSessions(sessionData || []);
      setEnfantsList(enfantData || []);
    } catch (e) {}
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const resetModal = () => {
    setSelEnfant(null);
    setSelSession(null);
  };

  const handleCancel = (item) => {
    Alert.alert(
      'Annuler ce rendez-vous',
      `Annuler le RDV de ${item.bebe_prenom || '—'} pour ${item.vaccin_nom || '—'} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler', style: 'destructive',
          onPress: async () => {
            try {
              await rdvService.cancelRdv(item.id);
              setAllRdvs((prev) =>
                prev.map((r) => r.id === item.id ? { ...r, statut: 'ANNULE' } : r)
              );
            } catch (e) {
              Alert.alert('Erreur', 'Impossible d\'annuler ce rendez-vous.');
            }
          },
        },
      ]
    );
  };

  const handleBook = async () => {
    if (!selEnfant || !selSession) {
      Alert.alert('Champs manquants', 'Choisissez un enfant et une session.');
      return;
    }
    setConfirming(true);
    try {
      const available = selSession.max_inscriptions - (selSession.inscrits || 0);
      const isFull = available <= 0;
      const resp = isFull
        ? await rdvService.joinWaitlist(selSession.id, selEnfant.id)
        : await rdvService.inscribeSession(selSession.id, selEnfant.id);

      const newRdv = resp?.id ? resp : {
        id: `r_${Date.now()}`,
        statut: isFull ? 'EN_LISTE_ATTENTE' : 'EN_ATTENTE',
        vaccin_nom:  selSession.vaccin_nom,
        bebe_prenom: selEnfant.prenom,
        bebe_nom:    selEnfant.nom,
        date_session: selSession.date_session,
        heure_debut:  selSession.heure_debut,
        centre_nom:   selSession.centre_nom,
      };
      setAllRdvs((prev) => [newRdv, ...prev]);
      setShowModal(false);
      resetModal();
      setSegment('A_VENIR');
      if (isFull) {
        Alert.alert('Liste d\'attente', 'La session est complète. Vous avez été ajouté à la liste d\'attente.');
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de prendre ce rendez-vous. Réessayez.');
    } finally {
      setConfirming(false);
    }
  };

  const currentList = rdvsBySegment[segment] || [];

  const renderCard = ({ item }) => {
    const m = STATUS_META[item.statut] || STATUS_META.EN_ATTENTE;
    const canCancel = UPCOMING_STATUTS.includes(item.statut);
    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: m.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: m.bg }]}>
              <Ionicons name="medkit" size={20} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vaccinNom}>{item.vaccin_nom || '—'}</Text>
              <Text style={styles.enfantLabel}>Pour {item.bebe_prenom || item.bebe_nom || '—'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: m.bg }]}>
              <Ionicons name={m.icon} size={11} color={m.color} />
              <Text style={[styles.badgeText, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <MetaItem icon="calendar-outline" value={formatDate(item.date_session)} />
            <MetaItem icon="time-outline"     value={item.heure_debut || '—'} />
            <MetaItem icon="location-outline" value={item.centre_nom || '—'} />
          </View>

          {canCancel && (
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

        <View style={styles.segmentBar}>
          {SEGMENTS.map((s) => {
            const active = segment === s.key;
            const count  = (rdvsBySegment[s.key] || []).length;
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

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing['3xl'] }} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.list, !currentList.length && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              colors={[Colors.primary]} tintColor={Colors.primary} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { resetModal(); setShowModal(true); }}
        activeOpacity={0.88}
      >
        <LinearGradient colors={Gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Book RDV Modal ── */}
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

              {/* Enfant picker */}
              <PickerSection label="Enfant" icon="person-outline" color={Colors.primary}>
                {enfantsList.length === 0 ? (
                  <Text style={styles.noDataText}>Aucun enfant enregistré. Ajoutez d'abord un enfant.</Text>
                ) : (
                  <View style={styles.chipRow}>
                    {enfantsList.map((e) => (
                      <TouchableOpacity
                        key={String(e.id)}
                        style={[styles.chip, selEnfant?.id === e.id && styles.chipActive]}
                        onPress={() => setSelEnfant(e)}
                      >
                        <Text style={[styles.chipText, selEnfant?.id === e.id && styles.chipTextActive]}>
                          {e.prenom}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </PickerSection>

              {/* Session picker */}
              <PickerSection label="Session de vaccination" icon="calendar-outline" color={Colors.success}>
                {sessions.length === 0 ? (
                  <Text style={styles.noDataText}>Aucune session disponible pour le moment.</Text>
                ) : (
                  <View style={styles.sessionList}>
                    {sessions.map((s) => {
                      const available = s.max_inscriptions - (s.inscrits || 0);
                      const isFull    = available <= 0;
                      const selected  = selSession?.id === s.id;
                      return (
                        <TouchableOpacity
                          key={String(s.id)}
                          style={[styles.sessionRow, selected && styles.sessionRowActive]}
                          onPress={() => setSelSession(s)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.sessionLeft}>
                            <Text style={styles.sessionVaccin}>{s.vaccin_nom}</Text>
                            <Text style={styles.sessionCentre}>{s.centre_nom}</Text>
                            <Text style={styles.sessionMeta}>
                              {formatDate(s.date_session)}{'  ·  '}{s.heure_debut} – {s.heure_fin}
                            </Text>
                          </View>
                          <View style={styles.sessionRight}>
                            {isFull ? (
                              <Text style={styles.sessionFull}>Liste d'attente</Text>
                            ) : (
                              <Text style={styles.sessionPlaces}>
                                {available} place{available > 1 ? 's' : ''}
                              </Text>
                            )}
                            {selected && (
                              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={{ marginTop: 4 }} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </PickerSection>

              <TouchableOpacity
                style={[styles.confirmBtn, (confirming || !selEnfant || !selSession) && { opacity: 0.55 }]}
                onPress={handleBook}
                disabled={confirming || !selEnfant || !selSession}
                activeOpacity={0.88}
              >
                <LinearGradient colors={Gradients.brand} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {confirming
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <>
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                        <Text style={styles.confirmBtnText}>
                          {selSession && selSession.max_inscriptions - (selSession.inscrits || 0) <= 0
                            ? 'Rejoindre la liste d\'attente'
                            : 'Confirmer le rendez-vous'}
                        </Text>
                      </>
                  }
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
  modalOverlay:   { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], maxHeight: '92%' },
  modalHandle:    { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalCloseBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },

  noDataText:    { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', paddingVertical: Spacing.sm },

  pickerSection:    { marginBottom: Spacing.lg },
  pickerLabel:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  pickerIconWrap:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerLabelText:  { fontSize: 14, fontWeight: '700', color: Colors.text },

  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip:          { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive:    { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: Colors.primary, fontWeight: '700' },

  sessionList:     { gap: Spacing.sm },
  sessionRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: Spacing.base, backgroundColor: Colors.surfaceMuted, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: 'transparent' },
  sessionRowActive:{ backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  sessionLeft:     { flex: 1, gap: 3 },
  sessionVaccin:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  sessionCentre:   { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sessionMeta:     { fontSize: 11, color: Colors.textLight },
  sessionRight:    { alignItems: 'flex-end', marginLeft: Spacing.sm },
  sessionPlaces:   { fontSize: 12, fontWeight: '700', color: Colors.success },
  sessionFull:     { fontSize: 11, fontWeight: '700', color: Colors.accent },

  confirmBtn:     { marginTop: Spacing.lg, borderRadius: Radii.xl, overflow: 'hidden' },
  confirmGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
