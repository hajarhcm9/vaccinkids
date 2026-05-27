import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { babyService } from '../../services/babyService';
import { sessionService } from '../../services/sessionService';
import FillBar from '../../components/FillBar';

const getAge = (birthDate) => {
  const bd = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth());
  if (months < 1) return '< 1 mois';
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  return `${years} an${years > 1 ? 's' : ''}`;
};

const HomeScreen = ({ navigation }) => {
  const [babies, setBabies] = useState([]);
  const [nextSession, setNextSession] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const alerts = [
    { id: '1', baby: 'Youssef', vaccine: 'BCG', daysLate: 3 },
  ];

  const loadData = useCallback(async () => {
    try {
      const [babiesRes, sessionsRes, bookingsRes] = await Promise.all([
        babyService.getBabies(),
        sessionService.getSessions(),
        sessionService.getMyBookings(),
      ]);
      setBabies(babiesRes);
      const openSessions = sessionsRes.sessions.filter((s) => s.status === 'open');
      setNextSession(openSessions[0] || null);
      setBookings(bookingsRes.bookings);
    } catch (err) {
      console.error('HomeScreen load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.subtitle}>Tableau de bord vaccination</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Text style={styles.notifIcon}>🔔</Text>
          {bookings.length > 0 && <View style={styles.notifDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {alerts.map((alert) => (
          <TouchableOpacity key={alert.id} style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>
              {alert.baby} — {alert.vaccine} en retard de {alert.daysLate} jours
            </Text>
            <Text style={styles.alertChevron}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Prochaine session</Text>
        {nextSession ? (
          <TouchableOpacity
            style={styles.rdvCard}
            onPress={() =>
              navigation.navigate('SessionDetail', { sessionId: nextSession.id })
            }
          >
            <View style={styles.rdvHeader}>
              <View>
                <Text style={styles.rdvVaccine}>{nextSession.vaccine}</Text>
                <Text style={styles.rdvDate}>
                  {new Date(nextSession.date).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })} · {nextSession.time}
                </Text>
              </View>
              <Text style={styles.rdvArrow}>›</Text>
            </View>
            <FillBar
              booked={nextSession.bookedSlots}
              total={nextSession.totalSlots}
              showLabel
              size="sm"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune session disponible pour le moment.</Text>
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Mes enfants</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddBaby')}>
            <Text style={styles.sectionLink}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {babies.length === 0 ? (
          <TouchableOpacity
            style={styles.addBabyCard}
            onPress={() => navigation.navigate('AddBaby')}
          >
            <Text style={styles.addBabyIcon}>👶</Text>
            <Text style={styles.addBabyText}>Ajouter votre premier enfant</Text>
          </TouchableOpacity>
        ) : (
          babies.map((baby) => (
            <TouchableOpacity
              key={baby.id}
              style={styles.babyCard}
              onPress={() => navigation.navigate('HealthBook')}
            >
              <View style={styles.babyAvatar}>
                <Text style={styles.babyAvatarEmoji}>
                  {baby.gender === 'male' ? '👦' : '👧'}
                </Text>
              </View>
              <View style={styles.babyInfo}>
                <Text style={styles.babyName}>{baby.firstName} {baby.lastName}</Text>
                <Text style={styles.babyAge}>{getAge(baby.birthDate)}</Text>
              </View>
              <Text style={styles.babyChevron}>›</Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.quickRow}>
          {[
            { icon: '📅', label: 'Sessions',    screen: 'Sessions' },
            { icon: '📋', label: 'Carnet',      screen: 'HealthBook' },
            { icon: '🗓️', label: 'Rendez-vous', screen: 'Appointments' },
            { icon: '👤', label: 'Profil',      screen: 'Profile' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickBtn}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.educBanner}>
          <Text style={styles.educIcon}>💡</Text>
          <View style={styles.educContent}>
            <Text style={styles.educTitle}>Le saviez-vous ?</Text>
            <Text style={styles.educText}>
              Les vaccins protègent votre enfant contre des maladies graves dès les premiers mois de vie.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background,
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
  greeting: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  notifIcon: { fontSize: 20 },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.danger,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dangerLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
    borderLeftWidth: 4, borderLeftColor: colors.danger,
  },
  alertIcon: { fontSize: 16 },
  alertText: {
    flex: 1, fontSize: typography.fontSizes.sm,
    color: colors.danger, fontWeight: typography.fontWeights.medium,
  },
  alertChevron: {
    fontSize: 20, color: colors.danger, fontWeight: typography.fontWeights.bold,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.sm,
  },
  sectionLink: {
    fontSize: typography.fontSizes.sm, color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  rdvCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.xl, ...shadows.card, gap: spacing.md,
  },
  rdvHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rdvVaccine: {
    fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  rdvDate: {
    fontSize: typography.fontSizes.sm, color: colors.textSecondary,
    marginTop: 2, textTransform: 'capitalize',
  },
  rdvArrow: {
    fontSize: 24, color: colors.primary, fontWeight: typography.fontWeights.bold,
  },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl, ...shadows.card,
  },
  emptyText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
  addBabyCard: {
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.primary,
    borderStyle: 'dashed', marginBottom: spacing.sm,
  },
  addBabyIcon: { fontSize: 32 },
  addBabyText: {
    fontSize: typography.fontSizes.sm, color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  babyCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginBottom: spacing.sm, ...shadows.card,
  },
  babyAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  babyAvatarEmoji: { fontSize: 24 },
  babyInfo: { flex: 1 },
  babyName: {
    fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  babyAge: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  babyChevron: {
    fontSize: 22, color: colors.textHint, fontWeight: typography.fontWeights.bold,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  quickBtn: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs, ...shadows.card,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: {
    fontSize: typography.fontSizes.xs, color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium, textAlign: 'center',
  },
  educBanner: {
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg, padding: spacing.lg, marginTop: spacing.sm,
  },
  educIcon: { fontSize: 22 },
  educContent: { flex: 1 },
  educTitle: {
    fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold,
    color: colors.primaryDark, marginBottom: spacing.xs,
  },
  educText: {
    fontSize: typography.fontSizes.sm, color: colors.primary,
    lineHeight: typography.fontSizes.sm * 1.5,
  },
});

export default HomeScreen;