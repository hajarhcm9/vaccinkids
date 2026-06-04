import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FillBar from './FillBar';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

const SessionCard = ({ session, onPress, booked = false }) => {
  const isFull = session.bookedSlots >= session.totalSlots;

  return (
    <TouchableOpacity
      style={[styles.card, isFull && styles.cardFull]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {booked && (
        <View style={styles.bookedBadge}>
          <Text style={styles.bookedBadgeText}>✓ Réservé</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{new Date(session.date).getDate()}</Text>
          <Text style={styles.dateMonth}>
            {new Date(session.date).toLocaleDateString('fr-FR', { month: 'short' })}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.vaccine}>{session.vaccine}</Text>
          <Text style={styles.time}>🕐 {session.time}</Text>
          <Text style={styles.doctor}>📍 {session.centerName}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <FillBar booked={session.bookedSlots} total={session.totalSlots} showLabel size="md" />

      <View style={styles.footer}>
        <Text style={styles.center}>
          {session.centerAddress || 'Adresse du centre indisponible'}
        </Text>
        <View style={[styles.actionBtn, isFull && styles.actionBtnFull]}>
          <Text style={[styles.actionBtnText, isFull && styles.actionBtnTextFull]}>
            {booked ? 'Voir détail' : isFull ? "Liste d'attente" : 'Réserver'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardFull: {
    opacity: 0.85,
    borderColor: colors.danger + '40',
  },
  bookedBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  bookedBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.success,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dateBox: {
    width: 48,
    height: 52,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    lineHeight: typography.fontSizes.xl,
  },
  dateMonth: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    textTransform: 'uppercase',
    fontWeight: typography.fontWeights.medium,
  },
  headerInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  vaccine: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  time: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  doctor: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  center: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  actionBtnFull: {
    backgroundColor: colors.warningLight,
  },
  actionBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },
  actionBtnTextFull: {
    color: colors.warning,
  },
});

export default SessionCard;
