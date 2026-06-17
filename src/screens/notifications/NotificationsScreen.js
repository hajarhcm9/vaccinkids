import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { notificationService } from '../../services';

const MOCK_NOTIFS = [
  { id: '1', type: 'RAPPEL',        titre: 'Rappel : RDV demain',     message: 'N\'oubliez pas votre rendez-vous pour le vaccin DTP de Léa demain à 09h30.', date: 'Il y a 2 heures', lu: false },
  { id: '2', type: 'RETARD',        titre: 'Vaccin en retard',         message: 'Le vaccin Rougeole 1 de Lucas est en retard. Veuillez prendre rendez-vous rapidement.', date: 'Hier',            lu: false },
  { id: '3', type: 'CONFIRMATION',  titre: 'RDV confirmé',             message: 'Votre rendez-vous pour le BCG a bien été enregistré au centre.',                  date: 'Il y a 3 jours',  lu: true  },
  { id: '4', type: 'ABSENCE',       titre: 'Absence détectée',         message: 'Vous n\'êtes pas venu au RDV d\'hier. Cliquez ici pour reprogrammer une date.',   date: 'Il y a 5 jours',  lu: true  },
];

const FILTERS = [
  { key: 'TOUS',          label: 'Tous',          icon: 'apps-outline' },
  { key: 'RAPPEL',        label: 'Rappels',       icon: 'time-outline' },
  { key: 'RETARD',        label: 'Retards',       icon: 'alert-circle-outline' },
  { key: 'CONFIRMATION',  label: 'Confirmations', icon: 'checkmark-circle-outline' },
  { key: 'ABSENCE',       label: 'Absences',      icon: 'close-circle-outline' },
];

function typeMeta(type) {
  switch (type) {
    case 'RAPPEL':       return { color: Colors.warning, icon: 'time-outline' };
    case 'RETARD':       return { color: Colors.danger,  icon: 'alert-circle-outline' };
    case 'CONFIRMATION': return { color: Colors.success, icon: 'checkmark-circle-outline' };
    case 'ABSENCE':      return { color: Colors.primary, icon: 'close-circle-outline' };
    default:             return { color: Colors.textSecondary, icon: 'notifications-outline' };
  }
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFS);
  const [filter, setFilter] = useState('TOUS');
  const [loading, setLoading] = useState(false);

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.listNotifications(filter === 'TOUS' ? undefined : filter);
      if (Array.isArray(data)) setNotifications(data);
    } catch (e) {} finally { setLoading(false); }
  }, [filter]);
  React.useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const filtered = filter === 'TOUS' ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.lu).length;

  const markAllAsRead = async () => {
    setNotifications(notifications.map((n) => ({ ...n, lu: true })));
    try { await notificationService.markAllAsRead(); } catch (e) {}
  };

  const handleNotifPress = async (item) => {
    if (!item.lu) {
      setNotifications(notifications.map((n) => n.id === item.id ? { ...n, lu: true } : n));
      try { await notificationService.markAsRead(item.id); } catch (e) {}
    }
    if (item.type === 'ABSENCE') navigation?.navigate('RDV');
    else if (item.type === 'RAPPEL') navigation?.navigate('RDV');
  };

  const renderNotif = ({ item }) => {
    const t = typeMeta(item.type);
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.lu && styles.notifCardUnread]}
        onPress={() => handleNotifPress(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <View style={[styles.notifIcon, { backgroundColor: t.color + '15' }]}>
          <Ionicons name={t.icon} size={20} color={t.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.lu && styles.notifTitleUnread]}>{item.titre}</Text>
            {!item.lu && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifDate}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.headerSubtitle}>{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Ionicons name="checkmark-done-outline" size={14} color={Colors.primary} />
            <Text style={styles.markReadText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={f.icon} size={12} color={active ? Colors.surface : Colors.textSecondary} />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderNotif}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyMessage}>Vous êtes à jour ! Les nouveaux rappels apparaîtront ici.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface },
  headerTitle: { ...Typography.title },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  markReadText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  filtersRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: 7, borderRadius: Radii.pill, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, marginRight: Spacing.sm },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.surface, fontWeight: '700' },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.md, ...Elevation.sm },
  notifCardUnread: { backgroundColor: Colors.primaryTint, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary, flex: 1 },
  notifTitleUnread: { fontWeight: '700', color: Colors.text },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: Colors.primary, marginLeft: 8 },
  notifMessage: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  notifDate: { fontSize: 11, color: Colors.textLight },
  empty: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle: { ...Typography.subtitle, marginBottom: 8 },
  emptyMessage: { ...Typography.body, textAlign: 'center', maxWidth: 280 },
});