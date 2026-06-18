import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { enfantService } from '../../services';

const MOCK_ENFANTS = [
  { id: '1', nom: 'Badioui', prenom: 'Salma',  date_naissance: '25/08/2021', sexe: 'F', vaccins_faits: 7, vaccins_total: 9 },
  { id: '2', nom: 'Badioui', prenom: 'Asmae',  date_naissance: '12/05/2023', sexe: 'F', vaccins_faits: 4, vaccins_total: 6 },
];

const AVATAR_GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#06B6D4'],
  ['#3B82F6', '#6366F1'],
];

function getAge(dob) {
  if (!dob) return '';
  const [d, m, y] = dob.split('/');
  const birth  = new Date(`${y}-${m}-${d}`);
  const now    = new Date();
  const years  = now.getFullYear() - birth.getFullYear();
  const months = (now.getFullYear() * 12 + now.getMonth()) - (birth.getFullYear() * 12 + birth.getMonth());
  if (years >= 1) return `${years} an${years > 1 ? 's' : ''}`;
  return `${months} mois`;
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
  const [enfants, setEnfants]       = useState(MOCK_ENFANTS);
  const [refreshing, setRefreshing] = useState(false);

  const loadEnfants = useCallback(async () => {
    try {
      const data = await enfantService.listEnfants();
      if (data?.length) setEnfants(data);
    } catch (e) {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEnfants();
    setRefreshing(false);
  }, [loadEnfants]);

  React.useEffect(() => { loadEnfants(); }, [loadEnfants]);

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
          <Text style={styles.enfantAge}>{getAge(item.date_naissance)}  ·  {item.date_naissance}</Text>
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
        keyExtractor={(item) => item.id}
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
        onPress={() => Alert.alert('Ajouter un enfant', 'Cette fonctionnalité sera disponible prochainement.')}
      >
        <LinearGradient colors={Gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
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
});
