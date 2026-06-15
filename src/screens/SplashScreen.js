import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>VacciTrack</Text>
      <Text style={styles.sub}>Suivi vaccinal pédiatrique</Text>
      <ActivityIndicator size="small" color={Colors.white} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary },
  logo: { fontSize: 36, fontWeight: 'bold', color: Colors.white },
  sub: { fontSize: 16, color: Colors.white, opacity: 0.8, marginTop: 8 }
});