import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { sessionService } from '../../services/sessionService';
import { babyService } from '../../services/babyService';
import FillBar from '../../components/FillBar';

const POLL_INTERVAL = 10000;

const SessionDetailScreen = ({ route, navigation }) => {
  const { sessionId } = route.params;

  const [session, setSession] = useState(null);
  const [booking, setBooking] = useState(null);
  const [fillData, setFillData] = useState(null);
  const [babies, setBabies] = useState([]);
  const [selectedBaby, setSelectedBaby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const pollRef = useRef(null);

  const loadSession = useCallback(async () => {
    try {
      const [sessRes, bookRes, babiesRes] = await Promise.all([
        sessionService.getSessionById(sessionId),
        sessionService.getMyBookings(),
        babyService.getBabies(),
      ]);
      setSession(sessRes.session);
      setBabies(babiesRes);
      setSelectedBaby((current) => current || babiesRes[0] || null);
      setFillData({
        bookedSlots: sessRes.session.bookedSlots,
        totalSlots: sessRes.session.totalSlots,
      });
      const existing = bookRes.bookings.find(
        (b) => b.sessionId === sessionId && b.status !== 'cancelled',
      );
      setBooking(existing || null);
    } catch (err) {
      Alert.alert('Erreur', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await sessionService.pollSessionFill(sessionId);
        if (data) setFillData(data);
      } catch {
        // Polling failures are retried on the next interval.
      }
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [sessionId]);

  const handleBook = async () => {
    if (!selectedBaby) {
      Alert.alert('Aucun enfant', 'Ajoutez un enfant avant de réserver une session.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await sessionService.bookSession(sessionId, selectedBaby.id);
      setBooking(res.booking);
      setFillData((prev) => ({ ...prev, bookedSlots: prev.bookedSlots + 1 }));
      Alert.alert(
        '✅ Réservation confirmée !',
        `Place réservée pour ${selectedBaby.firstName} ${selectedBaby.lastName}.`,
      );
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaitlist = async () => {
    if (!selectedBaby) {
      Alert.alert('Aucun enfant', "Ajoutez un enfant avant de rejoindre la liste d'attente.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await sessionService.joinWaitlist(sessionId, selectedBaby.id);
      setBooking(res.booking);
      Alert.alert(
        "⏳ Liste d'attente",
        `${selectedBaby.firstName} ${selectedBaby.lastName} a été ajouté à la liste d'attente.`,
      );
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Annuler la réservation', 'Êtes-vous sûr de vouloir annuler ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await sessionService.cancelBooking(booking.id);
            const occupiedPlace = booking.status !== 'waitlist';
            setBooking(null);
            if (occupiedPlace) {
              setFillData((prev) => ({
                ...prev,
                bookedSlots: Math.max(0, prev.bookedSlots - 1),
              }));
            }
            Alert.alert('Réservation annulée', 'Votre place a été libérée.');
          } catch (err) {
            Alert.alert('Erreur', err.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleOpenDirections = async () => {
    const hasCoordinates = session.centerLatitude && session.centerLongitude;
    const destination = hasCoordinates
      ? `${session.centerLatitude},${session.centerLongitude}`
      : encodeURIComponent(`${session.centerName}, ${session.centerAddress}`);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${destination}`
        : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Itinéraire indisponible', "Impossible d'ouvrir l'application de cartes.");
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  if (loading || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isFull = fillData
    ? fillData.bookedSlots >= fillData.totalSlots
    : session.bookedSlots >= session.totalSlots;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la session</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {booking && (
          <View
            style={[
              styles.bookingBanner,
              booking.status === 'waitlist' ? styles.bookingBannerWait : styles.bookingBannerOk,
            ]}
          >
            <Text style={styles.bookingBannerIcon}>
              {booking.status === 'waitlist' ? '⏳' : '✅'}
            </Text>
            <View>
              <Text style={styles.bookingBannerTitle}>
                {booking.status === 'waitlist'
                  ? `Liste d'attente — Position ${booking.waitlistPosition}`
                  : booking.status === 'pending'
                    ? 'Réservation en attente de confirmation'
                    : booking.queueNumber
                      ? `Réservé — Numéro ${booking.queueNumber}`
                      : 'Réservation confirmée'}
              </Text>
              <Text style={styles.bookingBannerSub}>{booking.babyName}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.vaccineTitle}>{session.vaccine}</Text>
          {[
            { icon: '📅', label: 'Date', value: formatDate(session.date) },
            { icon: '🕐', label: 'Heure', value: session.time },
            { icon: '📍', label: 'Centre', value: session.centerName },
            { icon: '🏠', label: 'Adresse', value: session.centerAddress },
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={styles.infoIcon}>{row.icon}</Text>
              <View>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.directionsBtn} onPress={handleOpenDirections}>
            <Text style={styles.directionsIcon}>↗</Text>
            <Text style={styles.directionsText}>Itinéraire vers le centre</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.fillHeader}>
            <Text style={styles.cardTitle}>Remplissage en temps réel</Text>
            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <FillBar
            booked={fillData?.bookedSlots ?? session.bookedSlots}
            total={fillData?.totalSlots ?? session.totalSlots}
            showLabel
            size="lg"
            animated
          />
        </View>

        {!booking && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pour quel enfant ?</Text>
            {babies.map((baby) => (
              <TouchableOpacity
                key={baby.id}
                style={[styles.babyOption, selectedBaby?.id === baby.id && styles.babyOptionActive]}
                onPress={() => setSelectedBaby(baby)}
              >
                <Text style={styles.babyOptionEmoji}>👶</Text>
                <Text
                  style={[
                    styles.babyOptionName,
                    selectedBaby?.id === baby.id && styles.babyOptionNameActive,
                  ]}
                >
                  {baby.firstName} {baby.lastName}
                </Text>
                {selectedBaby?.id === baby.id && <Text style={styles.babyOptionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            {babies.length === 0 && (
              <Text style={styles.emptyBabyText}>
                Ajoutez un enfant depuis l'accueil avant de réserver.
              </Text>
            )}
          </View>
        )}

        <View style={styles.actionsCard}>
          {!booking ? (
            !isFull ? (
              <TouchableOpacity
                style={[styles.btnPrimary, actionLoading && styles.btnDisabled]}
                onPress={handleBook}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.btnPrimaryText}>✅ Réserver cette session</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnWaitlist, actionLoading && styles.btnDisabled]}
                onPress={handleWaitlist}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.warning} />
                ) : (
                  <Text style={styles.btnWaitlistText}>⏳ Rejoindre la liste d'attente</Text>
                )}
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.btnCancel, actionLoading && styles.btnDisabled]}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text style={styles.btnCancelText}>✕ Annuler la réservation</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backBtn: { width: 80 },
  backText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  bookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
  },
  bookingBannerOk: { backgroundColor: colors.successLight, borderLeftColor: colors.success },
  bookingBannerWait: { backgroundColor: colors.warningLight, borderLeftColor: colors.warning },
  bookingBannerIcon: { fontSize: 24 },
  bookingBannerTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  bookingBannerSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
    gap: spacing.md,
  },
  vaccineTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoIcon: { fontSize: 18, width: 24, textAlign: 'center', marginTop: 1 },
  infoLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textHint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: typography.fontWeights.medium,
  },
  infoValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'capitalize',
    marginTop: 1,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    marginTop: spacing.xs,
  },
  directionsIcon: {
    color: colors.primary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  directionsText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  fillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  liveText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.success,
    letterSpacing: 0.5,
  },
  babyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  babyOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  babyOptionEmoji: { fontSize: 20 },
  babyOptionName: { flex: 1, fontSize: typography.fontSizes.md, color: colors.textSecondary },
  babyOptionNameActive: { color: colors.primary, fontWeight: typography.fontWeights.semibold },
  babyOptionCheck: { fontSize: 16, color: colors.primary, fontWeight: typography.fontWeights.bold },
  emptyBabyText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
    gap: spacing.sm,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  btnWaitlist: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  btnWaitlistText: {
    color: colors.warning,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  btnCancel: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  btnCancelText: {
    color: colors.danger,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  btnDisabled: { opacity: 0.5 },
});

export default SessionDetailScreen;
