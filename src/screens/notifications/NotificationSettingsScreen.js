import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { notificationService } from '../../services';

const DEFAULT_PREFS = {
  rdvRappel:     true,
  rdvConfirmation: true,
  vaccinsRetard: true,
  actualites:    false,
};

export default function NotificationSettingsScreen({ navigation }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notificationService.getPreferences()
      .then((data) => { if (data) setPrefs({ ...DEFAULT_PREFS, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try { await notificationService.updatePreferences(updated); } catch (e) {}
    finally { setSaving(false); }
  };

  const ITEMS = [
    { key: 'rdvRappel',      icon: 'alarm-outline',         label: 'Rappels de rendez-vous',   desc: 'Notification 24h avant chaque RDV' },
    { key: 'rdvConfirmation',icon: 'checkmark-circle-outline', label: 'Confirmations de RDV',  desc: 'Après confirmation d\'un rendez-vous' },
    { key: 'vaccinsRetard',  icon: 'alert-circle-outline',  label: 'Vaccins en retard',         desc: 'Alerte si un vaccin est en retard' },
    { key: 'actualites',     icon: 'newspaper-outline',     label: 'Actualités & conseils',     desc: 'Informations du centre de vaccination' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {saving
          ? <ActivityIndicator size="small" color={Colors.primary} style={{ width: 30 }} />
          : <View style={{ width: 30 }} />
        }
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing['3xl'] }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionLabel}>Préférences de notification</Text>
          <View style={styles.card}>
            {ITEMS.map((item, index) => (
              <View key={item.key} style={[styles.row, index < ITEMS.length - 1 && styles.rowBorder]}>
                <View style={[styles.iconCircle, { backgroundColor: prefs[item.key] ? Colors.primary + '20' : Colors.surfaceMuted }]}>
                  <Ionicons name={item.icon} size={18} color={prefs[item.key] ? Colors.primary : Colors.textLight} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={prefs[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                  thumbColor={prefs[item.key] ? Colors.primary : Colors.textLight}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Spacing['3xl'], backgroundColor: Colors.surface, ...Elevation.sm },
  backBtn: { padding: 4, marginRight: Spacing.sm },
  headerTitle: { flex: 1, ...Typography.subtitle },
  scroll: { padding: Spacing.lg },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radii.lg, ...Elevation.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
