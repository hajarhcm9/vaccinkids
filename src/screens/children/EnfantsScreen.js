import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Alert, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { enfantService } from '../../services';

const AVATAR_GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#06B6D4'],
  ['#3B82F6', '#6366F1'],
];

function getAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob.includes('/') ? dob.split('/').reverse().join('-') : dob);
  const now   = new Date();
  const years  = now.getFullYear() - birth.getFullYear();
  const months = (now.getFullYear() * 12 + now.getMonth()) - (birth.getFullYear() * 12 + birth.getMonth());
  if (years >= 1) return `${years} an${years > 1 ? 's' : ''}`;
  return `${months} mois`;
}

function formatDateDisplay(iso) {
  if (!iso) return '';
  if (iso.includes('/')) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function ProgressPill({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <View style={pills.wrap}>
      <View style={pills.track}>
        <View style={[pills.fill, { width: `${pct}%`, backgroundColor: pct >= 80 ? Colors.success : pct >= 50 ? Colors.accent : Colors.danger }]} />
      </View>
      <Text style={pills.label}>{done}/{total}</Text>
    </View>
  );
}

const pills = StyleSheet.create({
  wrap:  { gap: 4 },
  track: { height: 5, backgroundColor: Colors.border, borderRadius: Radii.pill, width: 70, overflow: 'hidden' },
  fill:  { height: 5, borderRadius: Radii.pill },
  label: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, textAlign: 'right' },
});

export default function EnfantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [enfants, setEnfants]       = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add child modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPrenom,    setAddPrenom]    = useState('');
  const [addNom,       setAddNom]       = useState('');
  const [addDate,      setAddDate]      = useState('');
  const [addSexe,      setAddSexe]      = useState(null);
  const [adding,       setAdding]       = useState(false);
  const [addError,     setAddError]     = useState('');

  const loadEnfants = useCallback(async () => {
    try {
      const data = await enfantService.listEnfants();
      setEnfants(data || []);
    } catch (e) {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEnfants();
    setRefreshing(false);
  }, [loadEnfants]);

  React.useEffect(() => { loadEnfants(); }, [loadEnfants]);

  const resetAddModal = () => {
    setAddPrenom('');
    setAddNom('');
    setAddDate('');
    setAddSexe(null);
    setAddError('');
  };

  const handleAddEnfant = async () => {
    const prenom = addPrenom.trim();
    const nom    = addNom.trim();
    const date   = addDate.trim();
    if (!prenom || !nom || !date || !addSexe) {
      setAddError('Veuillez remplir tous les champs.');
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      setAddError('Date invalide. Format attendu : JJ/MM/AAAA');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const [dd, mm, yyyy] = date.split('/');
      const resp = await enfantService.addEnfant({ prenom, nom, date_naissance: `${yyyy}-${mm}-${dd}`, sexe: addSexe });
      const nouvelEnfant = resp;
      if (nouvelEnfant) {
        setEnfants((prev) => [...prev, nouvelEnfant]);
      }
      resetAddModal();
      setShowAddModal(false);
    } catch (e) {
      setAddError(e?.message || 'Erreur inattendue. Réessayez.');
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const gradient  = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
    const initials  = `${item.prenom?.[0] || ''}${item.nom?.[0] || ''}`.toUpperCase();
    const sexeColor = item.sexe === 'F' ? Colors.danger : Colors.primary;
    const sexeLabel = item.sexe === 'F' ? '♀  Fille' : '♂  Garçon';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('EnfantDetail', { enfant: item })}
      >
        <LinearGradient colors={gradient} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.enfantName}>{item.prenom} {item.nom}</Text>
            <View style={[styles.sexeBadge, { backgroundColor: sexeColor + '18' }]}>
              <Text style={[styles.sexeText, { color: sexeColor }]}>{sexeLabel}</Text>
            </View>
          </View>
          <Text style={styles.enfantAge}>{getAge(item.date_naissance)}  ·  {formatDateDisplay(item.date_naissance)}</Text>
          {item.vaccins_total != null && (
            <ProgressPill done={item.vaccins_faits} total={item.vaccins_total} />
          )}
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Text style={{ fontSize: 44 }}>👶</Text>
      </View>
      <Text style={styles.emptyTitle}>Aucun enfant enregistré</Text>
      <Text style={styles.emptyBody}>
        Ajoutez votre premier enfant pour commencer le suivi vaccinal.
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.decCircle} />
        <Text style={styles.headerSub}>Votre famille</Text>
        <Text style={styles.headerTitle}>Mes enfants</Text>
        <View style={styles.countPill}>
          <Ionicons name="people" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.countText}>{enfants.length} enfant{enfants.length !== 1 ? 's' : ''}</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={enfants}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, !enfants.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.88}
        onPress={() => { resetAddModal(); setShowAddModal(true); }}
      >
        <LinearGradient colors={Gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Add Child Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ajouter un enfant</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {!!addError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                    <Text style={styles.errorText}>{addError}</Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>Prénom *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Prénom de l'enfant"
                  placeholderTextColor={Colors.textLight}
                  value={addPrenom}
                  onChangeText={(v) => { setAddPrenom(v); setAddError(''); }}
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>Nom *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nom de famille"
                  placeholderTextColor={Colors.textLight}
                  value={addNom}
                  onChangeText={(v) => { setAddNom(v); setAddError(''); }}
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>Date de naissance *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor={Colors.textLight}
                  value={addDate}
                  onChangeText={(v) => { setAddDate(v); setAddError(''); }}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />

                <Text style={styles.fieldLabel}>Sexe *</Text>
                <View style={styles.sexeRow}>
                  {[{ key: 'M', label: '♂  Garçon', color: Colors.primary }, { key: 'F', label: '♀  Fille', color: Colors.danger }].map(({ key, label, color }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.sexeChip, addSexe === key && { backgroundColor: color + '18', borderColor: color }]}
                      onPress={() => { setAddSexe(key); setAddError(''); }}
                    >
                      <Text style={[styles.sexeChipText, addSexe === key && { color, fontWeight: '700' }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.confirmBtn, (adding || !addPrenom || !addNom || !addDate || !addSexe) && { opacity: 0.55 }]}
                  onPress={handleAddEnfant}
                  disabled={adding || !addPrenom || !addNom || !addDate || !addSexe}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={Gradients.brand} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {adding
                      ? <ActivityIndicator color={Colors.white} size="small" />
                      : <>
                          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                          <Text style={styles.confirmBtnText}>Ajouter l'enfant</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:      { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['2xl'], position: 'relative', overflow: 'hidden' },
  decCircle:   { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.glass, top: -70, right: -50 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: Spacing.md },
  countPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.pill, paddingHorizontal: Spacing.base, paddingVertical: 5 },
  countText:   { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.90)' },

  list:        { padding: Spacing.lg, gap: Spacing.md },

  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card, gap: Spacing.base },
  avatar:      { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 20, fontWeight: '800', color: Colors.white },

  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4, flexWrap: 'wrap' },
  enfantName:  { fontSize: 16, fontWeight: '700', color: Colors.text },
  sexeBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.pill },
  sexeText:    { fontSize: 11, fontWeight: '700' },
  enfantAge:   { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },

  chevronWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },

  emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['3xl'] },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle:    { fontSize: 19, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },

  fab:         { position: 'absolute', bottom: 28, right: 24, borderRadius: 32, overflow: 'hidden', ...Elevation.xl },
  fabGradient: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], maxHeight: '90%' },
  modalHandle:   { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },

  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerBg, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  errorText:  { flex: 1, fontSize: 13, color: Colors.danger, fontWeight: '600' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  textInput:  { backgroundColor: Colors.surfaceMuted, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: 15, color: Colors.text },

  sexeRow:      { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  sexeChip:     { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  sexeChipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  confirmBtn:   { marginTop: Spacing.lg, borderRadius: Radii.xl, overflow: 'hidden' },
  confirmGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
