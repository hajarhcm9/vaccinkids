import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { rdvService, notificationService, ApiError } from '../../services';

const MOCK_ACTUS = [
  { id: '1', type: 'ALERTE',  titre: 'Campagne de rappel Rougeole', description: 'Le centre lance une campagne de rattrapage pour le vaccin ROR. N\'hésitez pas à prendre rendez-vous.', date: 'Aujourd\'hui' },
  { id: '2', type: 'CONSEIL', titre: 'Comment préparer votre enfant ?', description: 'Astuce : Expliquez à l\'enfant à quoi sert le vaccin pour diminuer l\'anxiété.', date: 'Hier' },
  { id: '3', type: 'INFO',    titre: 'Nouveaux horaires', description: 'Le centre ouvrira exceptionnellement le samedi matin de 9h à 12h à partir du mois prochain.', date: 'Il y a 3 jours' },
];

const MOCK_NEXT_RDV = { enfant: 'Léa', vaccin: 'DTP 2', date: 'Mercredi 12 Juin', heure: '09:30' };

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const prenom = user?.prenom || 'Invité';
  const [refreshing, setRefreshing] = React.useState(false);
  const [nextRdv, setNextRdv] = React.useState(MOCK_NEXT_RDV);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadData = React.useCallback(async () => {
    try {
      const [rdvResp, notifResp] = await Promise.all([
        rdvService.listRdv('A_VENIR').catch(() => null),
        notificationService.getUnreadCount().catch(() => null),
      ]);
      if (rdvResp && Array.isArray(rdvResp) && rdvResp.length > 0) {
        const r = rdvResp[0];
        setNextRdv({
          enfant: r.enfant_nom,
          vaccin: r.vaccin,
          date: new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }),
          heure: r.heure,
        });
      } else if (rdvResp && Array.isArray(rdvResp) && rdvResp.length === 0) {
        setNextRdv(null);
      }
      if (notifResp?.count != null) setUnreadCount(notifResp.count);
    } catch (e) {
      // Fallback silencieux
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const typeMeta = (type) => {
    switch (type) {
      case 'ALERTE':  return { color: Colors.danger,  icon: 'alert-circle-outline',   label: 'Alerte' };
      case 'CONSEIL': return { color: Colors.primary, icon: 'bulb-outline',           label: 'Conseil' };
      case 'INFO':    return { color: Colors.info,    icon: 'information-circle-outline', label: 'Info' };
      default:        return { color: Colors.textSecondary, icon: 'document-text-outline', label: type };
    }
  };

  const renderActu = ({ item }) => {
    const m = typeMeta(item.type);
    return (
      <View style={[styles.actuCard, { borderLeftColor: m.color }]}>
        <View style={styles.actuHeader}>
          <View style={[styles.actuIcon, { backgroundColor: m.color + '15' }]}>
            <Ionicons name={m.icon} size={18} color={m.color} />
          </View>
          <Text style={[styles.actuType, { color: m.color }]}>{m.label}</Text>
          <Text style={styles.actuDate}>{item.date}</Text>
        </View>
        <Text style={styles.actuTitre}>{item.titre}</Text>
        <Text style={styles.actuDescription}>{item.description}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
    >
      <LinearGradient colors={Gradients.brand} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerGreeting}>Bonjour,</Text>
            <Text style={styles.headerName}>{prenom} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => navigation.navigate('Notifs')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.surface} />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.rdvContainer}>
        <Text style={styles.sectionTitle}>Prochain rendez-vous</Text>
        {MOCK_NEXT_RDV ? (
          <TouchableOpacity
            style={styles.rdvCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('RDV')}
            accessibilityRole="button"
            accessibilityLabel={`Rendez-vous ${MOCK_NEXT_RDV.vaccin} pour ${MOCK_NEXT_RDV.enfant}, ${MOCK_NEXT_RDV.date} à ${MOCK_NEXT_RDV.heure}`}
          >
            <View style={styles.rdvIcon}>
              <Ionicons name="syringe" size={26} color={Colors.surface} />
            </View>
            <View style={styles.rdvInfo}>
              <Text style={styles.rdvTitle}>{MOCK_NEXT_RDV.vaccin} · {MOCK_NEXT_RDV.enfant}</Text>
              <View style={styles.rdvMeta}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.rdvDetails}>{MOCK_NEXT_RDV.date} · {MOCK_NEXT_RDV.heure}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.rdvCard, styles.rdvCardEmpty]}>
            <Ionicons name="calendar-outline" size={26} color={Colors.textLight} />
            <Text style={styles.rdvEmptyText}>Aucun rendez-vous planifié</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RDV')}>
              <Text style={styles.rdvEmptyCta}>Prendre rendez-vous</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actuSection}>
        <Text style={styles.sectionTitle}>Consignes & actualités</Text>
        <FlatList
          data={MOCK_ACTUS}
          keyExtractor={(item) => item.id}
          renderItem={renderActu}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['3xl'] + 10,
    borderBottomLeftRadius: Radii.header,
    borderBottomRightRadius: Radii.header,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  headerName: { fontSize: 26, fontWeight: '800', color: Colors.surface, marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 10, right: 10,
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: Colors.accent,
    borderWidth: 2, borderColor: Colors.primaryDark,
  },
  rdvContainer: { marginTop: -28, marginHorizontal: Spacing.lg },
  sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md },
  rdvCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    ...Elevation.md,
  },
  rdvCardEmpty: { flexDirection: 'column', gap: 8, padding: Spacing.xl, alignItems: 'center' },
  rdvIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.base,
  },
  rdvInfo: { flex: 1 },
  rdvTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rdvMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rdvDetails: { fontSize: 13, color: Colors.textSecondary },
  rdvEmptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  rdvEmptyCta: { color: Colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },
  actuSection: { padding: Spacing.lg },
  actuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    ...Elevation.sm,
  },
  actuHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  actuIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actuType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', flex: 1 },
  actuDate: { fontSize: 11, color: Colors.textLight },
  actuTitre: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  actuDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});