import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { rdvService } from '../../services';

function statusMeta(status) {
  switch (status) {
    case 'A_VENIR': return { color: Colors.primary, bg: Colors.primary + '20', icon: 'time-outline',    label: 'À venir' };
    case 'FAIT':    return { color: Colors.success, bg: Colors.success + '20', icon: 'checkmark-circle', label: 'Confirmé' };
    case 'ANNULE':  return { color: Colors.danger,  bg: Colors.danger + '20',  icon: 'close-circle',    label: 'Annulé' };
    default:        return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status };
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function RdvDetailScreen({ route, navigation }) {
  const { rdvId, rdv: rdvParam } = route.params;
  const [rdv, setRdv] = useState(rdvParam || null);
  const [loading, setLoading] = useState(!rdvParam);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (rdvParam) return;
    rdvService.getRdv(rdvId)
      .then((data) => { if (data) setRdv(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rdvId]);

  const handleCancel = () => {
    Alert.alert('Annuler le RDV', 'Confirmer l\'annulation de ce rendez-vous ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await rdvService.cancelRdv(rdvId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Erreur', 'Impossible d\'annuler ce rendez-vous.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const s = statusMeta(rdv?.statut);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail RDV</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {rdv ? (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={[styles.iconCircle, { backgroundColor: s.color }]}>
                <Ionicons name="medkit" size={26} color={Colors.surface} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaccinNom}>{rdv.vaccin}</Text>
                <Text style={styles.enfantText}>{rdv.enfant_nom || rdv.enfant}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={12} color={s.color} />
                <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <InfoRow icon="calendar-outline"  label="Date"   value={formatDate(rdv.date)} />
            <InfoRow icon="time-outline"      label="Heure"  value={rdv.heure || '—'} />
            <InfoRow icon="location-outline"  label="Centre" value={rdv.centre || '—'} />
            {rdv.motif && <InfoRow icon="document-text-outline" label="Motif d'annulation" value={rdv.motif} />}

            {rdv.statut === 'A_VENIR' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={cancelling}
              >
                <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                <Text style={styles.cancelBtnText}>{cancelling ? 'Annulation…' : 'Annuler ce rendez-vous'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.notFound}>Rendez-vous introuvable.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={Colors.primary} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Spacing['3xl'], backgroundColor: Colors.surface, ...Elevation.sm },
  backBtn: { padding: 4, marginRight: Spacing.sm },
  headerTitle: { flex: 1, ...Typography.subtitle },
  scroll: { padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, ...Elevation.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, marginBottom: Spacing.md },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  vaccinNom: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  enfantText: { fontSize: 13, color: Colors.textSecondary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radii.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.xl, padding: Spacing.base, borderRadius: Radii.sm, backgroundColor: Colors.danger + '15', borderWidth: 1.5, borderColor: Colors.danger + '40' },
  cancelBtnText: { color: Colors.danger, fontSize: 14, fontWeight: '700' },
  notFound: { textAlign: 'center', marginTop: Spacing['3xl'], color: Colors.textSecondary },
});
