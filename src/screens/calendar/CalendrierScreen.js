import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { vaccinService, enfantService } from '../../services';

const STATUS_META = {
  FAIT:      { color: Colors.success,       bg: Colors.successBg,  icon: 'checkmark-circle', label: 'Fait' },
  A_VENIR:   { color: Colors.primary,       bg: Colors.primaryTint, icon: 'time-outline',    label: 'À venir' },
  EN_RETARD: { color: Colors.danger,        bg: Colors.dangerBg,   icon: 'alert-circle',     label: 'En retard' },
  PLANIFIE:  { color: Colors.accent,        bg: Colors.accentLight, icon: 'calendar',        label: 'Planifié' },
};

const AVATAR_GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#06B6D4'],
];

export default function CalendrierScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const initialEnfantId = route?.params?.enfantId ?? null;
  const [enfants,         setEnfants]         = useState([]);
  const [selectedEnfant,  setSelectedEnfant]  = useState(null);
  const [vaccins,         setVaccins]         = useState([]);

  const loadEnfants = useCallback(async () => {
    try {
      const data = await enfantService.listEnfants();
      if (data?.length) {
        setEnfants(data);
        const target = initialEnfantId
          ? (data.find((e) => String(e.id) === String(initialEnfantId)) || data[0])
          : data[0];
        setSelectedEnfant(target);
      }
    } catch (e) {}
  }, [initialEnfantId]);

  const loadVaccins = useCallback(async (enfantId) => {
    try {
      const data = await vaccinService.getCalendrierEnfant(enfantId);
      setVaccins(data || []);
    } catch (e) {
      setVaccins([]);
    }
  }, []);

  React.useEffect(() => { loadEnfants(); }, [loadEnfants]);
  React.useEffect(() => {
    if (selectedEnfant?.id) loadVaccins(selectedEnfant.id);
  }, [selectedEnfant, loadVaccins]);

  const handleSelectEnfant = (enfant) => {
    setSelectedEnfant(enfant);
    setVaccins([]);
  };

  const total  = vaccins.length;
  const done   = vaccins.filter((v) => v.statut === 'FAIT').length;
  const late   = vaccins.filter((v) => v.statut === 'EN_RETARD').length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  const renderVaccin = ({ item, index }) => {
    const m       = STATUS_META[item.statut] || STATUS_META.A_VENIR;
    const isLast  = index === vaccins.length - 1;
    return (
      <TouchableOpacity
        style={styles.vaccinRow}
        activeOpacity={0.8}
        onPress={() => navigation?.navigate('VaccinDetail', { vaccin: item })}
      >
        {/* Timeline */}
        <View style={styles.timelineCol}>
          <View style={[styles.timelineDot, { backgroundColor: m.color }]}>
            <Ionicons name={m.icon} size={12} color={Colors.white} />
          </View>
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: m.color + '40' }]} />}
        </View>

        <View style={[styles.vaccinCard, { borderLeftColor: m.color }]}>
          <View style={styles.vaccinTop}>
            <Text style={styles.vaccinNom}>{item.nom}</Text>
            <View style={[styles.statusBadge, { backgroundColor: m.bg }]}>
              <Text style={[styles.statusText, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>
          <View style={styles.vaccinMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textLight} />
              <Text style={styles.metaText}>{item.date_prevue}</Text>
            </View>
            {item.dose && (
              <View style={styles.metaChip}>
                <Ionicons name="medical-outline" size={11} color={Colors.textLight} />
                <Text style={styles.metaText}>Dose {item.dose}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.decCircle} />
        <Text style={styles.headerSub}>Carnet vaccinal</Text>
        <Text style={styles.headerTitle}>Calendrier</Text>

        {/* Child selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
          {enfants.map((e, idx) => {
            const isSelected = selectedEnfant?.id === e.id;
            const gradient   = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
            return (
              <TouchableOpacity
                key={e.id}
                style={[styles.selectorPill, isSelected && styles.selectorPillActive]}
                onPress={() => handleSelectEnfant(e)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={gradient} style={styles.selectorAvatar}>
                  <Text style={styles.selectorAvatarText}>{e.prenom[0]}</Text>
                </LinearGradient>
                <Text style={[styles.selectorName, isSelected && styles.selectorNameActive]}>
                  {e.prenom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* ── Progress card ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressLeft}>
          <Text style={styles.progressTitle}>Couverture vaccinale</Text>
          <Text style={styles.progressSub}>{selectedEnfant?.prenom}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: Colors.success }]}>{done}</Text>
              <Text style={styles.statLbl}>Faits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: Colors.danger }]}>{late}</Text>
              <Text style={styles.statLbl}>Retard</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: Colors.textSecondary }]}>{total - done}</Text>
              <Text style={styles.statLbl}>Restant</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressRing}>
          <View style={styles.ringOuter}>
            <Text style={styles.ringPct}>{pct}%</Text>
            <Text style={styles.ringLabel}>complet</Text>
          </View>
        </View>
      </View>

      {/* ── Vaccine list ── */}
      <FlatList
        data={vaccins}
        keyExtractor={(item) => item.id}
        renderItem={renderVaccin}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Aucun vaccin enregistré pour cet enfant.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:        { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, position: 'relative', overflow: 'hidden' },
  decCircle:     { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.glass, top: -60, right: -40 },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  headerTitle:   { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: Spacing.lg },

  selectorScroll:   { marginHorizontal: -Spacing.xl, paddingHorizontal: Spacing.xl },
  selectorPill:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: Spacing.sm, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.pill, paddingVertical: 7, paddingHorizontal: Spacing.base },
  selectorPillActive:{ backgroundColor: Colors.surface + 'CC', borderColor: Colors.white },
  selectorAvatar:   { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  selectorAvatarText:{ fontSize: 12, fontWeight: '800', color: Colors.white },
  selectorName:     { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.80)' },
  selectorNameActive:{ color: Colors.text, fontWeight: '700' },

  // Progress card
  progressCard:  { margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', ...Elevation.card },
  progressLeft:  { flex: 1, gap: Spacing.sm },
  progressTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  progressSub:   { fontSize: 12, color: Colors.textSecondary },
  statsRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 4 },
  statItem:      { alignItems: 'center' },
  statNum:       { fontSize: 22, fontWeight: '800' },
  statLbl:       { fontSize: 10, color: Colors.textLight, fontWeight: '600' },
  statDivider:   { width: 1, height: 28, backgroundColor: Colors.border },

  progressRing:  { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ringOuter:     { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryTint, borderWidth: 4, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  ringPct:       { fontSize: 17, fontWeight: '800', color: Colors.primary },
  ringLabel:     { fontSize: 9,  fontWeight: '700', color: Colors.primary + 'AA' },

  // List
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['4xl'] },
  vaccinRow:   { flexDirection: 'row', marginBottom: 2 },
  timelineCol: { width: 32, alignItems: 'center' },
  timelineDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineLine:{ width: 2, flex: 1, minHeight: 20, marginTop: 4 },

  vaccinCard:  { flex: 1, backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.md, marginLeft: Spacing.sm, marginBottom: Spacing.sm, ...Elevation.xs, borderLeftWidth: 3 },
  vaccinTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  vaccinNom:   { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1, marginRight: Spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.pill },
  statusText:  { fontSize: 10, fontWeight: '700' },

  vaccinMeta:  { flexDirection: 'row', gap: Spacing.md },
  metaChip:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:    { fontSize: 11, color: Colors.textLight },

  emptyWrap:   { paddingTop: Spacing['3xl'], alignItems: 'center' },
  emptyText:   { color: Colors.textSecondary, fontSize: 14 },
});
