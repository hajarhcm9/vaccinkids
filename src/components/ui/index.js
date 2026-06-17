import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';

export function Card({ children, onPress, accent, paddingless = false, style, elevation = 'sm' }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      style={[
        styles.card,
        Elevation[elevation] || Elevation.sm,
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
        paddingless ? { padding: 0 } : null,
        style,
      ]}
    >
      {children}
    </Container>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Badge({ label, variant = 'neutral', icon }) {
  const palette = {
    success: { fg: Colors.success, bg: Colors.success + '20' },
    warning: { fg: Colors.warning, bg: Colors.warning + '25' },
    danger:  { fg: Colors.danger,  bg: Colors.danger + '20' },
    info:    { fg: Colors.info,    bg: Colors.info + '20' },
    primary: { fg: Colors.primary, bg: Colors.primary + '20' },
    neutral: { fg: Colors.textSecondary, bg: Colors.surfaceMuted },
  };
  const c = palette[variant] || palette.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={c.fg} style={{ marginRight: 4 }} />}
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'leaf-outline', title, message, cta }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={48} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {cta}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, marginVertical: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.lg },
  sectionTitle: { ...Typography.subtitle, marginBottom: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['4xl'], paddingHorizontal: Spacing.xl },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle: { ...Typography.subtitle, textAlign: 'center', marginBottom: 8 },
  emptyMessage: { ...Typography.body, textAlign: 'center', maxWidth: 280 },
});