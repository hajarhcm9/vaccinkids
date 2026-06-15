import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function AppButton({ title, onPress, color = Colors.primary, disabled = false }) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: disabled ? Colors.textLight : color }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  text: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});