import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { mobileNotificationService } from '../../services/mobileNotificationService';
import { notificationTarget } from '../../services/notificationNavigation';

const TYPE_CONFIG = {
  RAPPEL_RDV: { icon: '📅', color: colors.primary, background: colors.primaryLight },
  CONFIRMATION: { icon: '✓', color: colors.success, background: colors.successLight },
  RETARD_VACCIN: { icon: '!', color: colors.warning, background: colors.warningLight },
  ABSENCE: { icon: '!', color: colors.danger, background: colors.dangerLight },
  INFO: { icon: 'i', color: colors.primary, background: colors.primaryLight },
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const NotificationsScreen = ({ navigation, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      setError('');
      const result = await mobileNotificationService.getNotifications({ unreadOnly });
      setNotifications(result.notifications);
      const unreadCount = result.notifications.filter(
        (notification) => !notification.isRead,
      ).length;
      onUnreadCountChange?.(unreadCount);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadCountChange, unreadOnly]);

  useEffect(() => {
    setLoading(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notification) => {
    try {
      if (!notification.isRead) {
        await mobileNotificationService.markAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
        );
        onUnreadCountChange?.(Math.max(0, notifications.filter((item) => !item.isRead).length - 1));
      }
      const target = notificationTarget(notification);
      if (target) navigation.navigate(target.screen, target.params);
    } catch (markError) {
      setError(markError.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await mobileNotificationService.markAllAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      onUnreadCountChange?.(0);
    } catch (markError) {
      setError(markError.message);
    }
  };

  const renderNotification = ({ item }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO;
    return (
      <TouchableOpacity
        style={[styles.notification, !item.isRead && styles.notificationUnread]}
        activeOpacity={0.75}
        onPress={() => markAsRead(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.message}`}
      >
        <View style={[styles.typeIcon, { backgroundColor: config.background }]}>
          <Text style={[styles.typeIconText, { color: config.color }]}>{config.icon}</Text>
        </View>
        <View style={styles.notificationBody}>
          <View style={styles.notificationHeading}>
            <Text style={styles.notificationTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={styles.readAllButton}
          onPress={markAllAsRead}
          disabled={notifications.every((item) => item.isRead)}
        >
          <Text style={styles.readAllText}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filter, !unreadOnly && styles.filterActive]}
          onPress={() => setUnreadOnly(false)}
        >
          <Text style={[styles.filterText, !unreadOnly && styles.filterTextActive]}>Toutes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filter, unreadOnly && styles.filterActive]}
          onPress={() => setUnreadOnly(true)}
        >
          <Text style={[styles.filterText, unreadOnly && styles.filterTextActive]}>Non lues</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.errorBanner}>{error}</Text>}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={[styles.list, notifications.length === 0 && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>
                {unreadOnly ? 'Aucune notification non lue' : 'Aucune notification'}
              </Text>
              <Text style={styles.emptyMessage}>
                Les rappels et confirmations apparaîtront ici.
              </Text>
            </View>
          }
        />
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { color: colors.white, fontSize: 34, lineHeight: 36 },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  readAllButton: { paddingVertical: spacing.sm, paddingLeft: spacing.md },
  readAllText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterActive: { backgroundColor: colors.primaryLight },
  filterText: { color: colors.textSecondary, fontSize: typography.fontSizes.sm },
  filterTextActive: { color: colors.primary, fontWeight: typography.fontWeights.semibold },
  errorBanner: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    textAlign: 'center',
    fontSize: typography.fontSizes.sm,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  emptyList: { flexGrow: 1 },
  notification: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  notificationUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconText: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold },
  notificationBody: { flex: 1 },
  notificationHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notificationTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  notificationMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  notificationDate: {
    color: colors.textHint,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.sm,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: spacing.md },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  emptyMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default NotificationsScreen;
