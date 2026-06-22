import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Spacing, Elevation } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';

const STAFF_GRADIENT = ['#1a365d', '#2a4a7f', '#2b6cb0'];

const ROLE_LABELS = {
  infirmier: 'Infirmier(e)',
  admin:     'Administrateur',
  medecin:   'Médecin',
};

export default function StaffDashboard() {
  const insets      = useSafeAreaInsets();
  const { user, logout } = useContext(AuthContext);

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Personnel';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={STAFF_GRADIENT}
        style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={28} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTxt}>Bienvenue,</Text>
            <Text style={styles.nameTxt}>
              {user?.prenom || ''} {user?.nom || ''}
            </Text>
            <View style={styles.roleBadge}>
              <Ionicons name="medical" size={11} color="#90cdf4" />
              <Text style={styles.roleTxt}>{roleLabel}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.70)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing['2xl'] }]}
      >
        <View style={styles.constructionCard}>
          <Ionicons name="construct-outline" size={48} color={Colors.primary} />
          <Text style={styles.constructionTitle}>Tableau de bord en construction</Text>
          <Text style={styles.constructionText}>
            Le module personnel sera disponible prochainement.{'\n'}
            Votre connexion fonctionne correctement.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Informations du compte</Text>
          <InfoRow icon="card-outline"     label="CIN"     value={user?.cin || '—'} />
          <InfoRow icon="business-outline" label="Centre"  value={user?.centre_id ? `Centre #${user.centre_id}` : '—'} />
          <InfoRow icon="shield-outline"   label="Rôle"    value={roleLabel} />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:        { paddingBottom: Spacing.xl },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  avatarWrap:    { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  welcomeTxt:    { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  nameTxt:       { fontSize: 20, fontWeight: '800', color: Colors.white },
  roleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  roleTxt:       { fontSize: 12, color: '#90cdf4', fontWeight: '600' },
  logoutBtn:     { padding: 8 },

  body: { padding: Spacing.lg, gap: Spacing.lg },

  constructionCard: {
    backgroundColor: Colors.surface, borderRadius: Radii['2xl'],
    padding: Spacing['2xl'], alignItems: 'center', gap: Spacing.md, ...Elevation.card,
  },
  constructionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  constructionText:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },

  infoCard:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  infoCardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  infoRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:      { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoLabel:     { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoValue:     { fontSize: 14, fontWeight: '700', color: Colors.text },
});
