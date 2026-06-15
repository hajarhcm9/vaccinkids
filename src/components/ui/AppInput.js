import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export default function AppInput({ placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default' }) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: Colors.white,
    fontSize: 16,
  }
});