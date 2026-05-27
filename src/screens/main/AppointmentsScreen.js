import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, SectionList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { sessionService, MOCK_SESSIONS } from '../../services/sessionService';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmé',     bg: colors.successLight, text: colors.success, icon: '✅' },
  waitlist:  { label: 'File attente', bg: colors.warningLight, text: colors.warning, icon: '⏳' },
  pending:   { label: 'En attente',   bg: colors.warningLight, text: colors.warning, icon: '🕐' },
  done:      { label: 'Effectué',     bg: colors.primaryLight, text: colors.primary, icon: '💉' },
  cancelled: { label: 'Annulé',       bg: colors.dangerLight,  text: colors.danger,  icon: '✕'  },
};

const AppointmentsScreen = ({ navigation }) => {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await sessionService.getMyBookings();
      setBookings(res.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const enriched = bookings.map((b) => {
    const session = MOCK_SESSIONS.find((s) => s.id === b.sessionId) || {};
    return { ...b, session };
  });

  const upcoming = enriched.filter((b) => b.status !== 'done' && b.status !== 'cancelled');
  const past = enriched.filter((b) => b.status === 'done' || b.status === 'cancelled');
  const sections = [
    { title: 'À venir', data: upcoming },
    { title: 'Historique', data: past },
  ].filter((s) => s.data.length > 0);

  const handleCancel = (booking) => {
    Alert.alert(
      'Annuler',
      `Annuler la réservation pour ${booking.babyName} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la réservation',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionService.cancelBooking(booking.id);
              loadData();
            } catch (err) {
              Alert.alert('Erreur', err.message);
            }
          },
        },
      ]
    );
  };

  const renderBooking = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const session = item.session || {};
    const dateStr = session.date
      ? new Date(session.date).toLocaleDateString('fr-FR', {
          weekday: 'short', day: 'numeric', month: 'long',
        })
      : '—';

    return (
      <TouchableOpacity
        style={[styles.card, item.status === 'cancelled' && styles.cardCancelled]}
        onPress={() => session.id && navigation.navigate('SessionDetail', { sessionId: session.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
          <Text style={styles.statusEmoji}>{cfg.icon}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardVaccine}>{session.vaccine || 'Vaccination'}</Text>
          <Text style={styles.cardDate}>{dateStr} · {session.time || '—'}</Text>
          <Text style={styles.cardBaby}>👶 {item.babyName}</Text>
          {item.status === 'confirmed' && (
            <Text style={styles.cardQueue}>Numéro de file : {item.queueNumber}</Text>
          )}
          {item.status === 'waitlist' && (
            <Text style={styles.cardQueue}>Position liste d'attente : {item.waitlistPosition}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
          {item.status === 'confirmed' && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.headerTitle}>Mes rendez-vous</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Sessions')}>
          <Text style={styles.addBtnText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
          <Text style={styles.emptySubtitle}>Réservez une session pour commencer le suivi vaccinal.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Sessions')}>
            <Text style={styles.emptyBtnText}>Voir les sessions disponibles</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={renderBooking}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl, paddingBottom: spacing.xl, paddingHorizontal: spacing.xl },
  headerTitle: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.white },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  addBtnText: { color: colors.white, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.sm, ...shadows.card },
  cardCancelled: { opacity: 0.55 },
  statusIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  statusEmoji: { fontSize: 18 },
  cardBody: { flex: 1, gap: 3 },
  cardVaccine: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: colors.textPrimary },
  cardDate: { fontSize: typography.fontSizes.xs, color: colors.textSecondary, textTransform: 'capitalize' },
  cardBaby: { fontSize: typography.fontSizes.xs, color: colors.textSecondary },
  cardQueue: { fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: typography.fontWeights.medium, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },
  badge: { borderRadius: borderRadius.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
  badgeText: { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.semibold },
  cancelBtn: { paddingVertical: 3, paddingHorizontal: spacing.sm },
  cancelBtnText: { fontSize: typography.fontSizes.xs, color: colors.danger, fontWeight: typography.fontWeights.medium, textDecorationLine: 'underline' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl, gap: spacing.md },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary },
  emptySubtitle: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: typography.fontSizes.sm * 1.6 },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.sm },
  emptyBtnText: { color: colors.white, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold },
});

export default AppointmentsScreen;