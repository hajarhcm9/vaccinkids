import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Spacing, Typography } from '../constants/theme';

export default function SplashScreen() {
  return (
    <LinearGradient colors={Gradients.sunshine} style={styles.container}>
      <View style={styles.logoBadge}>
        <Ionicons name="medkit" size={48} color={Colors.surface} />
      </View>
      <Text style={styles.logo}>VacciKids</Text>
      <Text style={styles.subtitle}>Suivi vaccinal pédiatrique</Text>

      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="small" color={Colors.surface} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoBadge: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logo: { ...Typography.display, color: Colors.surface, fontSize: 36, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  spinnerWrap: { marginTop: Spacing['4xl'] },
});