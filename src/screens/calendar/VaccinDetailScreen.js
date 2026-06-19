import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { vaccinService } from '../../services';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusMeta(status) {
  switch (status) {
    case 'FAIT':      return { color: Colors.success,  bg: Colors.successBg,  icon: 'checkmark-circle', label: 'Administré',  gradient: ['#12A150', '#17C964'] };
    case 'A_VENIR':   return { color: Colors.primary,  bg: Colors.primaryTint, icon: 'time-outline',    label: 'À venir',     gradient: Gradients.brand };
    case 'EN_RETARD': return { color: Colors.danger,   bg: Colors.dangerBg,   icon: 'alert-circle',    label: 'En retard',   gradient: Gradients.danger };
    case 'PLANIFIE':  return { color: Colors.accent,   bg: Colors.accentLight, icon: 'calendar',        label: 'Planifié',    gradient: Gradients.accent };
    default:          return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status, gradient: [Colors.primaryLight, Colors.primary] };
  }
}

export default function VaccinDetailScreen({ route, navigation }) {
  const { vaccin: initial } = route.params;
  const [vaccin,  setVaccin]  = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const numericId = Number(initial?.id);
    if (Number.isInteger(numericId) && numericId > 0) {
      setLoading(true);
      vaccinService.getVaccinDetail(numericId)
        .then((data) => { if (data) setVaccin((v) => ({ ...v, ...data })); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initial?.id]);

  const s = statusMeta(vaccin?.statut);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={s.gradient} style={styles.header}>
        <View style={styles.decCircle} />
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Détail vaccin</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="medical" size={34} color={Colors.white} />
          </View>
          <Text style={styles.heroName}>{vaccin?.nom}</Text>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.20)', borderColor: 'rgba(255,255,255,0.30)' }]}>
            <Ionicons name={s.icon} size={14} color={Colors.white} />
            <Text style={styles.statusText}>{s.label}</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing['3xl'] }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Détails</Text>
            <InfoRow icon="calendar-outline"  label="Date prévue"    value={formatDate(vaccin?.date_prevue)} />
            {vaccin?.dose   && <InfoRow icon="medical-outline"       label="Dose"           value={String(vaccin.dose)} />}
            {vaccin?.date_administree && (
              <InfoRow icon="checkmark-done-outline" label="Date administrée" value={formatDate(vaccin.date_administree)} />
            )}
            {vaccin?.centre && <InfoRow icon="location-outline"     label="Centre"         value={vaccin.centre} />}
            {vaccin?.lot    && <InfoRow icon="barcode-outline"       label="N° de lot"      value={vaccin.lot} />}
          </View>

          {vaccin?.description && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>À propos de ce vaccin</Text>
              <Text style={styles.desc}>{vaccin.description}</Text>
            </View>
          )}

          {!vaccin?.description && (
            <View style={[styles.card, styles.infoBox]}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoBoxText}>
                Ce vaccin fait partie du calendrier vaccinal national recommandé par le Ministère de la Santé.
              </Text>
            </View>
          )}

          {(vaccin?.statut === 'EN_RETARD' || vaccin?.statut === 'A_VENIR') && (
            <TouchableOpacity
              style={styles.rdvCta}
              onPress={() => navigation.navigate('Tabs', { screen: 'RDV' })}
              activeOpacity={0.85}
            >
              <LinearGradient colors={vaccin.statut === 'EN_RETARD' ? Gradients.danger : Gradients.brand} style={styles.rdvCtaGrad}>
                <Ionicons name="calendar-outline" size={20} color={Colors.white} />
                <Text style={styles.rdvCtaText}>
                  {vaccin.statut === 'EN_RETARD' ? 'Rattraper ce vaccin — Prendre RDV' : 'Planifier ce vaccin — Prendre RDV'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:      { paddingBottom: Spacing['2xl'], position: 'relative', overflow: 'hidden' },
  decCircle:   { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.glass, top: -60, right: -40 },

  navRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing['3xl'], paddingBottom: Spacing.lg },
  navBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTitle:    { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.white },

  heroSection: { alignItems: 'center', gap: Spacing.md },
  heroIconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  heroName:    { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.2, textAlign: 'center', paddingHorizontal: Spacing.xl },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radii.pill, borderWidth: 1.5 },
  statusText:  { fontSize: 13, fontWeight: '700', color: Colors.white },

  scroll:      { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['4xl'] },

  card:        { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  cardTitle:   { fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.md },

  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:    { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoLabel:   { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoValue:   { fontSize: 15, fontWeight: '700', color: Colors.text },

  desc:        { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  infoBox:     { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  infoBoxText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  rdvCta:      { borderRadius: Radii.xl, overflow: 'hidden', ...Elevation.card },
  rdvCtaGrad:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  rdvCtaText:  { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.white },
});
