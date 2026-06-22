import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';
import { AuthContext } from '../../context/AuthContext';

// ── Centre picker ─────────────────────────────────────────────────────────────

function CentrePicker({ centres, loading, selCentre, onSelect }) {
  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />;
  if (centres.length === 0) return <Text style={styles.centreEmpty}>Aucun centre disponible.</Text>;

  if (centres.length === 1) {
    const c = centres[0];
    return (
      <View style={styles.centreAutoRow}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.centreAutoName}>{c.nom}</Text>
          {c.adresse ? <Text style={styles.centreAddr}>{c.adresse}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centreList}>
      {centres.map((c) => {
        const active = selCentre?.id === c.id;
        return (
          <TouchableOpacity
            key={String(c.id)}
            style={[styles.centreRow, active && styles.centreRowActive]}
            onPress={() => onSelect(c)}
            activeOpacity={0.75}
          >
            <View style={[styles.centreRadio, active && styles.centreRadioActive]}>
              {active && <View style={styles.centreRadioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.centreName, active && { color: Colors.primary }]}>{c.nom}</Text>
              {c.adresse ? <Text style={styles.centreAddr}>{c.adresse}</Text> : null}
            </View>
            {active && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <View style={styles.errRow}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.danger} />
          <Text style={styles.errText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [nom,       setNom]       = useState('');
  const [prenom,    setPrenom]    = useState('');
  const [cin,       setCin]       = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [email,     setEmail]     = useState('');

  const [centres,      setCentres]      = useState([]);
  const [loadingCent,  setLoadingCent]  = useState(true);
  const [selCentre,    setSelCentre]    = useState(null);

  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [serverErr, setServerErr] = useState(null);

  useEffect(() => {
    authService.listPublicCentres()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCentres(list);
        if (list.length === 1) setSelCentre(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingCent(false));
  }, []);

  const validate = () => {
    const e = {};
    if (!nom.trim() || nom.trim().length < 2)       e.nom       = 'Nom trop court (min 2 caractères)';
    if (!prenom.trim() || prenom.trim().length < 2)  e.prenom    = 'Prénom trop court (min 2 caractères)';
    if (!cin.trim() || cin.trim().length < 3)        e.cin       = 'CIN invalide';
    if (!password || password.length < 6)            e.password  = 'Mot de passe trop court (min 6 caractères)';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                                                      e.email     = 'Email invalide';
    if (!selCentre)                                   e.centre    = 'Choisissez votre centre de santé';
    return e;
  };

  const handleRegister = async () => {
    setServerErr(null);
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const resp = await authService.signup({
        cin:          cin.trim().toUpperCase(),
        mot_de_passe: password,
        nom:          nom.trim(),
        prenom:       prenom.trim(),
        email:        email.trim() || undefined,
        centre_id:    selCentre.id,
      });
      const user  = resp?.user;
      const token = resp?.tokens?.accessToken;
      const refresh = resp?.tokens?.refreshToken;
      if (!token) throw new Error('Réponse invalide du serveur');
      await AsyncStorage.setItem('jwtToken', token);
      if (refresh) await AsyncStorage.setItem('refreshToken', refresh);
      await login(token, user, refresh);
    } catch (err) {
      if (err instanceof ApiError && err.isNetwork) {
        setServerErr('Impossible de joindre le serveur. Vérifiez votre connexion Wi-Fi.');
      } else if (err instanceof ApiError) {
        setServerErr(err.message);
      } else {
        setServerErr(err.message || 'Erreur inattendue. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={Gradients.auth} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing['2xl'] },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.headerBlock}>
            <View style={styles.iconRing}>
              <Ionicons name="person-add" size={28} color={Colors.white} />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Remplissez les informations ci-dessous</Text>
          </View>

          {/* ── Card ────────────────────────────────────────────────── */}
          <View style={styles.card}>

            <Field label="Nom *" error={errors.nom}>
              <TextInput
                style={[styles.input, errors.nom && styles.inputError]}
                placeholder="Votre nom de famille"
                placeholderTextColor={Colors.textLight}
                value={nom}
                onChangeText={(v) => { setNom(v); setErrors((e) => ({ ...e, nom: null })); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </Field>

            <Field label="Prénom *" error={errors.prenom}>
              <TextInput
                style={[styles.input, errors.prenom && styles.inputError]}
                placeholder="Votre prénom"
                placeholderTextColor={Colors.textLight}
                value={prenom}
                onChangeText={(v) => { setPrenom(v); setErrors((e) => ({ ...e, prenom: null })); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </Field>

            <Field label="CIN *" error={errors.cin}>
              <TextInput
                style={[styles.input, styles.cinInput, errors.cin && styles.inputError]}
                placeholder="Ex : AB123456"
                placeholderTextColor={Colors.textLight}
                value={cin}
                onChangeText={(v) => { setCin(v.toUpperCase()); setErrors((e) => ({ ...e, cin: null })); }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="next"
              />
            </Field>

            <Field label="Mot de passe *" error={errors.password}>
              <View style={[styles.passRow, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passInput}
                  placeholder="Min. 6 caractères"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
                  secureTextEntry={!showPass}
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </Field>

            <Field label="Email (facultatif)" error={errors.email}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </Field>

            {/* ── Centre ────────────────────────────────────────────── */}
            <View style={styles.centreSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical-outline" size={14} color={Colors.primary} />
                <Text style={styles.sectionLabel}>Centre de santé *</Text>
              </View>
              <CentrePicker
                centres={centres}
                loading={loadingCent}
                selCentre={selCentre}
                onSelect={(c) => { setSelCentre(c); setErrors((e) => ({ ...e, centre: null })); }}
              />
              {errors.centre ? (
                <View style={styles.errRow}>
                  <Ionicons name="alert-circle-outline" size={12} color={Colors.danger} />
                  <Text style={styles.errText}>{errors.centre}</Text>
                </View>
              ) : null}
            </View>

            {/* ── Server error ───────────────────────────────────────── */}
            {serverErr ? (
              <View style={styles.serverErrBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                <Text style={styles.serverErrText}>{serverErr}</Text>
              </View>
            ) : null}

            {/* ── Submit ────────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={Gradients.brand} style={styles.submitGrad}>
                {loading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                      <Text style={styles.submitText}>Créer mon compte</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.loginLinkText}>
                Déjà un compte ?{'  '}
                <Text style={styles.loginLinkBold}>Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.primaryDeep },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },

  headerBlock: { alignItems: 'center', marginBottom: Spacing.xl },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.glass, borderWidth: 2, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii['2xl'],
    padding: Spacing.xl,
    ...Elevation.xl,
  },

  fieldWrap: { marginBottom: Spacing.md },
  label:     { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radii.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    fontSize: 15, color: Colors.text,
  },
  cinInput:   { letterSpacing: 2, fontWeight: '700' },
  inputError: { borderColor: Colors.danger },

  passRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: Radii.lg,
    borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden',
  },
  passInput: { flex: 1, paddingHorizontal: Spacing.base, paddingVertical: 13, fontSize: 15, color: Colors.text },
  eyeBtn:    { paddingHorizontal: 14 },

  errRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 5 },
  errText: { flex: 1, fontSize: 12, color: Colors.danger, fontWeight: '500', lineHeight: 17 },

  centreSection: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  sectionLabel:  { fontSize: 13, fontWeight: '700', color: Colors.text },

  centreList:        { gap: Spacing.sm },
  centreRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.background, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border },
  centreRowActive:   { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreRadio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  centreRadioActive: { borderColor: Colors.primary },
  centreRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  centreName:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  centreAddr:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  centreAutoRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.successBg, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.success },
  centreAutoName:    { fontSize: 14, fontWeight: '700', color: Colors.success },
  centreEmpty:       { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginVertical: Spacing.md },

  serverErrBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.dangerBg, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  serverErrText: { flex: 1, fontSize: 13, color: Colors.danger, lineHeight: 18 },

  submitBtn:  { borderRadius: Radii.xl, overflow: 'hidden', marginBottom: Spacing.md },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  loginLink:     { alignItems: 'center', paddingVertical: Spacing.sm },
  loginLinkText: { fontSize: 13, color: Colors.textSecondary },
  loginLinkBold: { color: Colors.primary, fontWeight: '700' },
});
