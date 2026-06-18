import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { notificationService } from '../../services';

function formatNotifDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
         ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_META = {
  RAPPEL:       { icon: 'alarm',                    color: Colors.primary,  bg: Colors.primaryTint,  label: 'Rappel' },
  RETARD:       { icon: 'alert-circle',              color: Colors.danger,   bg: Colors.dangerBg,     label: 'Retard' },
  CONFIRMATION: { icon: 'checkmark-circle',          color: Colors.success,  bg: Colors.successBg,    label: 'Confirmé' },
  INFO:         { icon: 'information-circle',        color: Colors.info,     bg: Colors.infoBg,       label: 'Info' },
  ALERTE:       { icon: 'warning',                   color: Colors.accent,   bg: Colors.accentLight,  label: 'Alerte' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [refreshing,    setRefreshing]    = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.listNotifications();
      if (data) setNotifications(data);
    } catch (e) {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  React.useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const insets      = useSafeAreaInsets();
  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    notificationService.markAllAsRead().catch(() => {});
  };
  const unreadCount = notifications.filter((n) => !n.lu).length;

  const renderItem = ({ item }) => {
    const m = TYPE_META[item.type] || TYPE_META.INFO;
    return (
      <TouchableOpacity
        style={[styles.card, !item.lu && styles.cardUnread]}
        activeOpacity={0.82}
        onPress={() => {
          setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, lu: true } : n));
          if (!item.lu) notificationService.markAsRead(item.id).catch(() => {});
        }}
      >
        {!item.lu && <View style={styles.unreadDot} />}
        <View style={[styles.iconWrap, { backgroundColor: m.bg }]}>
          <Ionicons name={m.icon} size={20} color={m.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, !item.lu && styles.cardTitleUnread]}>{item.titre}</Text>
            <View style={[styles.typeBadge, { backgroundColor: m.bg }]}>
              <Text style={[styles.typeBadgeText, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.cardDate}>{formatNotifDate(item.date_envoi || item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}><Text style={{ fontSize: 40 }}>🔔</Text></View>
      <Text style={styles.emptyTitle}>Aucune notification</Text>
      <Text style={styles.emptyBody}>Vos alertes et rappels apparaîtront ici.</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.decCircle} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSub}>Centre d'alertes</Text>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markReadBtn} onPress={markAllRead}>
              <Ionicons name="checkmark-done-outline" size={15} color="rgba(255,255,255,0.85)" />
              <Text style={styles.markReadText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadPill}>
            <View style={styles.unreadDotSmall} />
            <Text style={styles.unreadPillText}>{unreadCount} non lu{unreadCount > 1 ? 'es' : 'e'}</Text>
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, !notifications.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:       { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, position: 'relative', overflow: 'hidden' },
  decCircle:    { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.glass, top: -60, right: -40 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.md },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  headerTitle:  { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  markReadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: Radii.pill },
  markReadText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  unreadPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: Colors.dangerBg + 'DD', borderRadius: Radii.pill, paddingHorizontal: Spacing.base, paddingVertical: 5 },
  unreadDotSmall:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.danger },
  unreadPillText:  { fontSize: 12, fontWeight: '700', color: Colors.danger },

  list:         { padding: Spacing.lg, gap: Spacing.sm },

  card:         { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.base, ...Elevation.sm, gap: Spacing.md, position: 'relative' },
  cardUnread:   { borderLeftWidth: 3, borderLeftColor: Colors.primary, backgroundColor: Colors.primaryTint + '40' },
  unreadDot:    { position: 'absolute', top: 14, left: -1, width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.background },

  iconWrap:     { width: 42, height: 42, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent:  { flex: 1, gap: 4 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'space-between' },
  cardTitle:    { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  cardTitleUnread:{ fontWeight: '800', color: Colors.text },
  typeBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radii.pill },
  typeBadgeText:{ fontSize: 10, fontWeight: '700' },
  cardMessage:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardDate:     { fontSize: 11, color: Colors.textLight },

  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['3xl'], paddingHorizontal: Spacing['2xl'] },
  emptyIcon:    { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  emptyTitle:   { fontSize: 19, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:    { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
