import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { rdvService, notificationService, enfantService } from '../../services';


const TYPE_META = {
  ALERTE:  { color: Colors.danger,   bg: Colors.dangerBg,  icon: 'warning',               label: 'Alerte' },
  CONSEIL: { color: Colors.primary,  bg: Colors.primaryTint,icon: 'bulb-outline',          label: 'Conseil' },
  INFO:    { color: Colors.accent,   bg: Colors.accentLight,icon: 'information-circle-outline', label: 'Info' },
};

function StatChip({ icon, value, label, color }) {
  return (
    <View style={[styles.statChip, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets  = useSafeAreaInsets();
  const prenom  = user?.prenom || 'Parent';
  const [refreshing,  setRefreshing]  = React.useState(false);
  const [nextRdv,     setNextRdv]     = React.useState(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [stats,       setStats]       = React.useState({ enfants: 0, rdvAVenir: 0, coverage: null });
  const [actus,       setActus]       = React.useState([]);

  const loadData = React.useCallback(async () => {
    try {
      const [rdvResp, notifResp, enfantsResp, notifListResp] = await Promise.all([
        rdvService.listRdv().catch(() => null),
        notificationService.getUnreadCount().catch(() => null),
        enfantService.listEnfants().catch(() => null),
        notificationService.getMyNotifications(5).catch(() => null),
      ]);
      const upcoming = (rdvResp || []).filter((r) =>
        ['EN_ATTENTE', 'CONFIRME', 'EN_LISTE_ATTENTE'].includes(r.statut)
      );
      if (upcoming.length > 0) {
        const r = upcoming[0];
        setNextRdv({
          enfant: r.bebe_prenom || r.bebe_nom || '—',
          vaccin: r.vaccin_nom || '—',
          date: r.date_session
            ? new Date(r.date_session).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
            : '—',
          heure: r.heure_debut || '—',
        });
      } else {
        setNextRdv(null);
      }
      if (notifResp?.count != null) setUnreadCount(notifResp.count);
      if (notifListResp) {
        const list = Array.isArray(notifListResp) ? notifListResp : notifListResp.notifications ?? [];
        setActus(list.map((n, i) => ({
          id: String(n.id || i),
          type: n.type?.includes('ALERTE') || n.type?.includes('STOCK') ? 'ALERTE'
              : n.type?.includes('CONSEIL') ? 'CONSEIL'
              : 'INFO',
          titre: n.titre || n.type || 'Notification',
          description: n.message || '—',
          date: n.created_at
            ? new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            : '—',
        })));
      }
      if (enfantsResp !== null) {
        const count = (enfantsResp || []).length;
        const totalVaccins = (enfantsResp || []).reduce((a, e) => a + (e.vaccins_total || 0), 0);
        const doneVaccins  = (enfantsResp || []).reduce((a, e) => a + (e.vaccins_faits || 0), 0);
        const coverage = totalVaccins > 0 ? Math.round((doneVaccins / totalVaccins) * 100) : null;
        setStats({ enfants: count, rdvAVenir: upcoming.length, coverage });
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const renderActu = ({ item }) => {
    const m = TYPE_META[item.type] || TYPE_META.INFO;
    return (
      <View style={[styles.actuCard, { borderLeftColor: m.color }]}>
        <View style={[styles.actuIconWrap, { backgroundColor: m.bg }]}>
          <Ionicons name={m.icon} size={16} color={m.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.actuTop}>
            <View style={[styles.actuBadge, { backgroundColor: m.bg }]}>
              <Text style={[styles.actuBadgeText, { color: m.color }]}>{m.label}</Text>
            </View>
            <Text style={styles.actuDate}>{item.date}</Text>
          </View>
          <Text style={styles.actuTitre}>{item.titre}</Text>
          <Text style={styles.actuDesc} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[Colors.primary]} tintColor={Colors.primary} />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* ── Header gradient ── */}
      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        {/* Decorative circle */}
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{prenom} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={() => navigation.navigate('Notifs')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatChip icon="people-outline"   value={String(stats.enfants)}   label="Enfants"   color={Colors.accentLight} />
          <StatChip icon="calendar-outline" value={String(stats.rdvAVenir)} label="RDV prévu" color={Colors.accentLight} />
          <StatChip icon="shield-checkmark-outline" value={stats.coverage != null ? `${stats.coverage}%` : '—'} label="Couverture" color={Colors.accentLight} />
        </View>
      </LinearGradient>

      {/* ── Email banner (shown once when email missing) ── */}
      {!user?.email && (
        <View style={styles.emailBanner}>
          <Ionicons name="mail-outline" size={18} color={Colors.primary} />
          <Text style={styles.emailBannerText}>
            Ajoutez votre email pour recevoir vos rappels de vaccination.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.emailBannerCta}>Ajouter →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Prochain RDV card ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Prochain rendez-vous</Text>
        {nextRdv ? (
          <TouchableOpacity
            style={styles.rdvCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('RDV')}
          >
            <LinearGradient colors={Gradients.card} style={styles.rdvIconBg}>
              <Ionicons name="medkit" size={24} color={Colors.white} />
            </LinearGradient>
            <View style={styles.rdvInfo}>
              <Text style={styles.rdvVaccin}>{nextRdv.vaccin}</Text>
              <Text style={styles.rdvEnfant}>Pour {nextRdv.enfant}</Text>
              <View style={styles.rdvMeta}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textLight} />
                <Text style={styles.rdvMetaText}>{nextRdv.date}</Text>
                <View style={styles.rdvDot} />
                <Ionicons name="time-outline" size={12} color={Colors.textLight} />
                <Text style={styles.rdvMetaText}>{nextRdv.heure}</Text>
              </View>
            </View>
            <View style={styles.rdvChevron}>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.rdvEmpty} onPress={() => navigation.navigate('RDV')}>
            <Ionicons name="calendar-outline" size={32} color={Colors.textLight} />
            <Text style={styles.rdvEmptyTitle}>Aucun rendez-vous planifié</Text>
            <Text style={styles.rdvEmptyCta}>Prendre rendez-vous →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Quick actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Accès rapide</Text>
        <View style={styles.quickRow}>
          <QuickAction icon="people" label="Enfants"   color={Colors.primary}   bg={Colors.primaryTint} onPress={() => navigation.navigate('Enfants')} />
          <QuickAction icon="calendar" label="Calendrier" color="#7C3AED"       bg="#F5F3FF"            onPress={() => navigation.navigate('Calendrier')} />
          <QuickAction icon="medkit"  label="RDV"      color={Colors.successDark} bg={Colors.successBg} onPress={() => navigation.navigate('RDV')} />
          <QuickAction icon="notifications" label="Alertes" color={Colors.danger} bg={Colors.dangerBg}  onPress={() => navigation.navigate('Notifs')} />
        </View>
      </View>

      {/* ── Actualités ── */}
      <View style={[styles.section, { marginBottom: Spacing['4xl'] }]}>
        <Text style={styles.sectionLabel}>Consignes & actualités</Text>
        <FlatList
          data={actus}
          keyExtractor={(item) => item.id}
          renderItem={renderActu}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, color, bg, onPress }) {
  return (
    <TouchableOpacity style={styles.qaWrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qaIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header:       { paddingBottom: Spacing['2xl'], paddingHorizontal: Spacing.xl, position: 'relative', overflow: 'hidden' },
  decCircle1:   { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.glass, top: -80, right: -60 },
  decCircle2:   { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: Colors.glass, bottom: -50, left: -30 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing['2xl'] },
  greeting:     { fontSize: 14, color: 'rgba(255,255,255,0.70)', marginBottom: 2 },
  userName:     { fontSize: 26, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  bellWrap:     { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  bellBadge:    { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primaryDark },
  bellBadgeText:{ color: Colors.white, fontSize: 9, fontWeight: '800' },

  // Stats row
  statsRow:     { flexDirection: 'row', gap: Spacing.sm },
  statChip:     { flex: 1, flexDirection: 'column', alignItems: 'center', paddingVertical: 10, borderRadius: Radii.lg, gap: 2 },
  statValue:    { fontSize: 15, fontWeight: '800' },
  statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.60)', fontWeight: '600' },

  // Sections
  section:      { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },

  // RDV card
  rdvCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card, gap: Spacing.base },
  rdvIconBg:    { width: 52, height: 52, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  rdvInfo:      { flex: 1 },
  rdvVaccin:    { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  rdvEnfant:    { fontSize: 12, color: Colors.primary, fontWeight: '600', marginBottom: 6 },
  rdvMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rdvMetaText:  { fontSize: 12, color: Colors.textLight },
  rdvDot:       { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.borderStrong },
  rdvChevron:   { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  rdvEmpty:     { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing['2xl'], alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  rdvEmptyTitle:{ fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  rdvEmptyCta:  { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Quick actions
  quickRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  qaWrap:       { alignItems: 'center', gap: Spacing.sm },
  qaIcon:       { width: 60, height: 60, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center', ...Elevation.sm },
  qaLabel:      { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  // Email banner
  emailBanner:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, padding: Spacing.base, backgroundColor: Colors.primaryTint, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.primary + '30' },
  emailBannerText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '500', lineHeight: 17 },
  emailBannerCta:  { fontSize: 12, fontWeight: '800', color: Colors.primary },

  // Actus
  actuCard:     { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.base, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Elevation.sm },
  actuIconWrap: { width: 36, height: 36, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actuTop:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  actuBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.pill },
  actuBadgeText:{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actuDate:     { fontSize: 10, color: Colors.textLight, marginLeft: 'auto' },
  actuTitre:    { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  actuDesc:     { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});
