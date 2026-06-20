import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { rdvService } from '../../services';

function statusMeta(status) {
  switch (status) {
    case 'EN_ATTENTE':       return { color: Colors.primary,  bg: Colors.primaryTint, icon: 'time-outline',      label: 'En attente',   gradient: Gradients.brand };
    case 'EN_LISTE_ATTENTE': return { color: Colors.accent,   bg: Colors.accentLight, icon: 'hourglass-outline', label: 'Liste d\'attente', gradient: Gradients.brand };
    case 'CONFIRME':         return { color: Colors.info,     bg: Colors.infoBg,      icon: 'checkmark-circle',  label: 'Confirmé',     gradient: Gradients.brand };
    case 'PRESENT':          return { color: Colors.success,  bg: Colors.successBg,   icon: 'checkmark-circle',  label: 'Effectué',     gradient: Gradients.success };
    case 'ABSENT':           return { color: Colors.danger,   bg: Colors.dangerBg,    icon: 'close-circle',      label: 'Absent',       gradient: Gradients.danger };
    case 'ANNULE':           return { color: Colors.danger,   bg: Colors.dangerBg,    icon: 'close-circle',      label: 'Annulé',       gradient: Gradients.danger };
    default:                 return { color: Colors.textSecondary, bg: Colors.surfaceMuted, icon: 'ellipse-outline', label: status || '—', gradient: Gradients.brand };
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function RdvDetailScreen({ route, navigation }) {
  const { rdvId, rdv: rdvParam } = route.params;
  const [rdv,        setRdv]        = useState(rdvParam || null);
  const [loading,    setLoading]    = useState(!rdvParam);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (rdvParam) return;
    rdvService.getRdv(rdvId)
      .then((data) => { if (data) setRdv(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rdvId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      navigation.getParent()?.setParams({ rdvListRefresh: Date.now() });
    });
    return unsubscribe;
  }, [navigation]);

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
      <LinearGradient colors={Gradients.brandWide} style={styles.loader}>
        <ActivityIndicator color={Colors.white} size="large" />
      </LinearGradient>
    );
  }

  const s = statusMeta(rdv?.statut);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={s.gradient} style={styles.header}>
        <View style={styles.decCircle} />
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Détail RDV</Text>
          <View style={{ width: 38 }} />
        </View>

        {rdv && (
          <View style={styles.heroSection}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="medkit" size={34} color={Colors.white} />
            </View>
            <Text style={styles.heroVaccin}>{rdv.vaccin_nom || '—'}</Text>
            <Text style={styles.heroEnfant}>Pour {rdv.bebe_prenom || rdv.bebe_nom || '—'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.20)', borderColor: 'rgba(255,255,255,0.30)' }]}>
              <Ionicons name={s.icon} size={14} color={Colors.white} />
              <Text style={styles.statusText}>{s.label}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {rdv ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations</Text>
            <InfoRow icon="calendar-outline"  label="Date"          value={formatDate(rdv.date_session)} />
            <InfoRow icon="time-outline"      label="Heure"         value={rdv.heure_debut || '—'} />
            <InfoRow icon="location-outline"  label="Centre"        value={rdv.centre_nom || '—'} />
            {rdv.bebe_numero_centre != null && (
              <InfoRow icon="card-outline"    label="N° au centre"  value={String(rdv.bebe_numero_centre)} />
            )}
            {rdv.motif && (
              <InfoRow icon="document-text-outline" label="Motif d'annulation" value={rdv.motif} danger />
            )}
          </View>

          {['EN_ATTENTE', 'CONFIRME', 'EN_LISTE_ATTENTE'].includes(rdv.statut) && (
            <TouchableOpacity
              style={styles.cancelCard}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.85}
            >
              <View style={styles.cancelIconWrap}>
                <Ionicons name="close-circle-outline" size={24} color={Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelTitle}>{cancelling ? 'Annulation en cours…' : 'Annuler ce rendez-vous'}</Text>
                <Text style={styles.cancelSub}>Cette action ne peut pas être annulée.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <View style={styles.notFoundWrap}>
          <Ionicons name="search-outline" size={48} color={Colors.textLight} />
          <Text style={styles.notFoundText}>Rendez-vous introuvable.</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value, danger = false }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: danger ? Colors.dangerBg : Colors.primaryTint }]}>
        <Ionicons name={icon} size={16} color={danger ? Colors.danger : Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, danger && { color: Colors.danger }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { paddingBottom: Spacing['2xl'], position: 'relative', overflow: 'hidden' },
  decCircle:   { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.glass, top: -60, right: -40 },

  navRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing['3xl'], paddingBottom: Spacing.lg },
  navBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTitle:    { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.white },

  heroSection: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  heroIconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroVaccin:  { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.2, textAlign: 'center' },
  heroEnfant:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radii.pill, borderWidth: 1.5, marginTop: 4 },
  statusText:  { fontSize: 13, fontWeight: '700', color: Colors.white },

  scroll:      { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['4xl'] },

  card:        { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  cardTitle:   { fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.md },

  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:    { width: 34, height: 34, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  infoLabel:   { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoValue:   { fontSize: 15, fontWeight: '700', color: Colors.text },

  cancelCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.dangerBg, borderRadius: Radii['2xl'], padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.danger + '40' },
  cancelIconWrap:{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.danger + '18', alignItems: 'center', justifyContent: 'center' },
  cancelTitle: { fontSize: 15, fontWeight: '700', color: Colors.danger, marginBottom: 3 },
  cancelSub:   { fontSize: 12, color: Colors.danger + 'AA' },

  notFoundWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundText:{ fontSize: 16, color: Colors.textSecondary },
});
