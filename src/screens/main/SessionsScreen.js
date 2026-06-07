import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { sessionService } from '../../services/sessionService';
import SessionCard from '../../components/SessionCard';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'open', label: 'Disponibles' },
  { key: 'full', label: 'Complètes' },
];

const SessionsScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [sessRes, bookRes] = await Promise.all([
        sessionService.getSessions(),
        sessionService.getMyBookings(),
      ]);
      setSessions(sessRes.sessions);
      setBookings(bookRes.bookings);
      applyFilters(sessRes.sessions, filter, search);
    } catch (err) {
      setError(err.message || 'Sessions indisponibles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyFilters = (data, f, s) => {
    let result = [...data];
    if (f !== 'all') result = result.filter((sess) => sess.status === f);
    if (s.trim()) {
      const q = s.toLowerCase();
      result = result.filter(
        (sess) =>
          sess.vaccine.toLowerCase().includes(q) || sess.centerName.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  };

  useEffect(() => {
    applyFilters(sessions, filter, search);
  }, [filter, search, sessions]);

  const isBooked = (sessionId) =>
    bookings.some(
      (b) => b.sessionId === sessionId && ['confirmed', 'pending', 'waitlist'].includes(b.status),
    );

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
        <Text style={styles.headerTitle}>Sessions de vaccination</Text>
        <Text style={styles.headerSub}>{filtered.length} session(s) trouvée(s)</Text>
      </View>
      {!!error && <Text style={styles.errorBanner}>{error}</Text>}

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un vaccin, médecin..."
            placeholderTextColor={colors.textHint}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            booked={isBooked(item.id)}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Aucune session trouvée</Text>
            <Text style={styles.emptySubtitle}>Modifiez vos filtres ou réessayez plus tard.</Text>
          </View>
        }
      />
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
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  headerSub: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  searchRow: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textPrimary,
  },
  clearBtn: { fontSize: 14, color: colors.textHint, padding: spacing.xs },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    textAlign: 'center',
  },
});

export default SessionsScreen;
