import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';
import { enfantService, rdvService } from '../../services';

const AVATAR_GRADIENT = ['#006FEE', '#338EF7'];

function SettingRow({ icon, label, value, onPress, color, showChevron = true, danger = false }) {
  const c = danger ? Colors.danger : (color || Colors.textSecondary);
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingIcon, { backgroundColor: c + '18' }]}>
        <Ionicons name={icon} size={18} color={c} />
      </View>
      <View style={styles.settingBody}>
        <Text style={[styles.settingLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const insets   = useSafeAreaInsets();
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Utilisateur';
  const [profileStats, setProfileStats] = useState({ enfants: 0, rdvAVenir: 0, coverage: null });

  useEffect(() => {
    Promise.all([
      enfantService.listEnfants().catch(() => null),
      rdvService.listRdv('A_VENIR').catch(() => null),
    ]).then(([enfantsResp, rdvResp]) => {
      const count = enfantsResp?.length || 0;
      const rdvCount = rdvResp?.length || 0;
      const totalV = enfantsResp?.reduce((a, e) => a + (e.vaccins_total || 0), 0) || 0;
      const doneV  = enfantsResp?.reduce((a, e) => a + (e.vaccins_faits || 0), 0) || 0;
      const coverage = totalV > 0 ? Math.round((doneV / totalV) * 100) : null;
      setProfileStats({ enfants: count, rdvAVenir: rdvCount, coverage });
    });
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Gradient header ── */}
        <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <View style={styles.avatarWrap}>
            <LinearGradient colors={AVATAR_GRADIENT} style={styles.avatarGrad}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNum}>{profileStats.enfants}</Text>
              <Text style={styles.statLbl}>Enfants</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={styles.statNum}>{profileStats.rdvAVenir}</Text>
              <Text style={styles.statLbl}>RDV à venir</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={styles.statNum}>{profileStats.coverage != null ? `${profileStats.coverage}%` : '—'}</Text>
              <Text style={styles.statLbl}>Couverture</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Completion banner ── */}
        {!user?.profileCompleted && (
          <View style={styles.incompleteBanner}>
            <Ionicons name="warning-outline" size={18} color={Colors.warning} />
            <Text style={styles.incompleteText}>Complétez votre profil pour accéder à toutes les fonctionnalités.</Text>
          </View>
        )}

        {/* ── Settings ── */}
        <View style={styles.body}>

          <SectionHeader title="Mon compte" />
          <View style={styles.card}>
            <SettingRow
              icon="person-outline"
              label="Modifier mes informations"
              value={user?.telephone || undefined}
              onPress={() => navigation.navigate('EditProfile')}
              color={Colors.primary}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="card-outline"
              label="CIN enregistrée"
              value={user?.cin || '—'}
              onPress={() => {}}
              showChevron={false}
              color="#7C3AED"
            />
          </View>

          <SectionHeader title="Préférences" />
          <View style={styles.card}>
            <SettingRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => navigation.navigate('NotificationSettings')}
              color={Colors.accent}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="language-outline"
              label="Langue"
              value="Français"
              onPress={() => Alert.alert('Langue', 'Français, العربية, ⴰⵎⴰⵣⵉⵖ — bientôt disponibles.')}
              color={Colors.info}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="shield-checkmark-outline"
              label="Confidentialité & données"
              onPress={() => Alert.alert('Confidentialité', 'Vos données sont protégées conformément à la loi 09-08.')}
              color={Colors.success}
            />
          </View>

          <SectionHeader title="Support" />
          <View style={styles.card}>
            <SettingRow
              icon="help-circle-outline"
              label="Aide & FAQ"
              onPress={() => Alert.alert('Aide', 'Centre d\'aide disponible prochainement.')}
              color="#F59E0B"
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="chatbubble-ellipses-outline"
              label="Contacter le support"
              onPress={() => Alert.alert('Support', 'support@vaccinkids.ma')}
              color={Colors.primary}
            />
          </View>

          <View style={[styles.card, { marginBottom: Spacing['3xl'] }]}>
            <SettingRow
              icon="log-out-outline"
              label="Se déconnecter"
              onPress={handleLogout}
              showChevron={false}
              danger
            />
          </View>

          <Text style={styles.version}>VacciKids v1.0 · Maroc · MSPS</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:       { paddingBottom: Spacing['2xl'], alignItems: 'center', position: 'relative', overflow: 'hidden' },
  decCircle1:   { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: Colors.glass, top: -80, right: -80 },
  decCircle2:   { position: 'absolute', width: 130, height: 130, borderRadius: 65,  backgroundColor: Colors.glass, bottom: -30, left: -30 },

  avatarWrap:   { marginBottom: Spacing.md, padding: 4, borderRadius: 46, backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.glassBorder },
  avatarGrad:   { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 30, fontWeight: '800', color: Colors.white },
  userName:     { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3, marginBottom: 4 },
  userEmail:    { fontSize: 13, color: 'rgba(255,255,255,0.70)', marginBottom: Spacing.xl },

  statsRow:     { flexDirection: 'row', backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.xl },
  statBlock:    { alignItems: 'center' },
  statNum:      { fontSize: 20, fontWeight: '800', color: Colors.white },
  statLbl:      { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  statSep:      { width: 1, height: '100%', backgroundColor: Colors.glassBorder },

  incompleteBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, margin: Spacing.lg, padding: Spacing.base, backgroundColor: Colors.warningBg, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.warning + '40' },
  incompleteText:   { flex: 1, fontSize: 13, color: Colors.accent, fontWeight: '600', lineHeight: 18 },

  body:         { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  sectionHeader:{ fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: Spacing.xl, marginBottom: Spacing.sm, paddingHorizontal: 4 },

  card:         { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], overflow: 'hidden', ...Elevation.card },
  rowDivider:   { height: 1, backgroundColor: Colors.border, marginLeft: 56 },

  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 14, gap: Spacing.md },
  settingIcon:  { width: 36, height: 36, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  settingBody:  { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  settingValue: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  version:      { textAlign: 'center', fontSize: 11, color: Colors.textLight, paddingBottom: Spacing.xl },
});
