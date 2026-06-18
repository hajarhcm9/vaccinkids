import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';

function getAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob.includes('/') ? dob.split('/').reverse().join('-') : dob);
  const now   = new Date();
  const years  = now.getFullYear() - birth.getFullYear();
  const months = (now.getFullYear() * 12 + now.getMonth()) - (birth.getFullYear() * 12 + birth.getMonth());
  if (years >= 1) return `${years} an${years > 1 ? 's' : ''}`;
  return `${months} mois`;
}

function formatDateDisplay(iso) {
  if (!iso) return '—';
  if (iso.includes('/')) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function EnfantDetailScreen({ route, navigation }) {
  const { enfant: initial } = route.params;
  const [enfant, setEnfant] = useState(initial);

  const isF = enfant.sexe === 'F';
  const avatarGradient = isF ? ['#EC4899', '#F43F5E'] : ['#6366F1', '#3B82F6'];
  const sexeColor      = isF ? Colors.danger : Colors.primary;
  const sexeLabel      = isF ? '♀  Fille' : '♂  Garçon';
  const initials       = `${enfant.prenom?.[0] || ''}${enfant.nom?.[0] || ''}`.toUpperCase();

  const handleDelete = () => {
    Alert.alert(
      'Supprimer un enfant',
      'Pour retirer un enfant de votre compte, veuillez contacter votre centre de santé.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={Gradients.brandWide} style={styles.header}>
        <View style={styles.decCircle} />
        {/* Nav row */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Profil enfant</Text>
          <TouchableOpacity style={[styles.navBtn, styles.navBtnDanger]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <LinearGradient colors={avatarGradient} style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <Text style={styles.name}>{enfant.prenom} {enfant.nom}</Text>
          <View style={styles.agePill}>
            <Ionicons name="sparkles-outline" size={12} color="rgba(255,255,255,0.80)" />
            <Text style={styles.ageText}>{getAge(enfant.date_naissance)}</Text>
          </View>
          <View style={[styles.sexeBadge, { backgroundColor: sexeColor + '28' }]}>
            <Ionicons name={isF ? 'female' : 'male'} size={13} color={isF ? '#FFC0D4' : Colors.accentLight} />
            <Text style={[styles.sexeText, { color: isF ? '#FFC0D4' : Colors.accentLight }]}>{sexeLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          <InfoRow icon="calendar-outline" label="Date de naissance" value={formatDateDisplay(enfant.date_naissance)} />
          <InfoRow icon="body-outline"     label="Sexe"              value={sexeLabel}                    />
          <InfoRow icon="card-outline"     label="Identifiant"       value={`#${enfant.id}`}              />
        </View>

        {/* Vaccines summary card */}
        {enfant.vaccins_total != null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Couverture vaccinale</Text>
            <View style={styles.statsRow}>
              <StatBlock num={enfant.vaccins_faits ?? 0}            color={Colors.success} label="Faits" />
              <StatBlock num={(enfant.vaccins_total ?? 0) - (enfant.vaccins_faits ?? 0)} color={Colors.textSecondary} label="Restants" />
              <StatBlock num={enfant.vaccins_total ?? 0}            color={Colors.primary} label="Total" />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${enfant.vaccins_total > 0 ? Math.round((enfant.vaccins_faits / enfant.vaccins_total) * 100) : 0}%`,
                backgroundColor: Colors.success,
              }]} />
            </View>
            <Text style={styles.progressLabel}>
              {enfant.vaccins_total > 0 ? Math.round((enfant.vaccins_faits / enfant.vaccins_total) * 100) : 0}% complété
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.cta}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Calendrier', { enfantId: enfant.id })}
        >
          <LinearGradient colors={Gradients.brand} style={styles.ctaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="calendar" size={20} color={Colors.white} />
            <Text style={styles.ctaText}>Voir le calendrier vaccinal</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
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
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatBlock({ num, color, label }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statNum, { color }]}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:       { paddingBottom: Spacing['2xl'], position: 'relative', overflow: 'hidden' },
  decCircle:    { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.glass, top: -70, right: -50 },

  navRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing['3xl'], paddingBottom: Spacing.lg },
  navBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navBtnDanger: { backgroundColor: Colors.dangerBg + 'AA' },
  navTitle:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.white },

  avatarSection:{ alignItems: 'center', gap: Spacing.sm },
  avatar:        { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' },
  avatarText:    { fontSize: 32, fontWeight: '800', color: Colors.white },
  name:          { fontSize: 24, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  agePill:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.pill },
  ageText:       { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  sexeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.pill },
  sexeText:      { fontSize: 13, fontWeight: '700' },

  scroll:        { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['4xl'] },

  card:          { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  cardTitle:     { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },

  infoRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:      { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoLabel:     { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoValue:     { fontSize: 15, fontWeight: '700', color: Colors.text },

  statsRow:      { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.md },
  statBlock:     { alignItems: 'center', gap: 3 },
  statNum:       { fontSize: 26, fontWeight: '800' },
  statLabel:     { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: Radii.pill, overflow: 'hidden', marginTop: Spacing.sm },
  progressFill:  { height: 8, borderRadius: Radii.pill },
  progressLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 6, fontWeight: '600' },

  cta:           { borderRadius: Radii.xl, overflow: 'hidden', ...Elevation.sm },
  ctaGrad:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  ctaText:       { flex: 1, color: Colors.white, fontSize: 15, fontWeight: '700' },
});
