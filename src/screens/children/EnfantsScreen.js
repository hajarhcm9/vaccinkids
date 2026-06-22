import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { enfantService } from '../../services';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (months === 0) return 'Nouveau-né';
  return `${months} mois`;
}

function validateDate(str) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
  const [dd, mm, yyyy] = str.split('/').map(Number);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return false;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return false;
  return d <= new Date();
}

// ── ProgressPill ──────────────────────────────────────────────────────────────

function ProgressPill({ done, total }) {
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct >= 80 ? Colors.success : pct >= 50 ? Colors.accent : Colors.danger;
  return (
    <View style={pills.wrap}>
      <View style={pills.track}>
        <View style={[pills.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={pills.label}>{done}/{total} vaccins</Text>
    </View>
  );
}

const pills = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  track: { height: 5, backgroundColor: Colors.border, borderRadius: Radii.pill, width: 72, overflow: 'hidden' },
  fill:  { height: 5, borderRadius: Radii.pill },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
});

// ── Main ──────────────────────────────────────────────────────────────────────

export default function EnfantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [enfants,    setEnfants]    = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPrenom,    setAddPrenom]    = useState('');
  const [addNom,       setAddNom]       = useState('');
  const [addDate,      setAddDate]      = useState('');
  const [addSexe,      setAddSexe]      = useState(null);
  const [addNewborn,   setAddNewborn]   = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [addError,     setAddError]     = useState('');

  const loadEnfants = useCallback(async () => {
    try {
      const data = await enfantService.listEnfants();
      setEnfants(data || []);
    } catch (e) {
      if (__DEV__) console.log('[EnfantsScreen] loadEnfants:', e?.message);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEnfants();
    setRefreshing(false);
  }, [loadEnfants]);

  useFocusEffect(useCallback(() => { loadEnfants(); }, [loadEnfants]));

  // Auto-open modal after fresh registration
  useEffect(() => {
    AsyncStorage.getItem('new_parent_registration').then((val) => {
      if (val === 'true') {
        AsyncStorage.removeItem('new_parent_registration');
        resetAddModal();
        setAddNewborn(true);
        setShowAddModal(true);
      }
    });
  }, []);

  const resetAddModal = () => {
    setAddPrenom('');
    setAddNom('');
    setAddDate('');
    setAddSexe(null);
    setAddNewborn(false);
    setAddError('');
  };

  const openModal = () => { resetAddModal(); setShowAddModal(true); };

  // ── Date auto-format ──────────────────────────────────────────────────────

  const handleDateChange = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 8);
    let f = digits;
    if (digits.length > 2) f = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) f = f.slice(0, 5) + '/' + digits.slice(4);
    setAddDate(f);
    setAddError('');
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleAddEnfant = async () => {
    setAddError('');
    const prenom = addPrenom.trim();
    const nom    = addNom.trim();

    if (!addNewborn) {
      if (!prenom)             { setAddError('Le prénom est obligatoire.'); return; }
      if (!nom)                { setAddError('Le nom est obligatoire.'); return; }
      if (!validateDate(addDate.trim())) {
        setAddError('Date invalide ou dans le futur. Format : JJ/MM/AAAA');
        return;
      }
    }
    if (!addSexe) { setAddError('Veuillez indiquer le sexe.'); return; }

    setAdding(true);
    try {
      const today = new Date();
      const dateNaissance = addNewborn
        ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        : (() => { const [dd, mm, yyyy] = addDate.trim().split('/'); return `${yyyy}-${mm}-${dd}`; })();

      await enfantService.addEnfant({
        prenom:         addNewborn ? (prenom || 'Nouveau-né') : prenom,
        nom:            nom || '',
        date_naissance: dateNaissance,
        sexe:           addSexe,
        is_newborn:     addNewborn,
      });
      await loadEnfants();
      resetAddModal();
      setShowAddModal(false);
    } catch (e) {
      setAddError(e?.message || 'Erreur inattendue. Réessayez.');
    } finally {
      setAdding(false);
    }
  };

  // ── Card ──────────────────────────────────────────────────────────────────

  const renderItem = ({ item, index }) => {
    const gradient   = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
    const isF        = item.sexe === 'F';
    const isNewborn  = item.is_newborn === true || item.is_newborn === 1;
    const initials   = isNewborn
      ? '?'
      : `${item.prenom?.[0] || ''}${item.nom?.[0] || ''}`.toUpperCase();
    const retard     = item.vaccins_retard ?? 0;
    const hasVaccins = item.vaccins_total != null && item.vaccins_total > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('EnfantDetail', { enfant: item })}
      >
        {/* Avatar */}
        <LinearGradient colors={gradient} style={styles.avatar}>
          {isNewborn
            ? <Ionicons name="happy-outline" size={26} color={Colors.white} />
            : <Text style={styles.avatarText}>{initials}</Text>
          }
        </LinearGradient>

        {/* Info block */}
        <View style={{ flex: 1 }}>
          {/* Row 1 : nom + badge */}
          <View style={styles.nameRow}>
            <Text style={styles.enfantName} numberOfLines={1}>
              {isNewborn ? 'Nouveau-né' : `${item.prenom} ${item.nom}`}
            </Text>
            {isNewborn ? (
              <View style={styles.badgeNewborn}>
                <Text style={styles.badgeNewbornText}>👶 À compléter</Text>
              </View>
            ) : (
              <View style={[styles.badgeSexe, { backgroundColor: (isF ? Colors.danger : Colors.primary) + '18' }]}>
                <Text style={[styles.badgeSexeText, { color: isF ? Colors.danger : Colors.primary }]}>
                  {isF ? '♀' : '♂'}
                </Text>
              </View>
            )}
          </View>

          {/* Row 2 : âge + N° centre */}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color={Colors.textLight} />
            <Text style={styles.metaText}>{getAge(item.date_naissance)}</Text>
            {item.numero_centre != null && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>N° {item.numero_centre}</Text>
              </>
            )}
          </View>

          {/* Row 3 : alerte retard (si applicable) */}
          {retard > 0 && (
            <View style={styles.retardBadge}>
              <Ionicons name="alert-circle" size={12} color={Colors.danger} />
              <Text style={styles.retardText}>
                {retard} vaccin{retard > 1 ? 's' : ''} en retard
              </Text>
            </View>
          )}

          {/* Row 4 : hint nouveau-né cliquable */}
          {isNewborn && (
            <TouchableOpacity
              style={styles.completeHint}
              onPress={() => navigation.navigate('EnfantDetail', { enfant: item })}
              activeOpacity={0.7}
            >
              <Text style={styles.completeHintText}>Compléter le profil</Text>
              <Ionicons name="chevron-forward" size={11} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {/* Row 5 : progression */}
          {hasVaccins && !isNewborn && (
            <ProgressPill done={item.vaccins_faits} total={item.vaccins_total} />
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
      </TouchableOpacity>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <LinearGradient colors={Gradients.brand} style={styles.emptyIconGrad}>
          <Ionicons name="happy-outline" size={44} color={Colors.white} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>Aucun enfant enregistré</Text>
      <Text style={styles.emptyBody}>
        Ajoutez votre premier enfant pour commencer le suivi vaccinal et recevoir des rappels.
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={openModal} activeOpacity={0.88}>
        <LinearGradient colors={Gradients.brand} style={styles.emptyCtaGrad}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
          <Text style={styles.emptyCtaText}>Ajouter mon premier enfant</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ── Modal — validation helpers ────────────────────────────────────────────

  const canSubmit = addSexe && (addNewborn || (addPrenom.trim() && addNom.trim() && addDate.trim()));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />
        <Text style={styles.headerSub}>Votre famille</Text>
        <Text style={styles.headerTitle}>Mes enfants</Text>
        <View style={styles.headerBottom}>
          <View style={styles.countPill}>
            <Ionicons name="people" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.countText}>{enfants.length} enfant{enfants.length !== 1 ? 's' : ''}</Text>
          </View>
          {enfants.some((e) => (e.vaccins_retard ?? 0) > 0) && (
            <View style={styles.alertPill}>
              <Ionicons name="alert-circle" size={13} color={Colors.danger} />
              <Text style={styles.alertPillText}>Vaccins en retard</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* List */}
      <FlatList
        data={enfants}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, !enfants.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />

      {/* FAB */}
      {enfants.length > 0 && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.88} onPress={openModal}>
          <LinearGradient colors={Gradients.brand} style={styles.fabGradient}>
            <Ionicons name="add" size={28} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Ajouter un enfant</Text>
                  <Text style={styles.modalSub}>Enregistrement dans le carnet vaccinal</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Newborn toggle */}
                <TouchableOpacity
                  style={[styles.newbornToggle, addNewborn && styles.newbornToggleActive]}
                  onPress={() => { setAddNewborn(!addNewborn); setAddError(''); }}
                  activeOpacity={0.8}
                >
                  <View style={styles.newbornLeft}>
                    <Text style={styles.newbornEmoji}>👶</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.newbornLabel, addNewborn && { color: Colors.primary }]}>
                        Mon bébé vient de naître
                      </Text>
                      <Text style={styles.newbornSub}>Moins de 48h — pas encore de prénom officiel</Text>
                    </View>
                  </View>
                  <Switch
                    value={addNewborn}
                    onValueChange={(v) => { setAddNewborn(v); setAddError(''); }}
                    trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                    thumbColor={addNewborn ? Colors.primary : Colors.textLight}
                  />
                </TouchableOpacity>

                {addNewborn && (
                  <View style={styles.newbornNote}>
                    <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
                    <Text style={styles.newbornNoteText}>
                      La date d'aujourd'hui sera enregistrée. Vous pourrez compléter le profil depuis la fiche de l'enfant.
                    </Text>
                  </View>
                )}

                {/* Error */}
                {!!addError && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                    <Text style={styles.errorText}>{addError}</Text>
                  </View>
                )}

                {/* Prénom */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    {addNewborn ? 'Prénom (facultatif)' : 'Prénom *'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={addNewborn ? 'Si déjà connu' : 'Prénom de l\'enfant'}
                    placeholderTextColor={Colors.textLight}
                    value={addPrenom}
                    onChangeText={(v) => { setAddPrenom(v); setAddError(''); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                {/* Nom — toujours visible */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    {addNewborn ? 'Nom de famille (facultatif)' : 'Nom de famille *'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={addNewborn ? 'Si déjà connu' : 'Nom de famille'}
                    placeholderTextColor={Colors.textLight}
                    value={addNom}
                    onChangeText={(v) => { setAddNom(v); setAddError(''); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                {/* Date — seulement si pas nouveau-né */}
                {!addNewborn && (
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Date de naissance *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="JJ/MM/AAAA"
                      placeholderTextColor={Colors.textLight}
                      value={addDate}
                      onChangeText={handleDateChange}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                )}

                {/* Sexe */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Sexe *</Text>
                  <View style={styles.sexeRow}>
                    {[
                      { key: 'M', label: '♂  Garçon', color: Colors.primary },
                      { key: 'F', label: '♀  Fille',  color: Colors.danger  },
                    ].map(({ key, label, color }) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.sexeChip, addSexe === key && { backgroundColor: color + '18', borderColor: color }]}
                        onPress={() => { setAddSexe(key); setAddError(''); }}
                      >
                        <Text style={[styles.sexeChipText, addSexe === key && { color, fontWeight: '800' }]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.confirmBtn, (!canSubmit || adding) && { opacity: 0.5 }]}
                  onPress={handleAddEnfant}
                  disabled={!canSubmit || adding}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={Gradients.brand} style={styles.confirmGrad}>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header:      { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['2xl'], position: 'relative', overflow: 'hidden' },
  decCircle1:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.glass, top: -70, right: -50 },
  decCircle2:  { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.glass, bottom: -30, left: -20 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: Spacing.md },
  headerBottom:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  countPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.pill, paddingHorizontal: Spacing.base, paddingVertical: 5 },
  countText:   { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.90)' },
  alertPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.dangerBg, borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  alertPillText:{ fontSize: 11, fontWeight: '700', color: Colors.danger },

  // List
  list: { padding: Spacing.lg, gap: Spacing.md },

  // Card
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card, gap: Spacing.md },
  avatar:     { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 20, fontWeight: '800', color: Colors.white },

  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 5, flexWrap: 'nowrap' },
  enfantName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },

  badgeSexe:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badgeSexeText: { fontSize: 14 },

  badgeNewborn:     { backgroundColor: Colors.warningBg, borderRadius: Radii.pill, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeNewbornText: { fontSize: 10, fontWeight: '700', color: Colors.accent },

  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  metaText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  metaDot:  { fontSize: 12, color: Colors.textLight },

  retardBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.dangerBg, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 5 },
  retardText:  { fontSize: 11, fontWeight: '700', color: Colors.danger },

  completeHint:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  completeHintText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Empty state
  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['3xl'] },
  emptyIconWrap:{ marginBottom: Spacing.xl },
  emptyIconGrad:{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:    { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xl },
  emptyCta:     { borderRadius: Radii.xl, overflow: 'hidden', width: '100%' },
  emptyCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  emptyCtaText: { fontSize: 16, fontWeight: '800', color: Colors.white },

  // FAB
  fab:         { position: 'absolute', bottom: 28, right: 24, borderRadius: 32, overflow: 'hidden', ...Elevation.xl },
  fabGradient: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], maxHeight: '92%' },
  modalHandle:   { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.sm },
  modalTitle:    { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  modalSub:      { fontSize: 12, color: Colors.textSecondary },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  // Newborn
  newbornToggle:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderRadius: Radii['2xl'], borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.md },
  newbornToggleActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  newbornLeft:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  newbornEmoji:        { fontSize: 26 },
  newbornLabel:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  newbornSub:          { fontSize: 11, color: Colors.textSecondary, marginTop: 3, lineHeight: 16 },
  newbornNote:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryTint, borderRadius: Radii.xl, padding: Spacing.md, marginBottom: Spacing.md },
  newbornNoteText:     { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },

  // Error
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerBg, borderRadius: Radii.xl, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { flex: 1, fontSize: 13, color: Colors.danger, fontWeight: '600' },

  // Fields
  fieldWrap:  { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 7 },
  textInput:  { backgroundColor: Colors.background, borderRadius: Radii.xl, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: 13, fontSize: 15, color: Colors.text },

  // Sexe
  sexeRow:      { flexDirection: 'row', gap: Spacing.md },
  sexeChip:     { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: Radii.xl, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  sexeChipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  // Submit
  confirmBtn:     { marginTop: Spacing.lg, borderRadius: Radii.xl, overflow: 'hidden', marginBottom: Spacing.sm },
  confirmGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 16 },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
});
