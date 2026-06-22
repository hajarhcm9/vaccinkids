import React, { useState, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import { Colors, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';
import { AuthContext } from '../../context/AuthContext';

const STAFF_GRADIENT = ['#1a365d', '#2a4a7f', '#2b6cb0'];

export default function StaffLoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const insets    = useSafeAreaInsets();

  const [cin,        setCin]        = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [cinError,   setCinError]   = useState(null);
  const [pwdError,   setPwdError]   = useState(null);
  const [loading,    setLoading]    = useState(false);

  const refPwd = useRef(null);

  const handleLogin = async () => {
    let valid = true;
    if (!cin.trim())      { setCinError('Entrez votre CIN');           valid = false; }
    if (!password.trim()) { setPwdError('Entrez votre mot de passe');  valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      const resp = await authService.loginStaff(cin.trim().toUpperCase(), password);
      const user         = resp?.user;
      const token        = resp?.tokens?.accessToken;
      const refreshToken = resp?.tokens?.refreshToken;
      if (!token) throw new Error('Réponse invalide du serveur');

      await AsyncStorage.setItem('jwtToken', token);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      await login(token, user, refreshToken);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.isAuth)         setPwdError('CIN ou mot de passe incorrect.');
        else if (e.isForbidden) setPwdError('Compte désactivé. Contactez votre administrateur.');
        else if (e.isNetwork) setPwdError('Impossible de joindre le serveur.\nVérifiez votre connexion Wi-Fi.');
        else                  setPwdError(e.message || 'Erreur inattendue. Réessayez.');
      } else {
        setPwdError(e.message || 'Erreur inattendue. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={STAFF_GRADIENT} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl },
          ]}
          keyboardShouldPersistTaps="always"
          bounces={false}
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.iconRing}>
              <Ionicons name="medical" size={34} color={Colors.white} />
            </View>
            <Text style={styles.appName}>Personnel médical</Text>
            <Text style={styles.tagline}>Accès réservé au personnel de santé</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion personnel</Text>

            {/* CIN */}
            <Text style={styles.inputLabel}>Votre CIN</Text>
            <View style={[styles.fieldRow, cinError && styles.fieldRowError]}>
              <View style={styles.fieldIcon}>
                <Ionicons name="card-outline" size={20} color={cinError ? Colors.danger : Colors.primary} />
              </View>
              <TextInput
                style={[styles.fieldInput, { letterSpacing: 2 }]}
                placeholder="Ex : AB123456"
                placeholderTextColor={Colors.textLight}
                value={cin}
                onChangeText={(v) => { setCin(v.toUpperCase()); setCinError(null); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="next"
                onSubmitEditing={() => refPwd.current?.focus()}
                autoFocus
              />
            </View>
            {cinError && <ErrRow msg={cinError} />}

            {/* Mot de passe */}
            <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Mot de passe</Text>
            <View style={[styles.fieldRow, pwdError && styles.fieldRowError]}>
              <View style={styles.fieldIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={pwdError ? Colors.danger : Colors.primary} />
              </View>
              <TextInput
                ref={refPwd}
                style={styles.fieldInput}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={(v) => { setPassword(v); setPwdError(null); }}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPwd((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {pwdError && <ErrRow msg={pwdError} />}

            <AppButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !cin.trim() || !password.trim()}
              icon="arrow-forward"
              iconPosition="right"
              style={{ marginTop: Spacing.lg }}
            />
          </View>

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={15} color="rgba(255,255,255,0.5)" />
            <Text style={styles.noteText}>
              En cas de problème d'accès, contactez votre administrateur système.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ErrRow({ msg }) {
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#1a365d' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl },

  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xl },
  backText: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },

  headerBlock: { alignItems: 'center', marginBottom: Spacing.xl },
  iconRing:    { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  appName:     { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  tagline:     { fontSize: 13, color: 'rgba(255,255,255,0.60)', textAlign: 'center' },

  card:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.xl, ...Elevation.xl, marginBottom: Spacing.lg },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },

  inputLabel:    { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, backgroundColor: Colors.surfaceMuted, overflow: 'hidden' },
  fieldRowError: { borderColor: Colors.danger },
  fieldIcon:     { paddingHorizontal: 14, paddingVertical: 14 },
  fieldInput:    { flex: 1, paddingRight: 14, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: Colors.text },
  eyeBtn:        { paddingHorizontal: 14, paddingVertical: 14 },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 6, marginBottom: 2 },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500', flex: 1, lineHeight: 17 },

  noteBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: Spacing.md },
  noteText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },
});
