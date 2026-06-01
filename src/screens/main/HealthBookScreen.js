import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

const MOCK_VACCINES = [
  { id: '1', name: 'BCG', date: '10 Mar 2024', status: 'done', doseNum: '1/1' },
  { id: '2', name: 'Pentavalent', date: '10 Avr 2024', status: 'done', doseNum: '1/3' },
  { id: '3', name: 'Pentavalent', date: '10 Mai 2024', status: 'done', doseNum: '2/3' },
  { id: '4', name: 'Pentavalent', date: '28 Avr 2025', status: 'upcoming', doseNum: '3/3' },
  { id: '5', name: 'ROR', date: '15 Mai 2025', status: 'upcoming', doseNum: '1/2' },
  { id: '6', name: 'Hépatite B', date: '10 Sep 2025', status: 'planned', doseNum: '1/3' },
];

const STATUS_CONFIG = {
  done:     { label: 'Effectué',  color: colors.success, bg: colors.successLight, icon: '✓' },
  upcoming: { label: 'À venir',   color: colors.warning, bg: colors.warningLight, icon: '⏳' },
  late:     { label: 'En retard', color: colors.danger,  bg: colors.dangerLight,  icon: '!' },
  planned:  { label: 'Planifié',  color: colors.primary, bg: colors.primaryLight, icon: '○' },
};

const HealthBookScreen = () => {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carnet de santé</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Text style={styles.exportIcon}>📄</Text>
          <Text style={styles.exportText}>Exporter PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.babySelector}>
        <TouchableOpacity style={[styles.babySelectorItem, styles.babySelectorActive]}>
          <Text style={styles.babySelectorEmoji}>👦</Text>
          <Text style={styles.babySelectorNameActive}>Youssef</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.babySelectorItem}>
          <Text style={styles.babySelectorEmoji}>👧</Text>
          <Text style={styles.babySelectorName}>Nour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.legendRow}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.bg, borderColor: cfg.color }]} />
              <Text style={styles.legendLabel}>{cfg.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Calendrier vaccinal</Text>
        {MOCK_VACCINES.map((v) => {
          const cfg = STATUS_CONFIG[v.status];
          return (
            <View key={v.id} style={styles.vaccineRow}>
              <View style={[styles.vaccineStatus, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.vaccineStatusIcon, { color: cfg.color }]}>{cfg.icon}</Text>
              </View>
              <View style={styles.vaccineInfo}>
                <Text style={styles.vaccineName}>{v.name}</Text>
                <Text style={styles.vaccineDate}>{v.date}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.badgeText, { color: cfg.color }]}>{v.doseNum}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.offlineNote}>
          <Text style={styles.offlineIcon}>📶</Text>
          <Text style={styles.offlineText}>
            Le carnet est accessible hors-ligne. Dernière sync : aujourd'hui
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
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
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  exportIcon: { fontSize: 14 },
  exportText: {
    fontSize: typography.fontSizes.xs,
    color: colors.white,
    fontWeight: typography.fontWeights.medium,
  },
  babySelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  babySelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  babySelectorActive: { backgroundColor: colors.primaryLight },
  babySelectorEmoji: { fontSize: 18 },
  babySelectorName: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  babySelectorNameActive: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadows.card,
  },
  vaccineStatus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaccineStatusIcon: {
    fontSize: 16,
    fontWeight: typography.fontWeights.bold,
  },
  vaccineInfo: { flex: 1 },
  vaccineName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  vaccineDate: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  offlineNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  offlineIcon: { fontSize: 16 },
  offlineText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.primaryDark,
    lineHeight: typography.fontSizes.xs * 1.5,
  },
});

export default HealthBookScreen;