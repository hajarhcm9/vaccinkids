import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

// Données Mock des notifications
const MOCK_NOTIFS = [
  {
    id: '1',
    type: 'RAPPEL',
    titre: 'Rappel : RDV Demain',
    message: 'N\'oubliez pas votre rendez-vous pour le vaccin DTP de Léa demain à 09h30.',
    date: 'Il y a 2 heures',
    lu: false
  },
  {
    id: '2',
    type: 'RETARD',
    titre: 'Vaccin en retard',
    message: 'Le vaccin Rougeole 1 de Lucas est en retard. Veuillez prendre rendez-vous rapidement.',
    date: 'Hier',
    lu: false
  },
  {
    id: '3',
    type: 'CONFIRMATION',
    titre: 'RDV Confirmé',
    message: 'Votre rendez-vous pour le BCG a bien été enregistré au centre.',
    date: 'Il y a 3 jours',
    lu: true
  },
  {
    id: '4',
    type: 'ABSENCE',
    titre: 'Absence détectée',
    message: 'Vous n\'êtes pas venu au RDV d\'hier. Cliquez ici pour reprogrammer une date.',
    date: 'Il y a 5 jours',
    lu: true
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFS);

  // Couleurs et icônes selon le type
  const getTypeStyle = (type) => {
    switch (type) {
      case 'RAPPEL': return { color: Colors.warning, icon: 'time-outline' };
      case 'RETARD': return { color: Colors.danger, icon: 'alert-circle-outline' };
      case 'CONFIRMATION': return { color: Colors.success, icon: 'checkmark-circle-outline' };
      case 'ABSENCE': return { color: Colors.primary, icon: 'close-circle-outline' };
      default: return { color: Colors.textSecondary, icon: 'notifications-outline' };
    }
  };

  const markAllAsRead = () => {
    const updatedNotifs = notifications.map(n => ({ ...n, lu: true }));
    setNotifications(updatedNotifs);
    Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues.');
  };

  const handleNotifPress = (item) => {
    if (!item.lu) {
      setNotifications(notifications.map(n => n.id === item.id ? { ...n, lu: true } : n));
    }
    if (item.type === 'ABSENCE') {
      Alert.alert('Reprogrammer', 'Redirection vers la prise de rendez-vous...');
    }
  };

  const renderNotif = ({ item }) => {
    const typeStyle = getTypeStyle(item.type);

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.lu && styles.notifCardUnread]}
        onPress={() => handleNotifPress(item)}
      >
        <View style={[styles.notifIconContainer, { backgroundColor: typeStyle.color + '15' }]}>
          <Ionicons name={typeStyle.icon} size={24} color={typeStyle.color} />
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
      {/* Header personnalisé */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.lu) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markReadButton}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotif}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color={Colors.textLight} />
            <Text style={styles.emptyText}>Aucune notification</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.background
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  markReadButton: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Notification Card
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 15,
    marginVertical: 6,
    borderRadius: 16,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.background,
  },
  notifCardUnread: {
    borderLeftColor: Colors.primary, // Bordure bleue si non lu
    backgroundColor: '#F8FAFF' // Légère coloration bleutée si non lu
  },

  notifIconContainer: {
    width: 45, height: 45, borderRadius: 22.5,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },

  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary, flex: 1 },
  notifTitleUnread: { fontWeight: 'bold', color: Colors.text }, // Gras si non lu

  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary, marginLeft: 10 // Point bleu si non lu
  },

  notifMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  notifDate: { fontSize: 12, color: Colors.textLight },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 10 }
});