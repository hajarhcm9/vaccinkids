import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { queueService } from '../../services/queueService';
import { sessionService } from '../../services/sessionService';

const QueueScreen = ({ navigation }) => {
  const [queue, setQueue] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [queueStatus, bookingResult] = await Promise.all([
        queueService.getStatus(),
        sessionService.getMyBookings(),
      ]);
      setQueue(queueStatus);
      setBookings(
        bookingResult.bookings.filter(
          (booking) => ['confirmed', 'pending'].includes(booking.status) && booking.raw?.centre_id,
        ),
      );
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const joinQueue = async (booking) => {
    setActionLoading(true);
    try {
      await queueService.join(booking);
      await loadData();
    } catch (joinError) {
      Alert.alert('File d’attente', joinError.message);
    } finally {
      setActionLoading(false);
    }
  };

  const leaveQueue = () => {
    Alert.alert('Quitter la file', 'Voulez-vous vraiment libérer votre place ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await queueService.leave(queue.entry.id);
            await loadData();
          } catch (leaveError) {
            Alert.alert('Erreur', leaveError.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const activeEntry = queue?.entry;
  const isBeingServed = activeEntry?.statut === 'EN_COURS';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>File d’attente</Text>
          <Text style={styles.headerSubtitle}>
            Actualisation automatique toutes les 15 secondes
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={[colors.primary]}
            />
          }
        >
          {queue?.isOffline && (
            <Text style={styles.offline}>Mode hors ligne · dernière position</Text>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {activeEntry ? (
            <View style={[styles.ticket, isBeingServed && styles.ticketActive]}>
              <Text style={styles.ticketLabel}>
                {isBeingServed ? 'C’est votre tour' : 'Votre numéro'}
              </Text>
              <Text style={styles.ticketNumber}>{activeEntry.numero_attente}</Text>
              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>
                    {isBeingServed ? 'Maintenant' : queue.position}
                  </Text>
                  <Text style={styles.metricLabel}>Position</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>
                    {isBeingServed ? '0 min' : `~${queue.waitTimeMinutes} min`}
                  </Text>
                  <Text style={styles.metricLabel}>Attente estimée</Text>
                </View>
              </View>
              {!queue.isOffline && (
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={leaveQueue}
                  disabled={actionLoading}
                >
                  <Text style={styles.leaveText}>Quitter la file</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>#</Text>
                <Text style={styles.emptyTitle}>Vous n’êtes pas dans la file</Text>
                <Text style={styles.emptyText}>
                  Rejoignez la file à votre arrivée au centre avec un rendez-vous actif.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Rendez-vous éligibles</Text>
              {bookings.length === 0 ? (
                <Text style={styles.noBookings}>Aucun rendez-vous actif disponible.</Text>
              ) : (
                bookings.map((booking) => (
                  <View key={booking.id} style={styles.booking}>
                    <View style={styles.bookingCopy}>
                      <Text style={styles.bookingTitle}>
                        {booking.session?.vaccine || 'Vaccination'}
                      </Text>
                      <Text style={styles.bookingMeta}>{booking.babyName}</Text>
                      <Text style={styles.bookingMeta}>{booking.session?.centerName}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => joinQueue(booking)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.joinText}>Rejoindre</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { color: colors.white, fontSize: 34, lineHeight: 36 },
  headerCopy: { flex: 1, marginLeft: spacing.sm },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: typography.fontSizes.xs },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  offline: {
    color: colors.warning,
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  ticket: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.card,
  },
  ticketActive: { borderColor: colors.success, backgroundColor: colors.successLight },
  ticketLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  ticketNumber: {
    color: colors.primary,
    fontSize: 72,
    fontWeight: typography.fontWeights.bold,
    marginVertical: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, backgroundColor: colors.border },
  metricValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  metricLabel: { color: colors.textSecondary, fontSize: typography.fontSizes.xs, marginTop: 2 },
  leaveButton: { marginTop: spacing.xl, padding: spacing.md },
  leaveText: { color: colors.danger, fontWeight: typography.fontWeights.semibold },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.card,
  },
  emptyIcon: {
    color: colors.primary,
    fontSize: 48,
    fontWeight: typography.fontWeights.bold,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  noBookings: { color: colors.textSecondary, textAlign: 'center', padding: spacing.xl },
  booking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  bookingCopy: { flex: 1 },
  bookingTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  bookingMeta: { color: colors.textSecondary, fontSize: typography.fontSizes.sm, marginTop: 2 },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  joinText: { color: colors.white, fontWeight: typography.fontWeights.semibold },
});

export default QueueScreen;
