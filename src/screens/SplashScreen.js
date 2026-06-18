import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Spacing } from '../constants/theme';

export default function SplashScreen() {
  return (
    <LinearGradient colors={Gradients.brandWide} style={styles.container}>
      <View style={styles.decCircle1} />
      <View style={styles.decCircle2} />
      <View style={styles.iconRing}>
        <View style={styles.iconInner}>
          <Ionicons name="shield-checkmark" size={44} color={Colors.white} />
        </View>
      </View>
      <Text style={styles.logo}>VacciKids</Text>
      <Text style={styles.subtitle}>Suivi vaccinal pédiatrique</Text>
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  decCircle1:  { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -80 },
  decCircle2:  { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -60, left: -40 },
  iconRing:    { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  iconInner:   { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  logo:        { fontSize: 38, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: 6 },
  subtitle:    { fontSize: 14, color: 'rgba(255,255,255,0.70)', letterSpacing: 0.3 },
  spinnerWrap: { marginTop: Spacing['4xl'] },
});