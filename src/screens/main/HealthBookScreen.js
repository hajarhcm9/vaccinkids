import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { babyService } from '../../services/babyService';
import { healthBookService } from '../../services/healthBookService';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date indisponible';

const HealthBookScreen = ({ route }) => {
  const requestedBabyId = route?.params?.babyId;
  const [babies, setBabies] = useState([]);
  const [selectedBabyId, setSelectedBabyId] = useState(requestedBabyId || null);
  const [record, setRecord] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const selectedBaby = babies.find((baby) => String(baby.id) === String(selectedBabyId));

  const loadBabies = useCallback(async () => {
    const result = await babyService.getBabies();
    setBabies(result);
    setSelectedBabyId((current) => current || requestedBabyId || result[0]?.id || null);
  }, [requestedBabyId]);

  const loadRecord = useCallback(async (babyId) => {
    if (!babyId) {
      setRecord(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError('');
      const result = await healthBookService.getComplete(babyId);
      setRecord(result.record);
      setLastSynced(result.lastSynced);
      setIsOffline(result.isOffline);
    } catch (loadError) {
      setError(loadError.message);
      setRecord(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBabies().catch((loadError) => {
      setError(loadError.message);
      setLoading(false);
    });
  }, [loadBabies]);

  useEffect(() => {
    if (requestedBabyId) setSelectedBabyId(requestedBabyId);
  }, [requestedBabyId]);

  useEffect(() => {
    loadRecord(selectedBabyId);
  }, [loadRecord, selectedBabyId]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadBabies(), loadRecord(selectedBabyId)]).catch(() => setRefreshing(false));
  };

  const growth = record?.croissance || [];
  const maxWeight = useMemo(
    () => Math.max(...growth.map((measurement) => Number(measurement.poids) || 0), 1),
    [growth],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carnet de santé</Text>
        <View style={[styles.syncBadge, isOffline && styles.syncBadgeOffline]}>
          <Text style={styles.syncBadgeText}>{isOffline ? 'Hors ligne' : 'Synchronisé'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.babySelector}>
          {babies.map((baby) => {
            const active = String(baby.id) === String(selectedBabyId);
            return (
              <TouchableOpacity
                key={baby.id}
                style={[styles.babySelectorItem, active && styles.babySelectorActive]}
                onPress={() => setSelectedBabyId(baby.id)}
              >
                <Text style={styles.babySelectorEmoji}>
                  {baby.gender === 'female' ? '👧' : '👦'}
                </Text>
                <Text style={[styles.babySelectorName, active && styles.babySelectorNameActive]}>
                  {baby.firstName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {babies.length === 0 && (
          <EmptyState title="Aucun enfant" text="Ajoutez un enfant pour consulter son carnet." />
        )}

        {error && <EmptyState title="Carnet indisponible" text={error} />}

        {record && (
          <>
            <Text style={styles.babyTitle}>
              {selectedBaby?.firstName} {selectedBaby?.lastName}
            </Text>
            <Text style={styles.babySubtitle}>
              Né(e) le {formatDate(record.bebe.date_naissance)}
            </Text>

            <View style={styles.statsRow}>
              <Stat
                label="Vaccins reçus"
                value={record.stats.vaccines_done}
                color={colors.success}
              />
              <Stat
                label="En retard"
                value={record.stats.vaccines_delayed}
                color={record.stats.vaccines_delayed > 0 ? colors.danger : colors.success}
              />
              <Stat label="Mesures" value={growth.length} color={colors.primary} />
            </View>

            {record.delayed_vaccines.length > 0 && (
              <Section title="Vaccins en retard">
                {record.delayed_vaccines.map((vaccine) => (
                  <RecordRow
                    key={`${vaccine.vaccin_nom}-${vaccine.age_cible_semaines}`}
                    icon="!"
                    title={vaccine.vaccin_nom}
                    detail={`Recommandé à ${vaccine.age_cible_semaines} semaines`}
                    tone="danger"
                  />
                ))}
              </Section>
            )}

            <Section title="Historique vaccinal">
              {record.vaccinations.length > 0 ? (
                record.vaccinations.map((vaccination) => (
                  <RecordRow
                    key={vaccination.id}
                    icon="✓"
                    title={vaccination.vaccin_nom}
                    detail={`${formatDate(vaccination.date_heure)} · Lot ${vaccination.numero_lot || 'N/A'}`}
                    tone="success"
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Aucune vaccination enregistrée.</Text>
              )}
            </Section>

            <Section title="Courbe de poids">
              {growth.length > 0 ? (
                <View style={styles.chart}>
                  {growth.slice(-8).map((measurement) => {
                    const height = Math.max(18, (Number(measurement.poids) / maxWeight) * 100);
                    return (
                      <View key={measurement.id} style={styles.chartColumn}>
                        <Text style={styles.chartValue}>{measurement.poids} kg</Text>
                        <View style={[styles.chartBar, { height }]} />
                        <Text style={styles.chartDate}>{formatDate(measurement.date_mesure)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>Aucune mesure de croissance enregistrée.</Text>
              )}
            </Section>

            <Section title="Rendez-vous à venir">
              {record.upcoming_appointments.length > 0 ? (
                record.upcoming_appointments.map((appointment) => (
                  <RecordRow
                    key={appointment.id}
                    icon="•"
                    title={appointment.vaccin_nom}
                    detail={`${formatDate(appointment.date_session)} · ${appointment.heure_debut}`}
                    tone="primary"
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Aucun rendez-vous à venir.</Text>
              )}
            </Section>

            <Text style={styles.syncText}>
              Dernière synchronisation : {lastSynced ? formatDate(lastSynced) : 'inconnue'}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Stat = ({ label, value, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const RecordRow = ({ icon, title, detail, tone }) => {
  const toneColor = {
    danger: colors.danger,
    success: colors.success,
    primary: colors.primary,
  }[tone];
  return (
    <View style={styles.recordRow}>
      <View style={[styles.recordIcon, { backgroundColor: `${toneColor}18` }]}>
        <Text style={[styles.recordIconText, { color: toneColor }]}>{icon}</Text>
      </View>
      <View style={styles.recordBody}>
        <Text style={styles.recordTitle}>{title || 'Vaccination'}</Text>
        <Text style={styles.recordDetail}>{detail}</Text>
      </View>
    </View>
  );
};

const EmptyState = ({ title, text }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  syncBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  syncBadgeOffline: { backgroundColor: colors.warning },
  syncBadgeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  babySelector: { flexGrow: 0, marginBottom: spacing.xs },
  babySelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  babySelectorActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  babySelectorEmoji: { fontSize: 18 },
  babySelectorName: { color: colors.textSecondary, fontSize: typography.fontSizes.sm },
  babySelectorNameActive: { color: colors.primary, fontWeight: typography.fontWeights.semibold },
  babyTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  babySubtitle: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    minHeight: 82,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  statValue: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold },
  statLabel: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconText: { fontWeight: typography.fontWeights.bold },
  recordBody: { flex: 1 },
  recordTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  recordDetail: { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 },
  chart: {
    height: 152,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: spacing.xs,
  },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: {
    width: '60%',
    maxWidth: 28,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  chartValue: { color: colors.primary, fontSize: 9, fontWeight: typography.fontWeights.semibold },
  chartDate: { color: colors.textHint, fontSize: 8, textAlign: 'center' },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  syncText: { color: colors.textHint, fontSize: typography.fontSizes.xs, textAlign: 'center' },
});

export default HealthBookScreen;
